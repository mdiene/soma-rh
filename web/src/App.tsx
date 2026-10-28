import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'

// Chaque écran est chargé à la demande pour alléger le premier affichage.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'))
const EmployeeDetailPage = lazy(() => import('./pages/EmployeeDetailPage'))
const LeavesPage = lazy(() => import('./pages/LeavesPage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const PayrollInputsPage = lazy(() => import('./pages/PayrollInputsPage'))
const PayrollEntriesPage = lazy(() => import('./pages/PayrollEntriesPage'))
const PayrollEntryPage = lazy(() => import('./pages/PayrollEntryPage'))
const SalarySlipPage = lazy(() => import('./pages/SalarySlipPage'))
const PrintSlipsPage = lazy(() => import('./pages/PrintSlipsPage'))
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const MySlipsPage = lazy(() => import('./pages/MySlipsPage'))

export default function App() {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-10"><Spinner /></div>
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }
  return (
    <Suspense fallback={<div className="p-10"><Spinner /></div>}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="salaries" element={<EmployeesPage />} />
        <Route path="salaries/:id" element={<EmployeeDetailPage />} />
        <Route path="conges" element={<LeavesPage />} />
        <Route path="presences" element={<AttendancePage />} />
        <Route path="paie" element={<PayrollEntriesPage />} />
        <Route path="paie/variables" element={<PayrollInputsPage />} />
        <Route path="paie/simulateur" element={<SimulatorPage />} />
        <Route path="paie/:id" element={<PayrollEntryPage />} />
        <Route path="paie/:id/imprimer" element={<PrintSlipsPage />} />
        <Route path="bulletins/:id" element={<SalarySlipPage />} />
        <Route path="etats" element={<ReportsPage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="mes-bulletins" element={<MySlipsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
