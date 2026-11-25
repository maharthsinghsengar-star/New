s = open('town.html').read()
a = s.index('function makeVoid() {'); s = s[:a] + open('ship_worlds.js').read() + '\n' + s[a:]
a = s.index('// ---------- story scenes ----------'); b = s.index('</script></body>')
s = s[:a] + open('ship_story.js').read() + '\n' + s[b:]
a = s.index('const SEGS = ['); b = s.index("const WEIGHT = {};") + len("const WEIGHT = {};")
s = s[:a] + r"""const SEGS = [
  [0.05, 5.28, 'For generations, people had been living on a giant cruise ship that never stopped sailing.'],
  [5.68, 11.59, 'The captain always told them that the ocean was endless and that other people like them were living on ships too.'],
  [11.98, 14.28, 'Their only source of food was fish.'],
  [14.79, 17.95, 'But one day, a little boy noticed something strange.'],
  [18.32, 23.19, 'There was a secret basement on the ship that only the captain and his family were allowed to enter.'],
  [23.58, 26.97, 'Even he once saw the captain’s family eating fresh fruits!'],
  [27.34, 30.54, 'He immediately told his parents, but they didn’t believe him.'],
  [30.99, 34.87, 'After days of convincing them, they finally agreed to investigate.'],
  [35.34, 39.89, 'One night, they secretly entered the basement and discovered a hidden speedboat!'],
  [40.24, 47.02, 'It turned out the captain had been secretly travelling to an island just a few miles away to collect fresh food for his family.'],
  [47.44, 52.07, 'The boy exposed the secret to everyone, and the captain was caught red-handed.'],
  [52.47, 56.36, 'The furious passengers demanded that he take them to the land immediately.'],
  [56.79, 60.50, 'With no other choice, the captain finally sailed towards the island.'],
  [60.93, 66.83, 'And when the passengers stepped onto land for the first time in generations, they couldn’t believe their eyes!'],
  [67.22, 73.25, 'Everyone decided to settle on land, while the captain and his family chose to live on their beloved cruise ship.'],
];
const KEYWORDS = new Set(['cruise', 'ship', 'sailing.', 'captain', 'endless', 'fish.', 'boy', 'strange.', 'secret', 'basement', 'fresh', 'fruits!', 'believe', 'investigate.', 'speedboat!', 'island', 'food', 'exposed', 'red-handed.', 'furious', 'land', 'immediately.', 'island.', 'eyes!', 'settle', 'ship.']);
const WEIGHT = {};""" + s[b:]
rep = [
 ("    } else if (h === 'mohawk') {",
  "    } else if (h === 'captain') {\n      cyl(0.78, 0.7, 0.42, '#ffffff', { parent: HG, y: 1.4, seg: 32, rough: 0.5 }); cyl(0.9, 0.86, 0.14, '#ffffff', { parent: HG, y: 1.64, seg: 32, rough: 0.5 });\n      cyl(0.72, 0.72, 0.18, '#141a2e', { parent: HG, y: 1.28, seg: 32 }); box(1.0, 0.07, 0.6, '#141a2e', { parent: HG, y: 1.2, z: 0.76, r: 0.02 });\n      box(0.9, 0.06, 0.06, '#e0b030', { parent: HG, y: 1.3, z: 0.73, metal: 0.9 }); cyl(0.17, 0.17, 0.05, '#e0b030', { parent: HG, y: 1.48, z: 0.76, rx: PI / 2, metal: 0.9, rough: 0.25 });\n    } else if (h === 'mohawk') {"),
 ("  if (o.mustache) {", "  if (o.beard) { g.fillStyle = '#e4e6ea'; g.beginPath(); g.moveTo(cx - 0.56 * u, cy - 0.04 * u); g.quadraticCurveTo(cx - 0.58 * u, cy + 0.66 * u, cx, cy + 0.66 * u); g.quadraticCurveTo(cx + 0.58 * u, cy + 0.66 * u, cx + 0.56 * u, cy - 0.04 * u); g.lineTo(cx + 0.42 * u, cy - 0.04 * u); g.quadraticCurveTo(cx + 0.4 * u, my + 0.3 * u, cx, my + 0.32 * u); g.quadraticCurveTo(cx - 0.4 * u, my + 0.3 * u, cx - 0.42 * u, cy - 0.04 * u); g.closePath(); g.fill(); }\n  if (o.mustache) {"),
 ("mustache: o.mustache };", "mustache: o.mustache, beard: o.beard };"),
 ("    else if (det === 'plaid') {",
  "    else if (det === 'sailor') { g.fillStyle = col; for (let y = 60; y < 256; y += 44) g.fillRect(0, y, 256, 16); poly([cx - 70, 0, cx + 70, 0, cx, 70], col, g); poly([cx - 46, 0, cx + 46, 0, cx, 46], '#ffffff', g); poly([cx - 14, 60, cx + 14, 60, cx, 92], '#e63946', g); }\n    else if (det === 'captain') { poly([cx - 14, 0, cx + 14, 0, cx + 20, 150, cx, 176, cx - 20, 150], '#1d3557', g); for (const y of [40, 95, 150, 205]) { g.fillStyle = '#e0b030'; g.beginPath(); g.arc(cx + 42, y, 8, 0, PI * 2); g.fill(); } g.fillStyle = '#e0b030'; g.fillRect(30, 46, 52, 12); g.fillStyle = '#1d3557'; g.fillRect(36, 49, 40, 6); }\n    else if (det === 'plaid') {"),
 ("    this.legL.rotation.x = la; this.legR.rotation.x = -la;", "    this.legL.rotation.x = la; this.legR.rotation.x = -la;\n    if (p.sit) { this.legL.rotation.x = this.legR.rotation.x = -PI / 2 + 0.05; }"),
]
for x, y in rep:
    assert s.count(x) == 1, (s.count(x), x[:70]); s = s.replace(x, y)
open('ship.html', 'w').write(s)
print('ok')
