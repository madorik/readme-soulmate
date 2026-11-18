import { CalendarView } from "@/components/pages/CalendarView";
import { loadCalendar } from "@/lib/pages/calendar";
import { firstParams } from "@/lib/pages/routes";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CalendarView {...await loadCalendar({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
