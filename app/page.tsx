import { HomeJsonLd } from "@/app/json-ld";
import { CinePage } from "@/components/cine/cine-page";

export default function Home() {
  return (
    <>
      <HomeJsonLd />
      <CinePage />
    </>
  );
}
