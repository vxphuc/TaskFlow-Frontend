import {
  Alert,
  Avatar,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiHelpCircle, FiSearch, FiUser, FiUserPlus, FiUsers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { getPositionsApi } from '../../api/positionApi'
import { createUserApi, getUsersApi } from '../../api/userApi'
import { useAuth } from '../../contexts/useAuth'
import styles from './UserTeamPage.module.css'

export default function UserTeamPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const departmentId = user?.department_id
  const [form] = Form.useForm()
  const [users, setUsers] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState()
  const [relationshipFilter, setRelationshipFilter] = useState()
  const [statusFilter, setStatusFilter] = useState()

  const loadData = useCallback(async () => {
    if (!departmentId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [usersResponse, positionsResponse] = await Promise.all([
        getUsersApi(),
        getPositionsApi(departmentId),
      ])
      setUsers(usersResponse.data.users || [])
      setPositions(positionsResponse.data.positions || [])
    } catch (error) {
      message.error(
        error.response?.data?.message || 'Không thể tải danh sách nhân sự cấp dưới.',
      )
    } finally {
      setLoading(false)
    }
  }, [departmentId])

  useEffect(() => {
    Promise.resolve().then(loadData)
  }, [loadData])

  const positionMap = useMemo(
    () => new Map(positions.map((position) => [position.id, position])),
    [positions],
  )

  const currentPosition = positionMap.get(user?.position_id)
  const eligiblePositions = useMemo(() => {
    if (!currentPosition) return []
    return positions.filter(
      (position) =>
        position.is_active && position.level_order > currentPosition.level_order,
    )
  }, [currentPosition, positions])

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi')

    return users.filter((employee) => {
      const isDirect = employee.manager_id === user?.id
      const matchesSearch =
        !keyword ||
        [employee.full_name, employee.phone].some((value) =>
          value?.toLocaleLowerCase('vi').includes(keyword),
        )
      const matchesPosition =
        !positionFilter || employee.position_id === positionFilter
      const matchesRelationship =
        !relationshipFilter ||
        (relationshipFilter === 'direct' ? isDirect : !isDirect)
      const matchesStatus =
        statusFilter === undefined || employee.is_active === statusFilter

      return (
        matchesSearch &&
        matchesPosition &&
        matchesRelationship &&
        matchesStatus
      )
    })
  }, [
    users,
    search,
    positionFilter,
    relationshipFilter,
    statusFilter,
    user?.id,
  ])

  const directCount = users.filter(
    (employee) => employee.manager_id === user?.id,
  ).length

  const showCreate = () => {
    form.resetFields()
    setOpen(true)
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await createUserApi({
        full_name: values.full_name,
        phone: values.phone,
        password: values.password,
        role: 'USER',
        department_id: user.department_id,
        position_id: values.position_id,
        manager_id: user.id,
      })
      message.success('Đã tạo nhân sự cấp dưới trực tiếp.')
      setOpen(false)
      form.resetFields()
      await loadData()
    } catch (error) {
      if (!error.errorFields) {
        message.error(
          error.response?.data?.message || 'Không thể tạo tài khoản nhân sự.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Nhân sự',
      key: 'employee',
      fixed: 'left',
      width: 240,
      render: (_, employee) => (
        <div className={styles.userCell}>
          <Avatar icon={<FiUser />} className={styles.avatar} />
          <div>
            <strong>{employee.full_name}</strong>
            <span>{employee.phone}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Cấp bậc',
      dataIndex: 'position_id',
      key: 'position',
      width: 210,
      render: (positionId) => {
        const position = positionMap.get(positionId)
        return position ? (
          <div className={styles.positionCell}>
            <strong>{position.name}</strong>
            <span>Cấp {position.level_order}</span>
          </div>
        ) : (
          <span className={styles.muted}>Chưa xác định</span>
        )
      },
    },
    {
      title: 'Quan hệ quản lý',
      key: 'relationship',
      width: 165,
      render: (_, employee) =>
        employee.manager_id === user?.id ? (
          <Tag color="green">Trực tiếp</Tag>
        ) : (
          <Tag color="blue">Gián tiếp</Tag>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'status',
      width: 145,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'created_at',
      key: 'createdAt',
      width: 145,
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '--'),
    },
  ]

  const organizationReady = Boolean(user?.department_id && user?.position_id)

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>CƠ CẤU NHÂN SỰ</span>
          <h1>Nhân sự cấp dưới</h1>
          <p>Theo dõi đội ngũ thuộc các cấp thấp hơn trong cùng phòng ban.</p>
        </div>
        <Space wrap>
          <Button
            icon={<FiHelpCircle />}
            onClick={() => navigate('/app/guide#create-user')}
          >
            Hướng dẫn
          </Button>
          <Button
            type="primary"
            icon={<FiUserPlus />}
            onClick={showCreate}
            disabled={!organizationReady || eligiblePositions.length === 0}
          >
            Thêm nhân sự
          </Button>
        </Space>
      </header>

      {!organizationReady && (
        <Alert
          className={styles.alert}
          type="warning"
          showIcon
          message="Tài khoản chưa được thiết lập đầy đủ phòng ban và cấp bậc."
        />
      )}

      <section className={styles.summary}>
        <div>
          <FiUsers />
          <span>Tổng cấp dưới</span>
          <strong>{users.length}</strong>
        </div>
        <div>
          <FiUser />
          <span>Báo cáo trực tiếp</span>
          <strong>{directCount}</strong>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <Input
            allowClear
            prefix={<FiSearch />}
            placeholder="Tìm tên hoặc số điện thoại..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            allowClear
            placeholder="Tất cả cấp bậc"
            value={positionFilter}
            onChange={setPositionFilter}
            options={eligiblePositions.map((position) => ({
              value: position.id,
              label: `Cấp ${position.level_order} · ${position.name}`,
            }))}
          />
          <Select
            allowClear
            placeholder="Quan hệ quản lý"
            value={relationshipFilter}
            onChange={setRelationshipFilter}
            options={[
              { value: 'direct', label: 'Cấp dưới trực tiếp' },
              { value: 'indirect', label: 'Cấp dưới gián tiếp' },
            ]}
          />
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: true, label: 'Đang hoạt động' },
              { value: false, label: 'Đã vô hiệu hóa' },
            ]}
          />
          <span>{filteredUsers.length} nhân sự</span>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty description="Không có nhân sự cấp dưới phù hợp" />
            ),
          }}
        />
      </section>

      <Modal
        title="Thêm nhân sự cấp dưới"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        okText="Tạo tài khoản"
        cancelText="Hủy"
        width={640}
        destroyOnHidden
      >
        <p className={styles.modalIntro}>
          Nhân sự mới sẽ thuộc phòng ban hiện tại và báo cáo trực tiếp cho bạn.
        </p>
        <Form form={form} layout="vertical" className={styles.form}>
          <div className={styles.formGrid}>
            <Form.Item
              name="full_name"
              label="Họ và tên"
              rules={[{ required: true, message: 'Nhập họ và tên.' }]}
            >
              <Input placeholder="Nguyễn Văn An" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[{ required: true, message: 'Nhập số điện thoại.' }]}
            >
              <Input placeholder="0901234567" />
            </Form.Item>
          </div>
          <div className={styles.formGrid}>
            <Form.Item
              name="position_id"
              label="Cấp bậc"
              rules={[{ required: true, message: 'Chọn cấp bậc.' }]}
            >
              <Select
                placeholder="Chọn cấp bậc thấp hơn"
                options={eligiblePositions.map((position) => ({
                  value: position.id,
                  label: `Cấp ${position.level_order} · ${position.name}`,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Mật khẩu ban đầu"
              rules={[
                { required: true, message: 'Nhập mật khẩu.' },
                { min: 6, message: 'Mật khẩu cần ít nhất 6 ký tự.' },
              ]}
            >
              <Input.Password placeholder="Tối thiểu 6 ký tự" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
