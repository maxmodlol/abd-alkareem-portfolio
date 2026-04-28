import { HomeJsonLd } from "@/app/json-ld";
import { CockpitHome } from "@/components/cockpit/cockpit-home";

export default function Home() {
  return (
    <>
      <HomeJsonLd />
      <CockpitHome />
    </>
  );
}
