import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './state/AppContext'
import { ToastProvider } from './state/Toasts'
import Layout from './components/Layout'
import { SignIn, SignUp } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Timeline from './pages/Timeline'
import { EditRecordPage, NewRecordPage } from './pages/RecordForm'
import RecordDetail from './pages/RecordDetail'
import TaskDetail from './pages/TaskDetail'
import Medications, { MedicationDetail, NewMedicationPage } from './pages/Medications'
import Pets, { NewPet } from './pages/Pets'
import Settings, { NotFound } from './pages/Settings'
import { Loading } from './components/ui'

// The chart library is large, so the weight screen loads on demand
const Weight = lazy(() => import('./pages/Weight'))

function RequireAuth({ children }) {
  const { user } = useApp()
  const location = useLocation()
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
  return children
}

function GuestOnly({ children }) {
  const { user } = useApp()
  return user ? <Navigate to="/" replace /> : children
}

// Move to the top and focus the page on navigation (screen readers, keyboard users)
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <ToastProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/signin" element={<GuestOnly><SignIn /></GuestOnly>} />
            <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="timeline" element={<Timeline />} />
              <Route path="records/new" element={<NewRecordPage />} />
              <Route path="records/:id" element={<RecordDetail />} />
              <Route path="records/:id/edit" element={<EditRecordPage />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="medications" element={<Medications />} />
              <Route path="medications/new" element={<NewMedicationPage />} />
              <Route path="medications/:id" element={<MedicationDetail />} />
              <Route path="weight" element={<Suspense fallback={<Loading label="Loading weights…" />}><Weight /></Suspense>} />
              <Route path="pets" element={<Pets />} />
              <Route path="pets/new" element={<NewPet />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AppProvider>
    </HashRouter>
  )
}
