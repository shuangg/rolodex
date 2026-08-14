import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, CircleDot, Clock3, Sun, Users } from "lucide-react";

const links = [
  { to: "/", label: "Today", icon: Sun, end: true },
  { to: "/people", label: "People", icon: Users, end: false },
  { to: "/circles", label: "Circles", icon: CircleDot, end: false },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, end: false },
  { to: "/timeline", label: "Timeline", icon: Clock3, end: false },
];

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-line bg-card px-4 py-6">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber" />
            <span className="font-serif text-2xl tracking-tight">Rolodex</span>
          </div>
          <p className="mt-1 px-4 text-xs text-muted">Your people, kept close</p>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold ${
                  isActive ? "bg-paper text-ink" : "text-muted hover:bg-paper hover:text-ink"
                }`
              }
            >
              <link.icon size={18} strokeWidth={1.8} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-3 text-xs text-muted">Private · on this machine</p>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
