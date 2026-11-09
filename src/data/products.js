// Product catalogue. To use real photography later, add an `image` field
// (e.g. image: '/products/pulse-midnight.jpg' placed in /public/products)
// and ProductVisual will render the photo instead of the vector render.

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'smart', label: 'Smart Bottles' },
  { id: 'thermal', label: 'Thermal' },
  { id: 'limited', label: 'Limited' },
  { id: 'accessories', label: 'Accessories' },
]

export const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
]

export const PRODUCTS = [
  {
    id: 'pulse',
    name: 'AQUORA Pulse',
    tagline: 'The flagship smart bottle',
    price: 129,
    categories: ['smart'],
    badge: 'Bestseller',
    rating: 4.9,
    reviews: 2184,
    visual: { type: 'bottle', model: 'pulse' },
    finishes: ['midnight', 'arctic', 'ember', 'nebula'],
    capacity: '750 ml · 25 oz',
    description:
      'Pulse measures every sip, learns your rhythm and glows softly when your body needs more. Hydration that runs quietly in the background of your day.',
    highlights: [
      'Tracks every sip to ±1 ml',
      'Glow reminders tuned to your goal',
      'Up to 30 days per charge',
      '24 h cold · 12 h hot',
    ],
  },
  {
    id: 'flux',
    name: 'AQUORA Flux',
    tagline: 'Thermal smart bottle with live display',
    price: 149,
    categories: ['smart', 'thermal'],
    badge: 'New',
    rating: 4.8,
    reviews: 642,
    visual: { type: 'bottle', model: 'flux' },
    finishes: ['midnight', 'titanium', 'ember'],
    capacity: '1 L · 34 oz',
    description:
      'A sapphire-glass OLED shows your water temperature in real time, while triple-wall insulation keeps it exactly how you like it for up to 36 hours.',
    highlights: [
      'Live temperature OLED display',
      'Ice-blue / amber thermal glow',
      '36 h cold · 18 h hot',
      'Up to 21 days per charge',
    ],
  },
  {
    id: 'halo',
    name: 'AQUORA Halo Titanium',
    tagline: 'Numbered edition of 2,000',
    price: 249,
    categories: ['smart', 'thermal', 'limited'],
    badge: 'Limited',
    rating: 5.0,
    reviews: 318,
    visual: { type: 'bottle', model: 'halo' },
    finishes: ['titanium', 'aurora'],
    capacity: '750 ml · 25 oz',
    description:
      'Machined from aerospace-grade titanium and crowned with a sapphire touch ring. 40% lighter than steel, numbered by hand and built to last a lifetime.',
    highlights: [
      'Grade-5 titanium body, 290 g',
      'Sapphire haptic touch ring',
      'Up to 45 days per charge',
      'Laser-engraved edition number',
    ],
  },
  {
    id: 'pulse-mini',
    name: 'AQUORA Pulse Mini',
    tagline: 'All the intelligence, pocket-sized',
    price: 99,
    categories: ['smart'],
    badge: null,
    rating: 4.8,
    reviews: 1027,
    visual: { type: 'bottle', model: 'mini' },
    finishes: ['arctic', 'nebula', 'ember', 'midnight'],
    capacity: '500 ml · 17 oz',
    description:
      'Everything you love about Pulse in a compact form that slips into any bag. Perfect for the commute, the studio and every place in between.',
    highlights: [
      'Full Pulse sensor suite',
      'Fits every cup holder',
      'Up to 25 days per charge',
      '20 h cold · 10 h hot',
    ],
  },
  {
    id: 'smart-cap',
    name: 'Pulse Smart Cap',
    tagline: 'Upgrade or replace your cap',
    price: 59,
    categories: ['accessories'],
    badge: null,
    rating: 4.7,
    reviews: 412,
    visual: { type: 'cap' },
    finishes: ['midnight', 'arctic', 'ember'],
    capacity: 'Fits Pulse & Pulse Mini',
    description:
      'The brain of every Pulse, sold separately. Swap colours, keep a spare at the office or bring an older bottle up to date with the latest sensors.',
    highlights: [
      'Sip sensor + glow ring',
      'Leak-proof silicone seal',
      'Carry loop included',
      'Pairs in seconds',
    ],
  },
  {
    id: 'dock',
    name: 'Wireless Charging Dock',
    tagline: 'Magnetic, effortless, beautiful',
    price: 39,
    categories: ['accessories'],
    badge: null,
    rating: 4.8,
    reviews: 896,
    visual: { type: 'dock' },
    finishes: ['midnight', 'arctic'],
    capacity: 'Works with every AQUORA bottle',
    description:
      'Set your bottle down and it snaps into place with a soft glow. An anodised aluminium puck that looks as good on a desk as it does on a nightstand.',
    highlights: [
      'Magnetic auto-alignment',
      'Full charge in ~2 hours',
      'Soft-glow charge indicator',
      'USB-C cable included',
    ],
  },
  {
    id: 'sleeve',
    name: 'Sport Sleeve',
    tagline: 'Grip, protection & a carry strap',
    price: 29,
    categories: ['accessories'],
    badge: null,
    rating: 4.6,
    reviews: 538,
    visual: { type: 'bottle', model: 'pulse', base: 'titanium', sleeve: true },
    finishes: ['midnight', 'ember', 'nebula'],
    capacity: 'Fits Pulse & Flux',
    description:
      'A textured silicone sleeve that absorbs knocks and adds grip for training, trail runs and long days on the move. Wraps on in seconds.',
    highlights: [
      'Hex-grip silicone texture',
      'Integrated carry strap',
      'Leaves the sensor window clear',
      'Dishwasher safe',
    ],
  },
  {
    id: 'filters',
    name: 'Mineral Filter Pods',
    tagline: '3-pack · 3 months of fresh water',
    price: 24,
    categories: ['accessories'],
    badge: 'Eco',
    rating: 4.7,
    reviews: 1290,
    visual: { type: 'pods' },
    finishes: ['arctic'],
    capacity: 'Each pod filters 150 L',
    description:
      'Activated coconut-carbon pods that reduce chlorine and odours, then add a hint of magnesium for a cleaner, softer taste. Fully compostable housing.',
    highlights: [
      'Reduces chlorine & odours',
      'Adds natural magnesium',
      'Compostable pod housing',
      'Click-in fit, no tools',
    ],
  },
]

export const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]))
