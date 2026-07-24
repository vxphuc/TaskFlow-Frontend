import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Dropdown,
  Empty,
  Layout,
  Menu,
  Spin,
  Tooltip,
} from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiBell,
  FiBarChart2,
  FiBookOpen,
  FiChevronDown,
  FiClipboard,
  FiGrid,
  FiInbox,
  FiKey,
  FiLogOut,
  FiMenu,
  FiRepeat,
  FiSend,
  FiUsers,
  FiWifi,
  FiWifiOff,
} from 'react-icons/fi'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../../api/notificationApi'
import { useAuth } from '../../contexts/useAuth'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import { useRealtimeStatus } from '../../hooks/useRealtimeStatus'
import { formatDateTime } from '../../utils/task'
import ChangePasswordModal from '../Account/ChangePasswordModal'
import styles from './UserLayout.module.css'

const { Header, Sider, Content } = Layout

const navigation = [
  { key: '/app', icon: <FiGrid />, label: 'Tổng quan' },
  { key: '/app/assigned', icon: <FiInbox />, label: 'Việc được giao' },
  { key: '/app/created', icon: <FiSend />, label: 'Việc tôi giao' },
  { key: '/app/team', icon: <FiUsers />, label: 'Nhân sự cấp dưới' },
  { key: '/app/recurring', icon: <FiRepeat />, label: 'Task định kỳ' },
  { key: '/app/reports', icon: <FiBarChart2 />, label: 'Báo cáo' },
  { key: '/app/guide', icon: <FiBookOpen />, label: 'Hướng dẫn sử dụng' },
]

function Brand() {
  return (
    <NavLink to="/app" className={styles.brand} aria-label="TaskFlow">
      <span className={styles.brandMark}><img src="/logo2.png" alt="" /></span>
      <span className={styles.brandName}>TaskFlow</span>
    </NavLink>
  )
}

export default function UserLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const realtimeStatus = useRealtimeStatus()

  const selectedKey = useMemo(() => {
    const match = [...navigation]
      .reverse()
      .find((item) => location.pathname === item.key || location.pathname.startsWith(`${item.key}/`))
    return match?.key || '/app'
  }, [location.pathname])

  const unreadCount = notifications.filter((item) => !item.is_read).length

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true)
    try {
      const response = await getNotificationsApi()
      setNotifications(response.data.notifications || [])
    } finally {
      setNotificationLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(loadNotifications)
  }, [loadNotifications])

  useRealtimeRefresh(loadNotifications, 'notification')

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      await markNotificationReadApi(notification.id)
      setNotifications((items) =>
        items.map((item) => item.id === notification.id ? { ...item, is_read: true } : item),
      )
    }
    if (notification.reference_type === 'TASK' && notification.reference_id) {
      setNotificationOpen(false)
      navigate(`/app/tasks/${notification.reference_id}`)
    }
  }

  const markAllRead = async () => {
    await markAllNotificationsReadApi()
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })))
  }

  const menuItems = navigation.map((item) => ({
    ...item,
    label: <NavLink to={item.key}>{item.label}</NavLink>,
  }))

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

  const accountItems = [
    {
      key: 'change-password',
      icon: <FiKey />,
      label: 'Đổi mật khẩu',
      onClick: () => setPasswordOpen(true),
    },
    {
      key: 'logout',
      icon: <FiLogOut />,
      label: 'Đăng xuất',
      onClick: logout,
    },
  ]

  return (
    <Layout className={styles.shell}>
      <Sider width={244} className={styles.sider}>
        <Brand />
        <div className={styles.navLabel}>KHÔNG GIAN LÀM VIỆC</div>
        {navMenu}
        <div className={styles.siderFooter}>
          <FiClipboard />
          <span>TaskFlow Enterprise</span>
        </div>
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
          <div className={styles.headerTitle}>Không gian công việc</div>
          <Tooltip
            title={
              realtimeStatus === 'connected'
                ? 'Đồng bộ thời gian thực đang hoạt động'
                : 'Mất kết nối thời gian thực - đang dùng đồng bộ dự phòng'
            }
          >
            <span
              className={`${styles.realtimeStatus} ${
                realtimeStatus === 'connected' ? styles.connected : styles.offline
              }`}
              aria-label={
                realtimeStatus === 'connected'
                  ? 'Đã kết nối thời gian thực'
                  : 'Chưa kết nối thời gian thực'
              }
            >
              {realtimeStatus === 'connected' ? <FiWifi /> : <FiWifiOff />}
            </span>
          </Tooltip>
          <Tooltip title="Thông báo">
            <Badge count={unreadCount} size="small">
              <Button
                className={styles.notificationButton}
                type="text"
                icon={<FiBell />}
                onClick={() => setNotificationOpen(true)}
                aria-label="Thông báo"
              />
            </Badge>
          </Tooltip>
          <Dropdown menu={{ items: accountItems }} trigger={['click']} placement="bottomRight">
            <button className={styles.account} type="button">
              <Avatar className={styles.avatar}>{user.full_name?.charAt(0)}</Avatar>
              <span className={styles.accountText}>
                <strong>{user.full_name}</strong>
                <small>Thành viên</small>
              </span>
              <FiChevronDown />
            </button>
          </Dropdown>
        </Header>
        <Content className={styles.content}><Outlet /></Content>
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
        <div className={styles.navLabel}>KHÔNG GIAN LÀM VIỆC</div>
        {navMenu}
      </Drawer>

      <Drawer
        title="Thông báo"
        placement="right"
        width={400}
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        extra={unreadCount > 0 && <Button type="link" onClick={markAllRead}>Đọc tất cả</Button>}
      >
        {notificationLoading ? (
          <div className={styles.drawerLoading}><Spin /></div>
        ) : notifications.length === 0 ? (
          <Empty description="Chưa có thông báo" />
        ) : (
          <div className={styles.notificationList}>
            {notifications.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`${styles.notificationItem} ${!item.is_read ? styles.unread : ''}`}
                onClick={() => openNotification(item)}
              >
                <span className={styles.notificationDot} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                  <time>{formatDateTime(item.created_at)}</time>
                </span>
              </button>
            ))}
          </div>
        )}
      </Drawer>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Layout>
  )
}
