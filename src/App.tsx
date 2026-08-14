import { NavLink, Route, Routes } from 'react-router-dom'
import { CalendarDays, History, LayoutDashboard, Users, UsersRound } from 'lucide-react'
import { StoreProvider, ToastContext, useToasts } from './store'
import Today from './pages/Today'
import People from './pages/People'
import PersonDetail from './pages/PersonDetail'
import Circles from './pages/Circles'
import CalendarPage from './pages/CalendarPage'
import TimelinePage from './pages/TimelinePage'

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden>
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <circle cx="12" cy="16" r="6.5" fill="#fff" />
        <path d="M18 9.5a8 8 0 0 0 0 13" stroke="#209dd7" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M21.5 6.5a11.5 11.5 0 0 1 0 19" stroke="#753991" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function Shell() {
  const { toasts, push } = useToasts()
  return (
    <ToastContext.Provider value={{ push }}>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <BrandMark />
            <div>
              <div className="brand-name">Rolodex</div>
              <div className="brand-sub">your people, close</div>
            </div>
          </div>
          <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={17} /> Today
          </NavLink>
          <NavLink to="/people" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Users size={17} /> People
          </NavLink>
          <NavLink to="/circles" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <UsersRound size={17} /> Circles
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <CalendarDays size={17} /> Calendar
          </NavLink>
          <NavLink to="/timeline" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <History size={17} /> Timeline
          </NavLink>
          <div className="sidebar-footer">
            Runs on your machine.
            <br />
            No accounts, no cloud.
          </div>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/people" element={<People />} />
            <Route path="/people/:id" element={<PersonDetail />} />
            <Route path="/circles" element={<Circles />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
          </Routes>
        </main>
        <div className="toast-region">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
