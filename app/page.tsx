import { HomeJsonLd } from "@/app/json-ld";
import { CityApp } from "@/components/city/city-app";

export default function Home() {
  return (
    <>
      <HomeJsonLd />
      <CityApp />
    </>
  );
}
