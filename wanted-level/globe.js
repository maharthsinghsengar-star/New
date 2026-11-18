// Flight map: satellite globe with country borders, highlighted origin/destination, an animated route arc and a plane.
import { THREE, renderer, RW, RH, V3, clamp, smooth, lerp, TAU, canvasTex, glowTex } from './core.js';
import { makeAircraft } from './vehicles.js';

export const GSCENE = new THREE.Scene(), gcam = new THREE.PerspectiveCamera(40, RW / RH, 1, 5000);
const R = 100;
const geo = await (await fetch('data/countries.geojson')).json();
const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data/earth.jpg'; });
const TW = 4096, TH = 2048;
const ll2xy = ([lon, lat]) => [(lon + 180) / 360 * TW, (90 - lat) / 180 * TH];
function trace(x, coords) { for (const ring of coords) { ring.forEach((p, i) => { const [a, b] = ll2xy(p); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath(); } }
const polys = f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
// base: brightened satellite image + borders
const base = canvasTex(TW, TH, (x) => { x.filter = 'saturate(1.35) brightness(1.18) contrast(1.05)'; x.drawImage(img, 0, 0, TW, TH); x.filter = 'none';
  x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.3; x.lineJoin = 'round'; for (const f of geo.features) for (const p of polys(f)) { x.beginPath(); trace(x, p); x.stroke(); } }, true, false);
base.anisotropy = 8;
const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), new THREE.MeshStandardMaterial({ map: base, roughness: 0.85, metalness: 0 }));
GSCENE.add(earth);
// highlight layer (redrawn per flight)
const hc = document.createElement('canvas'); hc.width = 4096; hc.height = 2048; const htex = new THREE.CanvasTexture(hc); htex.colorSpace = THREE.SRGBColorSpace;
const hl = new THREE.Mesh(new THREE.SphereGeometry(R * 1.002, 128, 64), new THREE.MeshBasicMaterial({ map: htex, transparent: true, depthWrite: false })); GSCENE.add(hl);
const NAMES = { usa: 'United States of America', mex: 'Mexico', esp: 'Spain', fra: 'France', uk: 'United Kingdom', ger: 'Germany', uae: 'United Arab Emirates', ind: 'India', chn: 'China', jpn: 'Japan', end: 'United States of America' };
function highlight(a, b) { const x = hc.getContext('2d'); x.clearRect(0, 0, 4096, 2048); x.save(); x.scale(0.5, 0.5);
  for (const [id, fill, stroke] of [[a, 'rgba(255,70,60,.45)', '#ff5a4f'], [b, 'rgba(255,214,40,.55)', '#ffd23f']]) { const f = geo.features.find(f => f.properties.n === NAMES[id]); if (!f) continue; x.fillStyle = fill; x.strokeStyle = stroke; x.lineWidth = 6; for (const p of polys(f)) { x.beginPath(); trace(x, p); x.fill(); x.stroke(); } }
  x.restore(); htex.needsUpdate = true; }
// atmosphere + stars
const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 32), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'varying vec3 n; varying vec3 v; void main(){ float k = pow(1.0 - abs(dot(n, v)), 2.2); gl_FragColor = vec4(vec3(0.35,0.7,1.0) * k * 1.6, k); }' }));
GSCENE.add(atm);
{ const p = []; for (let i = 0; i < 2500; i++) { const v = V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(2500); p.push(v.x, v.y, v.z); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); GSCENE.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false }))); }
GSCENE.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.6)); const gs = new THREE.DirectionalLight(0xffffff, 2.2); gs.position.set(300, 200, 400); GSCENE.add(gs);
GSCENE.background = new THREE.Color('#020611');
// lon/lat -> 3D (texture u = (lon+180)/360 on three's sphere: u=0 at -x axis)
export const ll3 = ([lon, lat], r = R) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return V3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo)); };
export function dist([lo1, la1], [lo2, la2]) { const r = Math.PI / 180, a = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(a)); }
// route
const routeMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false });
let route = null, routeKey = '', arcPts = [];
const pins = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 10), new THREE.MeshBasicMaterial({ color: i ? 0xffd23f : 0xff5a4f, toneMapped: false })); GSCENE.add(m); const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: i ? 0xffd23f : 0xff5a4f, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); g.scale.setScalar(7); m.add(g); return m; });
const plane = makeAircraft('twinprop').g; plane.scale.setScalar(0.22); GSCENE.add(plane);
function slerpLL(a, b, u) { const A = ll3(a, 1).normalize(), B = ll3(b, 1).normalize(); const om = Math.acos(clamp(A.dot(B), -1, 1)); if (om < 1e-4) return A; return A.clone().multiplyScalar(Math.sin((1 - u) * om) / Math.sin(om)).add(B.clone().multiplyScalar(Math.sin(u * om) / Math.sin(om))); }
function setRoute(a, b, key, idA, idB) {
  if (routeKey === key) return; routeKey = key; if (route) { GSCENE.remove(route); route.geometry.dispose(); }
  arcPts = []; const N = 200, d = dist(a, b); for (let i = 0; i <= N; i++) { const u = i / N; arcPts.push(slerpLL(a, b, u).multiplyScalar(R * (1.004 + 0.12 * Math.sin(u * Math.PI) * clamp(d / 9000, 0.25, 1)))); }
  const curve = new THREE.CatmullRomCurve3(arcPts); route = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.45, 8), routeMat); GSCENE.add(route);
  pins[0].position.copy(ll3(a, R * 1.003)); pins[1].position.copy(ll3(b, R * 1.003)); highlight(idA, idB);
}
// draw the flight at progress u in [0, 1] (time inside the 6 s map shot)
export function drawMap(a, b, idA, idB, tt, D) {
  setRoute(a, b, idA + idB, idA, idB);
  const u = smooth(clamp((tt - 0.6) / (D - 1.9))), d = dist(a, b);
  const total = route.geometry.index.count; route.geometry.setDrawRange(0, Math.floor(total * u / 6) * 6 + 6);
  const i = Math.min(arcPts.length - 2, Math.floor(u * (arcPts.length - 1))); const p = arcPts[i], q = arcPts[i + 1];
  plane.position.copy(p); plane.up.copy(p).normalize(); plane.lookAt(q.clone().add(q.clone().sub(p).multiplyScalar(5)));
  // camera: start over the origin, pull out to frame both, end over the destination
  const k = clamp(d / 9000, 0.3, 1.25), mid = slerpLL(a, b, 0.5), cu = smooth(clamp((tt - 0.3) / (D - 0.8)));
  const dir = slerpLL(a, b, lerp(0.15, 0.85, cu)).lerp(mid, 0.25 * Math.sin(cu * Math.PI)).normalize();
  const alt = R * (1.75 + 1.6 * k * Math.sin(cu * Math.PI) + 0.35 * (1 - cu));
  gcam.position.copy(dir).multiplyScalar(alt).add(V3(0, R * 0.25, 0).projectOnPlane(dir).multiplyScalar(-0.3));
  gcam.up.set(0, 1, 0); gcam.lookAt(dir.clone().multiplyScalar(R * 0.92)); gcam.updateMatrixWorld();
  pins[1].children[0].material.opacity = 0.6 + 0.4 * Math.sin(tt * 8);
  renderer.render(GSCENE, gcam);
  return { km: Math.round(d * u), d };
}
