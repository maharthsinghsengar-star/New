# CLAUDE.md

AQUORA is a single-page premium e-commerce site (React 19 + Vite 8 + Tailwind CSS v4 + framer-motion + lucide-react).
The owner manages it entirely from an iPhone through Claude Code, so keep changes self-contained and always leave the build green.

## Commands

- `npm run dev` — dev server on port 5173
- `npm run lint` — ESLint (must pass; CI runs it)
- `npm run build` — production build (must pass; CI runs it)

Before committing: run `npm run lint && npm run build`. For visual changes, check both a desktop (1440px) and a phone (iPhone 13) viewport with Playwright.

## Architecture

- **Content is data-driven.** Products, finishes, showcase specs, support copy and nav links live in `src/data/*`. Change copy/prices there, not in components.
- **Sections** (`src/sections/*`) render in the order set in `src/App.jsx`. Section ids used for navigation: `home`, `about`, `shop`, `technology`, `features`. `discover` is the sticky scroll-story section (`Cinematic.jsx`, not in the nav).
- **Intro:** `Preloader` (skipped under reduced motion) calls `completeIntro()`; hero/nav entrance animations wait for `introDone` from `useUI()`. `AmbientLight` is a fixed blue/purple light layer behind everything.
- **State:** `CartProvider` (cart lines `{id, finish, qty}` persisted to localStorage key `aquora.cart.v1`, toast, drawer) and `UIProvider` (shop category filter, quick-view product, info dialog topic, intro state). Access via `useCart()` / `useUI()` from `src/context/contexts.js`.
- **Product visuals** are parametric 3D-style SVGs: `Bottle` (models `pulse | mini | flux | halo`, optional `sleeve`) drawn as a cylinder with elliptical edges, studio reflections and blue (left) / purple (right) rim lights. Props: `live` (pulsing rims, glowing ring, light sweep — use only on large renders), `animated` (LED segments light up), `highlightX` (MotionValue sliding the reflections), `led` (colour override). Accessory renders live in `Accessories.jsx`. `ProductVisual` picks the right one per product, or shows `product.image` if set. Geometry shared with the showcase hotspots lives in `visuals/geometry.js`.
- **Stage** (`ui/Stage.jsx`) is the cinematic studio backdrop; `beams` and `particles` add animated light beams and dust motes.
- **Dialogs** use `components/ui/Modal.jsx` (focus trap, Escape, scroll lock via `useDialog`).

## Conventions

- Use `cn()` from `src/lib/utils.js` to combine classes — it runs tailwind-merge, so a later class overrides an earlier conflicting one (e.g. `hidden` beats a component's `inline-flex`). Register new custom utilities from `index.css` in its `extendTailwindMerge` config.
- Design tokens (colours `ink`, `navy`, `electric`, `plasma`, `ember`; fonts `font-display` / `font-sans` / `font-mono`; fluid type `text-hero`, `text-display`, `text-title`, `text-lead`, `text-label`; animations) are defined in `@theme` in `src/index.css`.
- Custom utilities: `shell`, `glass` (backdrop blur — overlays only), `glass-strong` (panels/dialogs), `glass-card` (no blur — use for cards), `glass-nav`, `gradient-border`, `glow-border` (rotating light border; animates on hover, or always with `glow-live`; visibility via `[--glow-opacity:…]`), `text-gradient(-cool|-silver)`, `text-shimmer`, `text-ghost`, `bg-grid`, `no-scrollbar`, `noise`, `pt-safe` / `pb-safe` (iPhone safe areas).
- iPhone performance: keep `backdrop-filter` off repeated cards, keep `live` bottles to a few on screen, prefer transform/opacity animations, gate hover effects to `pointerType === 'mouse'`.
- Responsive grids must declare a mobile track (`grid grid-cols-1 lg:grid-cols-…`) so wide content (inputs, long words) can't overflow the phone viewport.
- Shared animation easing: `EASE` from `src/lib/motion.js`; scroll-reveal with `components/ui/Reveal.jsx`.
- Files that export React components should export only components (react-refresh lint rule); put constants/helpers in `src/lib` or `src/data`.
- Form fields must stay ≥16px font size (prevents iOS zoom on focus).
- Smooth in-page navigation goes through `scrollToSection(id)` or `<Button to="id">`.
- Keep it accessible: buttons for actions, labelled icon buttons, `aria-*` on toggles, visible focus.
