import { Spin } from 'antd'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/useAuth'
import AdminLayout from './pages/AdminLayout/AdminLayout'
import LoginPage from './pages/login/LoginPage'
import UserLayout from './pages/UserLayout/UserLayout'

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboard/AdminDashboardPage'))
const AdminRecurringPage = lazy(() => import('./pages/AdminRecurring/AdminRecurringPage'))
const AdminReportsPage = lazy(() => import('./pages/AdminReports/AdminReportsPage'))
const DepartmentsPage = lazy(() => import('./pages/Departments/DepartmentsPage'))
const PositionsPage = lazy(() => import('./pages/Positions/PositionsPage'))
const UsersPage = lazy(() => import('./pages/Users/UsersPage'))
const UserDashboardPage = lazy(() => import('./pages/UserDashboard/UserDashboardPage'))
const UserAssignedTasksPage = lazy(() => import('./pages/UserAssignedTasks/UserAssignedTasksPage'))
const UserCreatedTasksPage = lazy(() => import('./pages/UserCreatedTasks/UserCreatedTasksPage'))
const UserTaskDetailPage = lazy(() => import('./pages/UserTaskDetail/UserTaskDetailPage'))
const UserReportsPage = lazy(() => import('./pages/UserReports/UserReportsPage'))
const UserRecurringPage = lazy(() => import('./pages/UserRecurring/UserRecurringPage'))

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
              <Route path="/app/reports" element={<UserReportsPage />} />
              <Route path="/app/recurring" element={<UserRecurringPage />} />
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
