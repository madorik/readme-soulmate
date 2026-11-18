import { NavProvider, useNav } from "./nav";
import { Answer } from "./screens/Answer";
import { Ask } from "./screens/Ask";
import { Edit } from "./screens/Edit";
import { Gifts } from "./screens/Gifts";
import { Home } from "./screens/Home";
import { Legal } from "./screens/Legal";
import { NewPerson } from "./screens/NewPerson";
import { People } from "./screens/People";
import { Person } from "./screens/Person";
import { Settings } from "./screens/Settings";
import { Voice } from "./screens/Voice";

function Screen() {
  const { route } = useNav();
  switch (route.name) {
    case "home":
      return <Home />;
    case "people":
      return <People />;
    case "settings":
      return <Settings />;
    case "person":
      return <Person key={route.id} id={route.id} />;
    case "edit":
      return <Edit key={`${route.id}-${route.section}`} id={route.id} section={route.section} />;
    case "newPerson":
      return <NewPerson />;
    case "voice":
      return <Voice about={route.about} />;
    case "gifts":
      return <Gifts key={route.id} id={route.id} />;
    case "ask":
      return <Ask key={route.id} id={route.id} />;
    case "answer":
      return <Answer key={route.token} token={route.token} />;
    case "legal":
      return <Legal key={route.doc} doc={route.doc} />;
  }
}

export function App() {
  return (
    <NavProvider>
      <Screen />
    </NavProvider>
  );
}
