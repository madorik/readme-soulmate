import { HomeView } from "@/components/pages/HomeView";
import { loadHome } from "@/lib/pages/home";
import { firstParams } from "@/lib/pages/routes";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <HomeView {...await loadHome({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
