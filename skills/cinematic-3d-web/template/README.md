# 3D Portfolio

A cinematic, scroll-driven 3D portfolio built with Next.js, React Three Fiber and Framer Motion.
Every section is a small scene that pins while you scroll; the scroll drives the 3D camera, text
reveals and transitions.

| Section | What happens |
|---|---|
| **Hero** | Portrait whose head turns toward the cursor and whose eyes follow it, inside a glowing ring. |
| **About** | A floating 3D laptop opens as you scroll, its screen changes with each line of the bio, cards fly out, embers rise. |
| **Experience** | A glowing timeline draws itself as you scroll, with a card for each role. |
| **Skills** | One orbit per skill category around a glowing core; the camera swings to each ring in turn. |
| **Projects** | Each project's logo ignites, its details land one by one, then it burns out into embers. |
| **Achievements** | A black hole swallows the title, then the camera dives through a tunnel with one gate per result. |
| **Contact** | Cards (email, socials, phone, CV, live local time), a contact form, and a giant name wordmark. |

## Make it yours

Everything personal is in **`src/content.ts`**: names, links, bio, skills, projects, achievements,
CVs and the portrait. Leave a list empty to hide that part of the page.

- Project logos: transparent PNG or SVG files in `public/projects/` (only their shape is used).
- Portrait: a background-removed PNG in `public/`, plus a small "rig" that tells the animation where
  the face is. Open the site with `?rig` in the URL to see and tune it.
- CVs: PDFs in `public/cv/`.
- Accent colour: `node scripts/retheme.mjs . --accent "#3B82F6"` moves every accent shade (glows,
  shadows, shader colours) so the main accent is exactly that colour. Run it again to try another.

## Run it

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (type-checks, prerenders) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

### Contact form

Messages are sent through [Web3Forms](https://web3forms.com) (free). Create an access key for
your email and set it as `NEXT_PUBLIC_WEB3FORMS_KEY` in `.env.local` and in your host's
environment variables (see `.env.example`). Without a key, the form opens the visitor's email app
with the message filled in.

## Deploy

On [Vercel](https://vercel.com/new): import the repository, keep the detected Next.js settings,
deploy. Then set `site.url` in `src/content.ts` to the final address and push again.

## Accessibility and performance

Every scene has a `prefers-reduced-motion` fallback with a static layout. WebGL scenes load in the
browser only and pause when off-screen or when the tab is hidden. The page is prerendered as
static HTML.

## Credits

- Original design and code: [Rayen Chatti](https://github.com/rayenchatti) — see the live
  original at [rayenchatti.vercel.app](https://rayenchatti.vercel.app).
- `ColorBends` background and `Magnet` adapted from [React Bits](https://reactbits.dev)
  (MIT + Commons Clause).
- Floating typography pairing (Unbounded + Space Grotesk) after [dungyov.com](https://dungyov.com).
- Brand icons from [Simple Icons](https://simpleicons.org) (CC0), UI icons from
  [Lucide](https://lucide.dev).
