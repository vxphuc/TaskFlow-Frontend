import { Spin } from 'antd'
import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/useAuth'
import AdminLayout from './pages/AdminLayout/AdminLayout'
import LoginPage from './pages/login/LoginPage'
import UserLayout from './pages/UserLayout/UserLayout'
import { lazyWithRetry } from './utils/lazyWithRetry'

const AdminDashboardPage = lazyWithRetry(
  () => import('./pages/AdminDashboard/AdminDashboardPage'),
  'admin-dashboard',
)
const AdminRecurringPage = lazyWithRetry(
  () => import('./pages/AdminRecurring/AdminRecurringPage'),
  'admin-recurring',
)
const AdminReportsPage = lazyWithRetry(
  () => import('./pages/AdminReports/AdminReportsPage'),
  'admin-reports',
)
const DepartmentsPage = lazyWithRetry(
  () => import('./pages/Departments/DepartmentsPage'),
  'departments',
)
const PositionsPage = lazyWithRetry(
  () => import('./pages/Positions/PositionsPage'),
  'positions',
)
const UsersPage = lazyWithRetry(
  () => import('./pages/Users/UsersPage'),
  'users',
)
const UserDashboardPage = lazyWithRetry(
  () => import('./pages/UserDashboard/UserDashboardPage'),
  'user-dashboard',
)
const UserAssignedTasksPage = lazyWithRetry(
  () => import('./pages/UserAssignedTasks/UserAssignedTasksPage'),
  'user-assigned-tasks',
)
const UserCreatedTasksPage = lazyWithRetry(
  () => import('./pages/UserCreatedTasks/UserCreatedTasksPage'),
  'user-created-tasks',
)
const UserPersonalTasksPage = lazyWithRetry(
  () => import('./pages/UserPersonalTasks/UserPersonalTasksPage'),
  'user-personal-tasks',
)
const UserGuidePage = lazyWithRetry(
  () => import('./pages/UserGuide/UserGuidePage'),
  'user-guide',
)
const UserTaskDetailPage = lazyWithRetry(
  () => import('./pages/UserTaskDetail/UserTaskDetailPage'),
  'user-task-detail',
)
const UserReportsPage = lazyWithRetry(
  () => import('./pages/UserReports/UserReportsPage'),
  'user-reports',
)
const UserRecurringPage = lazyWithRetry(
  () => import('./pages/UserRecurring/UserRecurringPage'),
  'user-recurring',
)
const UserTeamPage = lazyWithRetry(
  () => import('./pages/UserTeam/UserTeamPage'),
  'user-team',
)
const InitiativesPage = lazyWithRetry(
  () => import('./pages/Initiatives/InitiativesPage'),
  'initiatives',
)

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="appLoading">
        <Spin size="large" />
        <span>Đang tải TaskFlow...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Suspense fallback={<div className="routeLoading"><Spin /></div>}>
      <Routes>
        {user.role === 'SYSTEM_ADMIN' ? (
          <>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/departments" element={<DepartmentsPage />} />
              <Route path="/admin/positions" element={<PositionsPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/recurring" element={<AdminRecurringPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </>
        ) : (
          <>
            <Route element={<UserLayout />}>
              <Route path="/app" element={<UserDashboardPage />} />
              <Route path="/app/assigned" element={<UserAssignedTasksPage />} />
              <Route path="/app/created" element={<UserCreatedTasksPage />} />
              <Route path="/app/personal" element={<UserPersonalTasksPage />} />
              <Route path="/app/team" element={<UserTeamPage />} />
              <Route path="/app/reports" element={<UserReportsPage />} />
              <Route path="/app/recurring" element={<UserRecurringPage />} />
              <Route path="/app/initiatives" element={<InitiativesPage />} />
              <Route path="/app/guide" element={<UserGuidePage />} />
              <Route path="/app/tasks/:taskId" element={<UserTaskDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  )
}

export default App
