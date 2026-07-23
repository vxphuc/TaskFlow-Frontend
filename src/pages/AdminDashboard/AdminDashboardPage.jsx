import { Alert, Button, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { FiArrowRight, FiBriefcase, FiLayers, FiPieChart, FiRepeat, FiUserCheck, FiUsers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { getDepartmentsApi } from '../../api/departmentApi'
import { getPositionsApi } from '../../api/positionApi'
import { getUsersApi } from '../../api/userApi'
import styles from './AdminDashboardPage.module.css'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [departmentsRes, usersRes] = await Promise.all([
          getDepartmentsApi(),
          getUsersApi(),
        ])
        const departments = departmentsRes.data.departments || []
        const positionResponses = await Promise.all(
          departments.map((department) => getPositionsApi(department.id)),
        )
        const positions = positionResponses.flatMap((response) => response.data.positions || [])
        const users = usersRes.data.users || []
        setData({ departments, positions, users })
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải dữ liệu tổng quan.')
      }
    }
    load()
  }, [])

  const stats = data
    ? [
        { label: 'Phòng ban', value: data.departments.length, note: `${data.departments.filter((item) => item.is_active).length} đang hoạt động`, icon: <FiBriefcase /> },
        { label: 'Nhân sự', value: data.users.filter((item) => item.role === 'USER').length, note: `${data.users.filter((item) => item.role === 'USER' && item.is_active).length} tài khoản hoạt động`, icon: <FiUsers /> },
        { label: 'Cấp bậc', value: data.positions.length, note: 'Thiết lập theo từng phòng ban', icon: <FiLayers /> },
        { label: 'Quản trị viên', value: data.users.filter((item) => item.role === 'SYSTEM_ADMIN').length, note: 'Quản lý toàn hệ thống', icon: <FiUserCheck /> },
      ]
    : []

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>TỔNG QUAN</span>
          <h1>Hoạt động hệ thống</h1>
          <p>Theo dõi nhanh cơ cấu tổ chức và tình trạng tài khoản.</p>
        </div>
        <Button type="primary" icon={<FiUsers />} onClick={() => navigate('/admin/users')}>Thêm nhân sự</Button>
      </header>

      {error && <Alert type="error" showIcon message={error} className={styles.alert} />}
      {!data ? <Skeleton active paragraph={{ rows: 6 }} /> : (
        <>
          <section className={styles.statGrid}>
            {stats.map((stat) => (
              <article className={styles.statCard} key={stat.label}>
                <span className={styles.statIcon}>{stat.icon}</span>
                <div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></div>
              </article>
            ))}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}><div><h2>Quản trị nhanh</h2><p>Các khu vực cấu hình chính của doanh nghiệp.</p></div></div>
            <div className={styles.quickGrid}>
              {[
                { title: 'Cơ cấu phòng ban', text: 'Tạo và quản lý các đơn vị trong doanh nghiệp.', path: '/admin/departments', icon: <FiBriefcase /> },
                { title: 'Hệ thống cấp bậc', text: 'Thiết lập phân cấp linh hoạt cho từng phòng ban.', path: '/admin/positions', icon: <FiLayers /> },
                { title: 'Danh sách nhân sự', text: 'Quản lý tài khoản, vị trí và người phụ trách.', path: '/admin/users', icon: <FiUsers /> },
                { title: 'Báo cáo hiệu suất', text: 'Phân tích công việc theo phòng ban và nhân viên.', path: '/admin/reports', icon: <FiPieChart /> },
                { title: 'Task định kỳ', text: 'Giám sát các mẫu và công việc được sinh theo nhiều chu kỳ.', path: '/admin/recurring', icon: <FiRepeat /> },
              ].map((item) => (
                <button key={item.path} className={styles.quickItem} onClick={() => navigate(item.path)}>
                  <span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.text}</small></div><FiArrowRight />
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
