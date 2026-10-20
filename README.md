# Abd Alkareem Abu-Alsoud, portfolio

A portfolio you explore instead of scroll: a small tropical island city where every building is one of my products and every road is an API. Drag to turn the island, click a building to fly in. On phones the island fills the screen and the projects are a swipeable card deck.

## Stack

- [Next.js](https://nextjs.org/) (App Router), React 19, TypeScript
- [three.js](https://threejs.org/) for the 3D scene
- Plain CSS, with Gabarito, Hanken Grotesk and Fragment Mono through `next/font`
- Deployed on [Vercel](https://vercel.com/)

## Where things live

- `lib/projects.ts`: the five products (VillageWellth, Sahefa, DIWAN, Oliva, Watan). The `id` of each project is also the key of its building in the scene.
- `lib/content.ts`: experience, skills and contact links.
- `components/city/city-scene.ts`: the three.js scene, camera rig and input. It loads as its own chunk after the page has painted.
- `components/city/city-app.tsx`: the panel, tabs, phone deck and state.
- `components/city/hero.ts`: the jointed hero character and his blended animations (idle, walk, run, jump, glide, roll, wave, dance, tumble).
- `components/city/explorer.ts`: the guided tour route and the game's movement: double jump, glide, dash, bounce pads, roofs and traffic.
- `components/city/particles.ts` and `components/city/sfx.ts`: game feel, with pooled particles and synthesised sound (no audio files).
- `components/city/nature.ts`: wind on the trees, palms, grass, wildflowers and butterflies.
- `components/city/coast.ts`: the island's shape, beaches, piers, islets and the downtown towers. The shoreline is one formula shared with the sea shader, so the foam always sits on the sand.
- `components/city/textures.ts`: grass, asphalt and paving maps generated from noise at start-up (half size on phones), so there are no image files to download.

## Game controls

WASD or arrows to move, Shift to run, Space to jump (press again in the air to flip, hold to glide), Q to dash, 1 to wave, 2 to dance, E to enter a building, drag to look around. On phones: the stick, Jump (hold to glide) and Dash.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run build` for a production build.

Set `NEXT_PUBLIC_SITE_URL` in Vercel for correct Open Graph, sitemap and canonical URLs.
