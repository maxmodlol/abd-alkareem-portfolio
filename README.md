# Abd Alkareem Abu-Alsoud, portfolio

A portfolio you explore instead of scroll: a small city at the blue hour where every building is one of my products and every road is an API. The page opens on a still of the city with the full portfolio one click away; **Enter the city** builds the live 3D city, where you can drag to look around, click a building to fly in, take the guided tour or play. On phones the city fills the screen and the projects are a swipeable card deck.

## Stack

- [Next.js](https://nextjs.org/) (App Router), React 19, TypeScript
- [three.js](https://threejs.org/) for the 3D scene
- Plain CSS, with Syne, Hanken Grotesk and Fragment Mono through `next/font`
- Deployed on [Vercel](https://vercel.com/)

## Where things live

- `lib/projects.ts`: the eight products (VillageWellth, Sahefa, DIWAN, Oliva, Watan, CareBooks, Arvo, SGSoft). The `id` of each project is also the key of its building in the scene.
- `lib/content.ts`: experience, skills and contact links.
- `components/city/city-scene.ts`: the three.js scene, camera rig and input. It is its own chunk, downloaded when the visitor points at or presses a button that enters the city, and built in small steps that report real progress to the loading screen. Graphics presets (high, balanced, low) set shadows, ambient occlusion, point lights, detail and the pixel-ratio cap; a frame governor then steps down from there while frames run slow. Without a graphics card the city redraws only when it moves.
- `components/city/palette.ts`: the bloom look. One grade turns every material, vertex colour and light in the city into pearl, lilac, coral and mint surfaces, with lights in cosmos pink, jellyfish cyan, lilac and peach.
- `components/city/bloom.tsx`: the moving landing screen: a particle field, letters that rise into place, counters and the colour mixes (click or press M).
- `components/city/merge.ts`: bakes everything that never moves into a few meshes after start-up, which takes the island from about 1,800 draw calls a frame to about 400.
- `public/city-wide.webp`, `public/city-tall.webp`: the picture behind the landing screen and the fallback without WebGL. Re-shoot them when the city's look changes (set `window.__cityCapture = true` before the page loads to get the full look on a machine without a graphics card).
- `components/city/city-app.tsx`: the landing and loading screens, panel, tabs, phone deck, pause and settings menus, tour controls and state.
- `components/city/hud.tsx`: the floating thumbstick, hold buttons and the dialog used by the pause and settings menus.
- `components/city/hero.ts`: the jointed hero character and his blended animations (idle, walk, run, jump, glide, roll, wave, dance, tumble).
- `components/city/explorer.ts`: the guided tour route and the game's movement: double jump, glide, dash, bounce pads, roofs and traffic.
- `components/city/particles.ts` and `components/city/sfx.ts`: game feel, with pooled particles and synthesised sound (no audio files).
- `components/city/nature.ts`: wind on the trees, palms, grass, wildflowers and butterflies.
- `components/city/coast.ts`: the island's shape, beaches, piers, islets and the downtown towers. The shoreline is one formula shared with the sea shader, so the foam always sits on the sand.
- `components/city/textures.ts`: grass, asphalt and paving maps generated from noise at start-up (half size on phones), so there are no image files to download.

## Game controls

WASD or arrows to move (read as physical keys, so they work on any keyboard layout), Shift to run, Space to jump (press again in the air to flip, hold to glide), Q to dash, 1 to wave, 2 to dance, E to enter a building, drag to look around, Esc to pause. On phones: a thumbstick that appears under the left thumb, drag anywhere else to look, Jump (hold to glide), Dash and a pause button. The game pauses itself when the window loses focus or the tab is hidden.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run build` for a production build.

Set `NEXT_PUBLIC_SITE_URL` in Vercel for correct Open Graph, sitemap and canonical URLs.
