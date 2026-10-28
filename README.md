# Abd Alkareem Abu-Alsoud, portfolio

A portfolio told as a short film that plays as you scroll. I walk you down a street in 3D: each of the eight buildings on it is one of my products, designed from what the product does, and I take you inside each one to show it on a big screen. The walk ends at a balustrade over a city at sunset, where I turn round and wave goodbye. All the text is ordinary HTML over the film, so the page reads fine without the 3D. The earlier game version of the portfolio lives on at `/play`.

## Stack

- [Next.js](https://nextjs.org/) (App Router), React 19, TypeScript
- [three.js](https://threejs.org/) for the 3D scene
- Plain CSS, with Hanken Grotesk and Fragment Mono through `next/font`
- Deployed on [Vercel](https://vercel.com/)

## Where things live

- `lib/projects.ts`: the eight products (VillageWellth, Sahefa, DIWAN, Oliva, Watan, CareBooks, Arvo, SGSoft). The `id` of each project is also the key of its building in the scene.
- `lib/content.ts`: experience, skills and contact links.

The home page (`components/cine/`):

- `cine-page.tsx`: the page. One section per beat of the film; scroll position becomes film progress, and a beat is reached when its section is centred. The 3D loads on the first scroll, key, touch or pointer move, behind a poster image (`public/cine-wide.webp`, `public/cine-tall.webp`), so it never slows the first paint.
- `path.ts`: the film itself: keyframes for the camera and for where I stand and what I do (wave, walk, show a screen), cuts to black between buildings, and the light from afternoon to sunset. Everything is a function of the scroll, so scrolling back plays it backwards.
- `character.ts`: me, built from smooth shapes on a small skeleton, with a walk driven by the distance covered so the feet keep pace with the ground.
- `shops.ts`: the eight buildings, their interiors, sliding doors, signs and screens.
- `street.ts`: the street, the plaza, the trees and lanterns, and the city in the valley.
- `scene.ts`: renderer, sky and reflections, post-processing (ambient occlusion on high, bloom, film grade) and a frame governor. Quality presets are picked from the device.
- `facade.ts`, `sky.ts`, `kit.ts`: window shaders for the buildings, the sky, and the helpers that merge geometry and draw canvas textures.

To shoot still frames on a machine without a graphics card, set `window.__cityCapture = true` before the page loads (and `window.__cineQuality = "high"` for the full look).

The game at `/play` (`components/city/`):

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

## Game controls (/play)

WASD or arrows to move (read as physical keys, so they work on any keyboard layout), Shift to run, Space to jump (press again in the air to flip, hold to glide), Q to dash, 1 to wave, 2 to dance, E to enter a building, drag to look around, Esc to pause. On phones: a thumbstick that appears under the left thumb, drag anywhere else to look, Jump (hold to glide), Dash and a pause button. The game pauses itself when the window loses focus or the tab is hidden.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run build` for a production build.

Set `NEXT_PUBLIC_SITE_URL` in Vercel for correct Open Graph, sitemap and canonical URLs.
