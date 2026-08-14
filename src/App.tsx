import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { TodayPage } from "./pages/TodayPage";
import { PeoplePage } from "./pages/PeoplePage";
import { PersonPage } from "./pages/PersonPage";
import { CirclesPage } from "./pages/CirclesPage";
import { CalendarPage } from "./pages/CalendarPage";
import { TimelinePage } from "./pages/TimelinePage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="people/:id" element={<PersonPage />} />
        <Route path="circles" element={<CirclesPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
