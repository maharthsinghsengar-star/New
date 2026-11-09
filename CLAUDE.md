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
- **Sections** (`src/sections/*`) render in the order set in `src/App.jsx`. Section ids used for navigation: `home`, `about`, `shop`, `technology`, `features`.
- **State:** `CartProvider` (cart lines `{id, finish, qty}` persisted to localStorage key `aquora.cart.v1`, toast, drawer) and `UIProvider` (shop category filter, quick-view product, info dialog topic). Access via `useCart()` / `useUI()` from `src/context/contexts.js`.
- **Product visuals** are parametric SVGs: `Bottle` (models `pulse | mini | flux | halo`, optional `sleeve`) and accessory renders in `Accessories.jsx`. `ProductVisual` picks the right one per product, or shows `product.image` if set. Geometry shared with the showcase hotspots lives in `visuals/geometry.js`.
- **Dialogs** use `components/ui/Modal.jsx` (focus trap, Escape, scroll lock via `useDialog`).

## Conventions

- Use `cn()` from `src/lib/utils.js` to combine classes — it runs tailwind-merge, so a later class overrides an earlier conflicting one (e.g. `hidden` beats a component's `inline-flex`). Register new custom utilities from `index.css` in its `extendTailwindMerge` config.
- Design tokens (colours `ink`, `navy`, `electric`, `plasma`, `ember`; fonts `font-display` / `font-sans`; animations) are defined in `@theme` in `src/index.css`. Custom utilities: `shell`, `glass`, `gradient-border`, `text-gradient(-cool|-silver)`, `text-ghost`, `bg-grid`, `no-scrollbar`, `noise`.
- Responsive grids must declare a mobile track (`grid grid-cols-1 lg:grid-cols-…`) so wide content (inputs, long words) can't overflow the phone viewport.
- Shared animation easing: `EASE` from `src/lib/motion.js`; scroll-reveal with `components/ui/Reveal.jsx`.
- Files that export React components should export only components (react-refresh lint rule); put constants/helpers in `src/lib` or `src/data`.
- Form fields must stay ≥16px font size (prevents iOS zoom on focus).
- Smooth in-page navigation goes through `scrollToSection(id)` or `<Button to="id">`.
- Keep it accessible: buttons for actions, labelled icon buttons, `aria-*` on toggles, visible focus.
