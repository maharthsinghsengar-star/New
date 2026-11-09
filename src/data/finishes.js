// Colour finishes shared by every product visual.
// `body` / `cap` are 5-stop horizontal shading ramps (left edge → right edge)
// that make a flat shape read as a lit metal cylinder.

const DARK_CAP = ['#020309', '#0c1124', '#2e3758', '#0e1428', '#020309']
const TITANIUM_CAP = ['#0e1014', '#353941', '#9aa0aa', '#3f444c', '#0e1014']

export const FINISHES = {
  midnight: {
    name: 'Midnight',
    swatch: '#18213f',
    body: ['#020309', '#0b1230', '#3c4a7c', '#111a3f', '#02040b'],
    cap: DARK_CAP,
    spec: 0.5,
    rim: '#3d8bff',
    led: '#4aa8ff',
    ink: '#ffffff',
    inkOpacity: 0.55,
    loop: '#0b0f1e',
  },
  arctic: {
    name: 'Arctic',
    swatch: '#e6ebf3',
    body: ['#6a7286', '#c0c8d7', '#fbfcfe', '#cdd4e1', '#5b6377'],
    cap: DARK_CAP,
    spec: 0.75,
    rim: '#a8c8ff',
    led: '#4aa8ff',
    ink: '#0a1026',
    inkOpacity: 0.6,
    loop: '#0b0f1e',
  },
  ember: {
    name: 'Ember',
    swatch: '#ff7a1a',
    body: ['#1f0801', '#7c2a04', '#ff9a4d', '#a63c07', '#1a0701'],
    cap: DARK_CAP,
    spec: 0.45,
    rim: '#ffb27a',
    led: '#ff9a4d',
    ink: '#ffffff',
    inkOpacity: 0.6,
    loop: '#170a04',
  },
  nebula: {
    name: 'Nebula',
    swatch: '#7c5cff',
    body: ['#07031a', '#2a1673', '#a08aff', '#3b22a0', '#07031a'],
    cap: DARK_CAP,
    spec: 0.5,
    rim: '#c4b5fd',
    led: '#a78bfa',
    ink: '#ffffff',
    inkOpacity: 0.6,
    loop: '#0d0820',
  },
  titanium: {
    name: 'Titanium',
    swatch: '#9097a3',
    body: ['#1c1f25', '#5c626d', '#dcdfe5', '#6f7581', '#1a1c21'],
    cap: TITANIUM_CAP,
    spec: 0.6,
    rim: '#dbe4f0',
    led: '#7cc4ff',
    ink: '#0b0d12',
    inkOpacity: 0.55,
    loop: '#14161b',
  },
  aurora: {
    name: 'Aurora',
    swatch: 'linear-gradient(135deg, #2b7fff, #8b5cf6 55%, #ff7a1a)',
    body: ['#05060c', '#2a2f45', '#c9cfe0', '#3a4058', '#05060c'],
    tint: ['#2b7fff', '#8b5cf6', '#ff7a1a'],
    tintOpacity: 0.6,
    cap: TITANIUM_CAP,
    spec: 0.55,
    rim: '#ffb27a',
    led: '#a78bfa',
    ink: '#ffffff',
    inkOpacity: 0.65,
    loop: '#14161b',
  },
}

export const getFinish = (key) => FINISHES[key] ?? FINISHES.midnight
