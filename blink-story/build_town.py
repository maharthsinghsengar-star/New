s = open('scene_real.html').read()
# insert town worlds, replace story
a = s.index('function makeVoid() {'); s = s[:a] + open('town_worlds.js').read() + '\n' + s[a:]
a = s.index('// ---------- story scenes ----------'); b = s.index('</script></body>')
s = s[:a] + open('town_story.js').read() + '\n' + s[b:]
# captions
a = s.index('const SEGS = ['); b = s.index("const WEIGHT = { '47': 11 };") + len("const WEIGHT = { '47': 11 };")
s = s[:a] + r"""const SEGS = [
  [0.05, 4.72, 'In this town, the mayor ordered everyone to sleep during the day and work at night.'],
  [5.09, 7.61, 'But people started noticing something strange.'],
  [8.01, 12.28, 'Every single day, while they were asleep, one house was getting robbed.'],
  [12.65, 14.50, 'Nobody knew who was responsible.'],
  [15.01, 20.17, 'One afternoon, a boy who couldn’t fall asleep decided to sneak outside and investigate.'],
  [20.57, 23.11, 'And what he discovered was unbelievable.'],
  [23.52, 28.54, 'The mayor himself was secretly breaking into people’s houses and stealing their valuables!'],
  [28.99, 31.55, 'That night, the boy told his father everything,'],
  [31.93, 33.81, 'but his father refused to believe him.'],
  [34.26, 35.85, 'So the boy made a plan.'],
  [36.36, 40.21, 'The next day, they pretended to sleep but secretly watched the mayor.'],
  [40.59, 43.46, 'And just as expected, they caught him red-handed!'],
  [43.84, 47.64, 'They immediately alerted the entire town, and the mayor was arrested.'],
  [48.04, 51.40, 'From that day on, nobody had to sleep during the day again.'],
];
const KEYWORDS = new Set(['mayor', 'sleep', 'night.', 'strange.', 'robbed.', 'Nobody', 'responsible.', 'boy', 'sneak', 'investigate.', 'unbelievable.', 'secretly', 'stealing', 'valuables!', 'father', 'refused', 'plan.', 'pretended', 'watched', 'red-handed!', 'arrested.', 'again.', 'mayor.']);
const WEIGHT = {};""" + s[b:]
rep = [
 ("function look(px, py, pz, tx, ty, tz, roll = 0, fov = 50) {", "let CAMK = 1;\nfunction look(px, py, pz, tx, ty, tz, roll = 0, fov = 50) {\n  px = tx + (px - tx) * CAMK; py = ty + (py - ty) * CAMK; pz = tz + (pz - tz) * CAMK;"),
 # faces
 ("const ex = 0.26 * u, ey = cy - 0.1 * u, bl = clamp(o.blink || 0, 0, 1), fx = o.face || 'smile';",
  "const ex = 0.26 * u, ey = cy - 0.1 * u, fx = o.face || 'smile'; let bl = clamp(o.blink || 0, 0, 1); if (fx === 'sleep') bl = 1; if (fx === 'sneaky') bl = Math.max(bl, 0.45);"),
 ("else if (fx === 'shock' || fx === 'panic') { for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 0.27 * u, ey - 0.25 * u, 0.13 * u, PI * 1.2, PI * 1.8); g.stroke(); } }",
  "else if (fx === 'shock' || fx === 'panic') { for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 0.27 * u, ey - 0.25 * u, 0.13 * u, PI * 1.2, PI * 1.8); g.stroke(); } }\n  else if (fx === 'sneaky' || fx === 'angry') { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 0.4 * u, ey - 0.31 * u); g.lineTo(cx + s * 0.12 * u, ey - 0.19 * u); g.stroke(); } }\n  else if (fx === 'doubt') { g.beginPath(); g.moveTo(cx - 0.4 * u, ey - 0.27 * u); g.lineTo(cx - 0.13 * u, ey - 0.27 * u); g.stroke(); g.beginPath(); g.moveTo(cx + 0.13 * u, ey - 0.2 * u); g.lineTo(cx + 0.4 * u, ey - 0.31 * u); g.stroke(); }"),
 ("  else if (fx === 'stare') { g.beginPath(); g.moveTo(cx - 0.12 * u, my + 0.06 * u); g.lineTo(cx + 0.12 * u, my + 0.06 * u); g.stroke(); }",
  "  else if (fx === 'stare') { g.beginPath(); g.moveTo(cx - 0.12 * u, my + 0.06 * u); g.lineTo(cx + 0.12 * u, my + 0.06 * u); g.stroke(); }\n  else if (fx === 'talk') { const op = 0.04 + 0.1 * Math.abs(Math.sin(t * 13)); g.fillStyle = '#3a0d0d'; g.beginPath(); g.ellipse(cx, my + 0.05 * u, 0.15 * u, op * u, 0, 0, PI * 2); g.fill(); }\n  else if (fx === 'doubt') { g.beginPath(); g.moveTo(cx - 0.17 * u, my + 0.08 * u); g.lineTo(cx + 0.17 * u, my + 0.02 * u); g.stroke(); }\n  else if (fx === 'sneaky') { g.beginPath(); g.moveTo(cx - 0.25 * u, my - 0.02 * u); g.quadraticCurveTo(cx + 0.05 * u, my + 0.16 * u, cx + 0.3 * u, my - 0.1 * u); g.stroke(); }\n  else if (fx === 'sleep') { g.fillStyle = '#3a0d0d'; g.beginPath(); g.ellipse(cx, my + 0.06 * u, 0.06 * u, 0.07 * u, 0, 0, PI * 2); g.fill(); }\n  else if (fx === 'angry') { g.beginPath(); g.arc(cx, my + 0.22 * u, 0.18 * u, PI * 1.2, PI * 1.8); g.stroke(); }"),
 ("  if (fx === 'cry') {\n", "  if (o.mustache) { g.fillStyle = '#4a2c17'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 0.14 * u, my - 0.09 * u, 0.16 * u, 0.065 * u, s * 0.25, 0, PI * 2); g.fill(); g.beginPath(); g.arc(cx + s * 0.31 * u, my - 0.14 * u, 0.055 * u, 0, PI * 2); g.fill(); } }\n  if (fx === 'cry') {\n"),
 ("tape: o.tape, bloodshot: p.bloodshot };", "tape: o.tape, bloodshot: p.bloodshot, mustache: o.mustache };"),
 ("const anim = fo.face === 'cry' || fo.face === 'panic' || fo.sweat;", "const anim = fo.face === 'cry' || fo.face === 'panic' || fo.face === 'talk' || fo.sweat;"),
 ("g.rotation.set(0, p.ry || 0, p.rz || 0);", "g.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);"),
 # hats
 ("    } else if (h === 'mohawk') {",
  "    } else if (h === 'tophat') {\n      cyl(0.95, 0.95, 0.08, '#111111', { parent: HG, y: 1.27, seg: 32, rough: 0.4 });\n      cyl(0.62, 0.62, 1.3, '#151515', { parent: HG, y: 1.95, seg: 32, rough: 0.35 });\n      cyl(0.635, 0.635, 0.24, '#c1121f', { parent: HG, y: 1.45, seg: 32 });\n    } else if (h === 'police') {\n      cyl(0.76, 0.7, 0.5, '#1d3557', { parent: HG, y: 1.42, seg: 32 }); cyl(0.86, 0.86, 0.12, '#1d3557', { parent: HG, y: 1.68, seg: 32 });\n      box(1.0, 0.07, 0.55, '#111111', { parent: HG, y: 1.2, z: 0.75, r: 0.02 }); cyl(0.16, 0.16, 0.05, '#ffd23f', { parent: HG, y: 1.46, z: 0.74, rx: PI / 2, metal: 0.8, rough: 0.3 });\n    } else if (h === 'mohawk') {"),
 # shirt details
 ("    else if (det === 'neon') { g.fillStyle = col; g.fillRect(0, 0.4 * u, 256, 0.12 * u); g.fillRect(0, 1.3 * u, 256, 0.12 * u); }",
  "    else if (det === 'neon') { g.fillStyle = col; g.fillRect(0, 0.4 * u, 256, 0.12 * u); g.fillRect(0, 1.3 * u, 256, 0.12 * u); }\n    else if (det === 'sash') { poly([cx - 18, 0, cx + 18, 0, cx + 6, 70, cx - 6, 70], '#ffffff', g); poly([cx - 8, 6, cx + 8, 6, cx + 10, 80, cx, 96, cx - 10, 80], '#c1121f', g); g.fillStyle = '#c1121f'; g.beginPath(); g.moveTo(20, 0); g.lineTo(70, 0); g.lineTo(236, 256); g.lineTo(186, 256); g.closePath(); g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(150, 150, 26, 0, PI * 2); g.fill(); g.fillStyle = '#e0a800'; g.beginPath(); g.arc(150, 150, 15, 0, PI * 2); g.fill(); for (const y of [120, 170, 220]) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(cx - 40, y, 7, 0, PI * 2); g.fill(); } }\n    else if (det === 'badge') { star(70, 70, 26, 11, '#ffd23f', g); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(150, 50, 70, 6); g.fillRect(36, 50, 70, 6); g.fillStyle = '#ffffff'; g.font = '800 22px IX'; g.fillText('POLICE', 140, 90); for (const y of [40, 110, 180, 240]) { g.fillStyle = '#c9a227'; g.beginPath(); g.arc(cx, y, 6, 0, PI * 2); g.fill(); } }\n    else if (det === 'plaid') { g.fillStyle = col; g.globalAlpha = 0.35; for (let i = 0; i < 256; i += 48) { g.fillRect(i, 0, 14, 256); g.fillRect(0, i, 256, 14); } g.globalAlpha = 1; }"),
 # bedroom night variant
 ("function makeBedroom() {", "function makeBedroom(night) {"),
 ("scene.environment = getRoomEnv(); scene.environmentIntensity = 0.45;", "scene.environment = getRoomEnv(); scene.environmentIntensity = night ? 0.25 : 0.45;"),
 ("lights(scene, { sky: '#ffffff', ground: '#ffd8e8', hemi: 1.1, sun: 2.0, sunPos: [10, 16, 18], shadow: 18 });",
  "lights(scene, night ? { sky: '#c0c8ff', ground: '#806090', hemi: 0.75, sun: 0.6, sunCol: '#aab8ff', sunPos: [10, 16, 18], shadow: 18 } : { sky: '#ffffff', ground: '#ffd8e8', hemi: 1.1, sun: 2.0, sunPos: [10, 16, 18], shadow: 18 });"),
 ("const view = posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#4fa6f0');",
  "const view = night ? ctex(nightViewCanvas()) : posterTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#4fa6f0');"),
 ("const lampL = new THREE.PointLight('#ffd9a8', 40, 18);", "const lampL = new THREE.PointLight('#ffd9a8', night ? 110 : 40, 22);"),
]
for x, y in rep:
    assert s.count(x) == 1, (s.count(x), x[:70]); s = s.replace(x, y)
open('town.html', 'w').write(s)
print('ok')
