import { Button, Spin } from 'antd'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/useAuth'
import AdminLayout from './pages/AdminLayout/AdminLayout'
import AdminDashboardPage from './pages/AdminDashboard/AdminDashboardPage'
import DepartmentsPage from './pages/Departments/DepartmentsPage'
import PositionsPage from './pages/Positions/PositionsPage'
import UsersPage from './pages/Users/UsersPage'
import LoginPage from './pages/login/LoginPage'

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
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/departments" element={<DepartmentsPage />} />
        <Route path="/admin/positions" element={<PositionsPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default App
