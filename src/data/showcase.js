// Content for the interactive product showcase ("Technology" section).
// Hotspot `part` values map to coordinates computed from the bottle geometry.

export const SHOWCASE_MODELS = [
  {
    id: 'pulse',
    productId: 'pulse',
    label: 'Pulse',
    headline: 'Your hydration, perfectly in tune.',
    description:
      'Pulse hides a full sensor suite inside a seamless steel form. It knows when you drink, how much, and exactly when to nudge you — with nothing more than a soft glow.',
    hotspots: [
      {
        part: 'cap',
        title: 'Smart Cap',
        text: 'Houses the processor, Bluetooth 5.3 radio and a silent haptic engine. A single touch logs a refill.',
      },
      {
        part: 'ring',
        title: 'Glow Ring',
        text: 'A 360° light ring that pulses gently when it’s time to drink, paced to your personal goal.',
      },
      {
        part: 'level',
        title: 'Sip Sensor',
        text: 'Capacitive sensing measures every sip to ±1 ml — no buttons, no manual logging, no guesswork.',
      },
      {
        part: 'interior',
        title: 'Ceramic Interior',
        text: 'A medical-grade ceramic coating keeps water tasting pure and clean. Never metallic.',
      },
      {
        part: 'base',
        title: 'Wireless Base',
        text: 'Magnetic wireless charging. One full charge lasts up to 30 days of everyday use.',
      },
    ],
    tech: ['Capacitive sip sensing', 'Haptic reminders', 'Bluetooth 5.3 LE', 'Over-the-air updates', 'Apple Health & Google Fit'],
    specs: [
      { label: 'Capacity', value: '750 ml · 25 oz' },
      { label: 'Dimensions', value: 'Ø 7.4 × 26.8 cm' },
      { label: 'Weight', value: '395 g' },
      { label: 'Materials', value: '18/8 steel, ceramic interior' },
      { label: 'Insulation', value: '24 h cold · 12 h hot' },
      { label: 'Battery', value: 'Up to 30 days' },
      { label: 'Connectivity', value: 'Bluetooth 5.3 LE' },
      { label: 'Charging', value: 'Magnetic wireless dock' },
      { label: 'Water resistance', value: 'IPX7 smart cap' },
      { label: 'Compatibility', value: 'iOS 16+ · Android 10+' },
    ],
  },
  {
    id: 'flux',
    productId: 'flux',
    label: 'Flux',
    headline: 'Every degree, under control.',
    description:
      'Flux pairs a live temperature display with triple-wall vacuum insulation. Glance down and know before you sip — ice-cold after training, perfectly warm on a winter morning.',
    hotspots: [
      {
        part: 'cap',
        title: 'OLED Display',
        text: 'A sapphire-glass OLED shows live water temperature at a glance, dimming automatically at night.',
      },
      {
        part: 'ring',
        title: 'Thermal Glow',
        text: 'Glows ice-blue when chilled and amber when hot, so you always know what you’re about to drink.',
      },
      {
        part: 'level',
        title: 'Thermal Probe',
        text: 'A sealed probe reads temperature to ±0.5 °C every ten seconds without touching your water.',
      },
      {
        part: 'interior',
        title: 'Triple-Wall Vacuum',
        text: 'Up to 36 hours cold and 18 hours hot. No condensation, no sweating, ever.',
      },
      {
        part: 'base',
        title: 'Wireless Base',
        text: 'Drops onto the same magnetic dock as every AQUORA. Up to 21 days per charge.',
      },
    ],
    tech: ['Live temperature OLED', 'Thermal glow states', 'Triple-wall vacuum', 'Bluetooth 5.3 LE', 'Over-the-air updates'],
    specs: [
      { label: 'Capacity', value: '1 L · 34 oz' },
      { label: 'Dimensions', value: 'Ø 8.6 × 28.4 cm' },
      { label: 'Weight', value: '520 g' },
      { label: 'Display', value: '0.9″ OLED, sapphire glass' },
      { label: 'Temp accuracy', value: '±0.5 °C' },
      { label: 'Insulation', value: '36 h cold · 18 h hot' },
      { label: 'Battery', value: 'Up to 21 days' },
      { label: 'Connectivity', value: 'Bluetooth 5.3 LE' },
      { label: 'Charging', value: 'Magnetic wireless dock' },
      { label: 'Compatibility', value: 'iOS 16+ · Android 10+' },
    ],
  },
  {
    id: 'halo',
    productId: 'halo',
    label: 'Halo Ti',
    headline: 'Titanium. Light. Limited.',
    description:
      'Halo is our statement piece: a grade-5 titanium body, a sapphire touch ring and a hand-numbered base. Only 2,000 will ever be made.',
    hotspots: [
      {
        part: 'cap',
        title: 'Sapphire Touch Ring',
        text: 'A scratch-proof sapphire crown with haptic feedback. Tap once to log, hold to see today’s progress.',
      },
      {
        part: 'ring',
        title: 'Halo Light',
        text: 'A diffused light band that breathes with your hydration rhythm through the day.',
      },
      {
        part: 'level',
        title: 'Sip Sensor',
        text: 'The same ±1 ml capacitive sensing as Pulse, re-engineered for titanium.',
      },
      {
        part: 'interior',
        title: 'Grade-5 Titanium',
        text: 'Aerospace-grade titanium: 40% lighter than steel, naturally antibacterial and virtually indestructible.',
      },
      {
        part: 'base',
        title: 'Numbered Base',
        text: 'Every base is laser-engraved with its edition number — one of only 2,000.',
      },
    ],
    tech: ['Sapphire haptic ring', 'Grade-5 titanium', '45-day battery', 'Bluetooth 5.3 LE', '10-year warranty'],
    specs: [
      { label: 'Capacity', value: '750 ml · 25 oz' },
      { label: 'Dimensions', value: 'Ø 7.2 × 27.2 cm' },
      { label: 'Weight', value: '290 g' },
      { label: 'Materials', value: 'Grade-5 titanium, ceramic interior' },
      { label: 'Insulation', value: '24 h cold · 12 h hot' },
      { label: 'Battery', value: 'Up to 45 days' },
      { label: 'Connectivity', value: 'Bluetooth 5.3 LE' },
      { label: 'Edition', value: 'Numbered, 1 of 2,000' },
      { label: 'Warranty', value: '10 years' },
      { label: 'Compatibility', value: 'iOS 16+ · Android 10+' },
    ],
  },
]
