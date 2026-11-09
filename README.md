# AQUORA — Hydration, Reimagined

A premium, futuristic e-commerce website for **AQUORA**, an original smart-hydration brand.
Dark cinematic design with 3D-style product renders, animated electric-blue and purple studio
lighting, glassmorphism surfaces, scroll-driven storytelling and a fully working shopping
experience — designed for iPhone first.

Built with **React 19 · Vite · Tailwind CSS v4 · Framer Motion · Lucide icons**.

---

## What's inside

| Section | Highlights |
| --- | --- |
| **Intro** | Elegant preloader (waits for fonts) that lifts away with a curtain reveal into the hero |
| **Navigation** | Floating glass bar that tucks away while scrolling on iPhone, active-section pill, scroll progress line, animated menu icon, full-screen glass mobile menu with featured product |
| **Hero** | "Hydration, Reimagined." headline reveal, light beams, 3D bottle whose reflections follow the pointer (or gently sway on touch screens), live data chips |
| **Scroll story** | Pinned cinematic section — scrolling moves the bottle through Sense → Read → Glow while the lighting shifts from blue to purple to amber |
| **About** | Brand story, design philosophy pillars, key numbers |
| **Shop** | 8 products, glass filter bar, sorting, interactive 3D-tilt cards with glare, glow borders and colour previews, quick-view sheet, add to cart |
| **Product showcase** | Model switcher (Pulse / Flux / Halo Ti), interactive hotspots, finish picker, technical specifications |
| **Features** | Animated hydration tracking, interactive temperature monitor, materials cross-section, design preview |
| **Footer** | Newsletter with validation, shop/explore/support links, support & legal dialogs, social icons |

**Working features:** shopping cart (saved in the browser between visits), quantity controls,
free-shipping progress, demo checkout with order confirmation, product filtering & sorting,
newsletter validation, smooth scrolling, keyboard-accessible dialogs, and reduced-motion support.

> All product visuals are original 3D-style vector "studio renders" drawn in code
> (`src/components/visuals`), so there are no image files to break or license.
> Animations respect the iPhone "Reduce Motion" setting.

---

## Managing the project from an iPhone

You never need a computer. Open **Claude Code** (claude.ai/code or the Claude app), pick this
repository and just describe what you want, for example:

- "Change the price of AQUORA Pulse to $139"
- "Add a new colour called Forest Green to the Pulse"
- "Make the hero headline say *Drink Smarter.*"
- "Add a product called Travel Case for $35 in Accessories"

Claude edits the files, checks the build and pushes the change. Every push runs the **CI** check
on GitHub, so a green ✓ next to a commit means the site still builds correctly.

### Publishing the site (free, with GitHub Pages)

1. On GitHub, open the repository → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Merge your changes into `main`. The **Deploy to GitHub Pages** workflow publishes the site to
   `https://<your-username>.github.io/<repository-name>/`.

You can also re-publish any time from **Actions → Deploy to GitHub Pages → Run workflow**.

---

## Where things live

```
src/
├── data/              ← edit content here (no layout code)
│   ├── products.js    products, prices, categories, descriptions
│   ├── finishes.js    colour finishes (Midnight, Arctic, Ember…)
│   ├── showcase.js    showcase models, hotspots & specifications
│   ├── support.js     shipping / returns / warranty / FAQ / privacy text
│   └── navigation.js  navbar links
├── sections/          page sections in order: Hero, About, Shop, Showcase, Features, CTA, Footer
├── components/        Navbar, ProductCard, ProductModal, CartDrawer, Newsletter, Toast…
│   ├── ui/            reusable building blocks (Button, Modal, Stage, Swatches…)
│   └── visuals/       the vector bottle & accessory renders
├── context/           cart state (with localStorage) and UI state
├── hooks/  lib/       small helpers
└── index.css          design tokens: colours, fonts, animations
```

### Using real product photos later

Put images in `public/products/` and add an `image` field to a product in
`src/data/products.js`:

```js
image: './products/pulse-midnight.jpg',
```

The site then shows the photo instead of the vector render.

---

## Developer commands

Requires Node.js 20.19+ or 22.12+.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
npm run lint     # check code quality
npm run build    # production build into dist/
npm run preview  # preview the production build
```

---

© AQUORA is a fictional brand created for this project. The checkout is a demonstration:
no payments are taken and no orders are fulfilled.
