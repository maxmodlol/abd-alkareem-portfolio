import type { Metadata } from "next";

import { CityApp } from "@/components/city/city-app";

export const metadata: Metadata = {
  title: "The mini game",
  description: "Walk an island where every building is one of Abd Alkareem's products: collect coins, find gems and visit all eight.",
  alternates: { canonical: "/play" },
};

export default function Play() {
  return <CityApp />;
}
