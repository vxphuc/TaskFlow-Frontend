import { Button, Spin } from 'antd'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/useAuth'
import AdminLayout from './pages/AdminLayout/AdminLayout'
import LoginPage from './pages/login/LoginPage'

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboard/AdminDashboardPage'))
const AdminRecurringPage = lazy(() => import('./pages/AdminRecurring/AdminRecurringPage'))
const AdminReportsPage = lazy(() => import('./pages/AdminReports/AdminReportsPage'))
const DepartmentsPage = lazy(() => import('./pages/Departments/DepartmentsPage'))
const PositionsPage = lazy(() => import('./pages/Positions/PositionsPage'))
const UsersPage = lazy(() => import('./pages/Users/UsersPage'))

function App() {
  const { user, loading, logout } = useAuth()

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

  if (user.role !== 'SYSTEM_ADMIN') {
    return (
      <main className="accessNotice">
        <div>
          <span>TaskFlow</span>
          <h1>Khu vực nhân viên đang được xây dựng</h1>
          <p>Tài khoản của bạn đã đăng nhập thành công.</p>
          <Button type="primary" onClick={logout}>Đăng xuất</Button>
        </div>
      </main>
    )
  }

  return (
    <Suspense fallback={<div className="routeLoading"><Spin /></div>}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/departments" element={<DepartmentsPage />} />
          <Route path="/admin/positions" element={<PositionsPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/recurring" element={<AdminRecurringPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
