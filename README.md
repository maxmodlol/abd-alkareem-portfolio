# Abd Alkareem Abu-Alsoud, portfolio

A portfolio you explore instead of scroll: a small floating island city where every building is one of my products and every road is an API. Drag to turn the island, click a building to fly in. On phones the island fills the screen and the projects are a swipeable card deck.

## Stack

- [Next.js](https://nextjs.org/) (App Router), React 19, TypeScript
- [three.js](https://threejs.org/) for the 3D scene
- Plain CSS, with Gabarito, Hanken Grotesk and Fragment Mono through `next/font`
- Deployed on [Vercel](https://vercel.com/)

## Where things live

- `lib/projects.ts`: the five products (VillageWellth, Sahefa, DIWAN, Oliva, Watan). The `id` of each project is also the key of its building in the scene.
- `lib/content.ts`: experience, skills and contact links.
- `components/city/city-scene.ts`: the three.js scene, camera rig and input.
- `components/city/city-app.tsx`: the panel, tabs, phone deck and state.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run build` for a production build.

Set `NEXT_PUBLIC_SITE_URL` in Vercel for correct Open Graph, sitemap and canonical URLs.
