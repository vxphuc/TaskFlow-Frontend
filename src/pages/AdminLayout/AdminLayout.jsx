import { Avatar, Button, Drawer, Dropdown, Layout, Menu, Tooltip } from 'antd'
import { useMemo, useState } from 'react'
import {
  FiBarChart2,
  FiBriefcase,
  FiChevronDown,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiPieChart,
  FiRepeat,
  FiUsers,
} from 'react-icons/fi'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import styles from './AdminLayout.module.css'

const { Header, Sider, Content } = Layout

const navigation = [
  { key: '/admin', icon: <FiBarChart2 />, label: 'Tổng quan' },
  { key: '/admin/departments', icon: <FiBriefcase />, label: 'Phòng ban' },
  { key: '/admin/positions', icon: <FiLayers />, label: 'Cấp bậc' },
  { key: '/admin/users', icon: <FiUsers />, label: 'Nhân sự' },
  { key: '/admin/reports', icon: <FiPieChart />, label: 'Báo cáo' },
  { key: '/admin/recurring', icon: <FiRepeat />, label: 'Task định kỳ' },
]

function Brand() {
  return (
    <NavLink to="/admin" className={styles.brand} aria-label="TaskFlow Admin">
      <span className={styles.brandMark} aria-hidden="true">
        <img src="/logo2.png" alt="" />
      </span>
      <span className={styles.brandName}>TaskFlow</span>
    </NavLink>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const selectedKey = useMemo(() => {
    const match = [...navigation]
      .reverse()
      .find((item) => location.pathname.startsWith(item.key))
    return match?.key || '/admin'
  }, [location.pathname])

  const menuItems = navigation.map((item) => ({
    ...item,
    label: <NavLink to={item.key}>{item.label}</NavLink>,
  }))

  const accountItems = [
    {
      key: 'logout',
      icon: <FiLogOut />,
      label: 'Đăng xuất',
      onClick: logout,
    },
  ]

  const navMenu = (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      items={menuItems}
      className={styles.menu}
      onClick={({ key }) => {
        navigate(key)
        setMobileOpen(false)
      }}
    />
  )

  return (
    <Layout className={styles.shell}>
      <Sider width={244} className={styles.sider}>
        <Brand />
        <div className={styles.navLabel}>QUẢN TRỊ HỆ THỐNG</div>
        {navMenu}
        <div className={styles.siderFooter}>TaskFlow Enterprise</div>
      </Sider>

      <Layout>
        <Header className={styles.header}>
          <Tooltip title="Mở menu">
            <Button
              className={styles.menuButton}
              type="text"
              icon={<FiMenu />}
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
            />
          </Tooltip>
          <div className={styles.headerTitle}>Trung tâm quản trị</div>
          <Dropdown
            menu={{ items: accountItems }}
            trigger={['click']}
            placement="bottomRight"
            overlayClassName={styles.accountDropdown}
          >
            <button className={styles.account} type="button">
              <Avatar className={styles.avatar}>{user.full_name?.charAt(0)}</Avatar>
              <span className={styles.accountText}>
                <strong>{user.full_name}</strong>
                <small>Quản trị hệ thống</small>
              </span>
              <FiChevronDown />
            </button>
          </Dropdown>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>

      <Drawer
        className={styles.mobileDrawer}
        placement="left"
        width={280}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        closable={false}
      >
        <Brand />
        <div className={styles.navLabel}>QUẢN TRỊ HỆ THỐNG</div>
        {navMenu}
      </Drawer>
    </Layout>
  )
}
