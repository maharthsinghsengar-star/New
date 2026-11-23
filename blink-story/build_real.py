s=open('scene3d.html').read()
a=s.index('// ---------- worlds ----------'); b=s.index('function makeVoid() {')
s=s[:a]+open('worlds_real.js').read()+'\n'+s[b:]
rep=[
("import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';",
 "import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';\nimport { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';"),
("renderer.toneMapping = THREE.NoToneMapping;","renderer.toneMapping = THREE.NeutralToneMapping;\nrenderer.toneMappingExposure = 0.9;"),
("(o.hemi ?? 2.2) * 1.4);","(o.hemi ?? 2.2) * 1.0);"),
("(o.sun ?? 2.6) * 1.25);","(o.sun ?? 2.6) * 1.1);"),
("const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 600);","const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 4000);"),
("ctx.filter = 'brightness(1.1) saturate(1.25) contrast(1.03)';","ctx.filter = 'brightness(1.04) saturate(1.12) contrast(1.02)';"),
("else girl.pose({ x: 6, y: 3.2, z: -9,","else girl.pose({ x: 6, y: 4.45, z: -10.5,"),
("poofAt(new THREE.Vector3(6, 5.8, -9), cam,","poofAt(new THREE.Vector3(6, 7.2, -10.5), cam,"),
# shared worlds + per-story roots
("const built = {};","const built = {}, worldsC = {};\nconst getWorld = (k, fn) => worldsC[k] ??= fn();\nfunction addRoot(w) { const g = new THREE.Group(); w.scene.add(g); return g; }"),
("S.city = () => {\n  const w = makeCity(false), sc = w.scene;","S.city = () => {\n  const w = getWorld('city', () => makeCity(false)), sc = addRoot(w);"),
("  return { w, update(t, T) {\n    w.update(T);\n    for (const k of walkers)","  return { w, root: sc, update(t, T) {\n    w.update(T);\n    for (const k of walkers)"),
("S.safety = () => {\n  const w = makeCity(false), sc = w.scene;","S.safety = () => {\n  const w = getWorld('city', () => makeCity(false)), sc = addRoot(w);"),
("  return { w, update(t, T) {\n    w.update(T);\n    A.pose(","  return { w, root: sc, update(t, T) {\n    w.update(T);\n    A.pose("),
("S.dare = () => {\n  const w = makeCity(false), sc = w.scene;","S.dare = () => {\n  const w = getWorld('city', () => makeCity(false)), sc = addRoot(w);"),
("return { w, h, n1, n2, update(t, T) {","return { w, h, n1, n2, root: sc, update(t, T) {"),
("S.future = () => {\n  const w = makeCity(true), h = new Avatar(HERO); w.scene.add(h.group);\n  return { w, h, update(t, T) {",
 "S.future = () => {\n  const w = getWorld('fut', () => makeCity(true)), root = addRoot(w), h = new Avatar(HERO); root.add(h.group);\n  return { w, h, root, update(t, T) {"),
("S.stare = () => {\n  const w = makeCity(true), h = new Avatar(HERO); w.scene.add(h.group);\n  const ring = buildRing(w.scene);\n  return { w, h, ring, update(t, T) {",
 "S.stare = () => {\n  const w = getWorld('fut', () => makeCity(true)), root = addRoot(w), h = new Avatar(HERO); root.add(h.group);\n  const ring = buildRing(root);\n  return { w, h, ring, root, update(t, T) {"),
("return { w: st.w, update(t, T) { st.update(39.0 - 35.94, 39.0); }","return { w: st.w, root: st.root, update(t, T) { st.update(39.0 - 35.94, 39.0); }"),
("  const sc = getScene(key, S[key]);\n","  const sc = getScene(key, S[key]);\n  for (const k in built) if (built[k].root) built[k].root.visible = false;\n  if (sc.root) sc.root.visible = true;\n"),
]
for x,y in rep:
    assert s.count(x)==1, x[:60]; s=s.replace(x,y)
open('scene_real.html','w').write(s)
