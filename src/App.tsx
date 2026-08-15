import { NavLink, Route, Routes, Link } from "react-router-dom";
import { Sun, Users, LayoutGrid, CalendarDays, ListTree } from "lucide-react";
import { TodayPage } from "./pages/TodayPage";
import { PeoplePage } from "./pages/PeoplePage";
import { PersonPage } from "./pages/PersonPage";
import { CirclesPage } from "./pages/CirclesPage";
import { CalendarPage } from "./pages/CalendarPage";
import { TimelinePage } from "./pages/TimelinePage";

const NAV = [
  { to: "/", label: "Today", icon: Sun, end: true },
  { to: "/people", label: "People", icon: Users, end: false },
  { to: "/circles", label: "Circles", icon: LayoutGrid, end: false },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, end: false },
  { to: "/timeline", label: "Timeline", icon: ListTree, end: false },
];

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand" style={{ textDecoration: "none" }}>
          <span className="brand-mark">R</span>
          <span>Rolodex</span>
        </Link>
        <nav className="nav" aria-label="Main navigation">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">Your address book. Runs on your machine.</div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/:id" element={<PersonPage />} />
          <Route path="/circles" element={<CirclesPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
        </Routes>
      </main>
    </div>
  );
}
