import { App, Avatar, Button, Empty, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiKey, FiPlus, FiPower, FiSearch, FiUser } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router'
import { getDepartmentsApi } from '../../api/departmentApi'
import { getPositionsApi } from '../../api/positionApi'
import { changeUserPasswordApi, createUserApi, getUsersApi, setUserActiveApi, updateUserApi } from '../../api/userApi'
import styles from './UsersPage.module.css'

export default function UsersPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [positionsByDepartment, setPositionsByDepartment] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [passwordUser, setPasswordUser] = useState(null)
  const [search, setSearch] = useState('')
  const departmentFilter = searchParams.get('department_id') || undefined
  const positionFilter = searchParams.get('position_id') || undefined
  const [statusFilter, setStatusFilter] = useState()

  const selectedRole = Form.useWatch('role', form)
  const selectedDepartmentId = Form.useWatch('department_id', form)
  const selectedPositionId = Form.useWatch('position_id', form)

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersResponse, departmentsResponse] = await Promise.all([getUsersApi(), getDepartmentsApi()])
      setUsers(usersResponse.data.users || [])
      setDepartments(departmentsResponse.data.departments || [])
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách nhân sự.')
    } finally { setLoading(false) }
  }

  const ensurePositions = async (departmentId) => {
    if (!departmentId || positionsByDepartment[departmentId]) return
    try {
      const response = await getPositionsApi(departmentId)
      setPositionsByDepartment((current) => ({ ...current, [departmentId]: response.data.positions || [] }))
    } catch (err) { message.error(err.response?.data?.message || 'Không thể tải cấp bậc.') }
  }

  const allKnownPositions = useMemo(() => Object.values(positionsByDepartment).flat(), [positionsByDepartment])
  const currentPositions = positionsByDepartment[selectedDepartmentId] || []
  const selectedPosition = currentPositions.find((item) => item.id === selectedPositionId)
  const departmentName = (id) => departments.find((item) => item.id === id)?.name || 'Chưa phân phòng'
  const positionName = (id) => allKnownPositions.find((item) => item.id === id)?.name || 'Chưa xác định'

  useEffect(() => {
    Promise.all([getUsersApi(), getDepartmentsApi()])
      .then(async ([usersResponse, departmentsResponse]) => {
        const departmentItems = departmentsResponse.data.departments || []
        setUsers(usersResponse.data.users || [])
        setDepartments(departmentItems)
        const responses = await Promise.all(
          departmentItems.map((department) => getPositionsApi(department.id)),
        )
        const positionMap = Object.fromEntries(
          departmentItems.map((department, index) => [
            department.id,
            responses[index].data.positions || [],
          ]),
        )
        setPositionsByDepartment(positionMap)
      })
      .catch((err) => message.error(err.response?.data?.message || 'Không thể tải danh sách nhân sự.'))
      .finally(() => setLoading(false))
  }, [message])

  const updateFilterParams = (departmentId, positionId) => {
    const nextParams = new URLSearchParams(searchParams)
    if (departmentId) nextParams.set('department_id', departmentId)
    else nextParams.delete('department_id')
    if (positionId) nextParams.set('position_id', positionId)
    else nextParams.delete('position_id')
    setSearchParams(nextParams, { replace: true })
  }

  const changeDepartmentFilter = (value) => {
    updateFilterParams(value, undefined)
  }

  const changePositionFilter = (value) => {
    updateFilterParams(departmentFilter, value)
  }

  const managerOptions = users
    .filter((user) => {
      if (user.role !== 'USER' || !user.is_active || user.id === editing?.id) return false
      if (user.department_id !== selectedDepartmentId || !selectedPosition) return false
      const managerPosition = currentPositions.find((item) => item.id === user.position_id)
      return managerPosition && managerPosition.level_order < selectedPosition.level_order
    })
    .map((user) => ({ value: user.id, label: `${user.full_name} · ${positionName(user.position_id)}` }))

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi')
    return users.filter((user) => {
      const matchesSearch = !keyword || [user.full_name, user.phone].some((value) => value?.toLocaleLowerCase('vi').includes(keyword))
      const matchesDepartment = !departmentFilter || user.department_id === departmentFilter
      const matchesPosition = !positionFilter || user.position_id === positionFilter
      const matchesStatus = statusFilter === undefined || user.is_active === statusFilter
      return matchesSearch && matchesDepartment && matchesPosition && matchesStatus
    })
  }, [users, search, departmentFilter, positionFilter, statusFilter])

  const positionFilterOptions = useMemo(
    () => allKnownPositions
      .filter((position) => (
        !departmentFilter || position.department_id === departmentFilter
      ))
      .sort((a, b) => (
        a.level_order - b.level_order || a.name.localeCompare(b.name, 'vi')
      ))
      .map((position) => ({
        value: position.id,
        label: `${position.name} · ${departments.find(
          (department) => department.id === position.department_id,
        )?.name || 'Chưa phân phòng'}`,
      })),
    [allKnownPositions, departmentFilter, departments],
  )

  const showCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ role: 'USER' })
    setOpen(true)
  }

  const showEdit = async (user) => {
    setEditing(user)
    await ensurePositions(user.department_id)
    form.setFieldsValue({ ...user, password: undefined })
    setOpen(true)
  }

  const submit = async () => {
    const values = await form.validateFields()
    const payload = { ...values }
    if (payload.role === 'SYSTEM_ADMIN') {
      payload.department_id = null
      payload.position_id = null
      payload.manager_id = null
    } else {
      payload.manager_id = payload.manager_id || null
    }
    if (editing && !payload.password) delete payload.password
    setSaving(true)
    try {
      if (editing) await updateUserApi(editing.id, payload)
      else await createUserApi(payload)
      message.success(editing ? 'Đã cập nhật tài khoản.' : 'Đã tạo tài khoản mới.')
      setOpen(false)
      await loadData()
    } catch (err) {
      if (!err.errorFields) message.error(err.response?.data?.message || 'Không thể lưu tài khoản.')
    } finally { setSaving(false) }
  }

  const toggleActive = async (user) => {
    try {
      await setUserActiveApi(user.id, !user.is_active)
      message.success(user.is_active ? 'Đã vô hiệu hóa tài khoản.' : 'Đã kích hoạt tài khoản.')
      await loadData()
    } catch (err) { message.error(err.response?.data?.message || 'Không thể thay đổi trạng thái.') }
  }

  const showPassword = (user) => {
    setPasswordUser(user)
    passwordForm.resetFields()
    setPasswordOpen(true)
  }

  const changePassword = async () => {
    const { password } = await passwordForm.validateFields()
    setSaving(true)
    try {
      await changeUserPasswordApi(passwordUser.id, password)
      message.success('Đã đổi mật khẩu tài khoản.')
      setPasswordOpen(false)
    } catch (err) {
      if (!err.errorFields) message.error(err.response?.data?.message || 'Không thể đổi mật khẩu.')
    } finally { setSaving(false) }
  }

  const columns = [
    { title: 'Nhân sự', key: 'user', fixed: 'left', width: 220, render: (_, user) => <div className={styles.userCell}><Avatar icon={<FiUser />} className={styles.avatar} /><div><strong>{user.full_name}</strong><span>{user.phone}</span></div></div> },
    { title: 'Vai trò', dataIndex: 'role', key: 'role', width: 130, render: (value) => value === 'SYSTEM_ADMIN' ? <Tag color="gold">Quản trị viên</Tag> : <Tag color="green">Nhân viên</Tag> },
    { title: 'Phòng ban', dataIndex: 'department_id', key: 'department', width: 180, render: departmentName },
    { title: 'Cấp bậc', dataIndex: 'position_id', key: 'position', width: 170, render: (value, user) => user.role === 'SYSTEM_ADMIN' ? <span className={styles.muted}>Không áp dụng</span> : positionName(value) },
    { title: 'Trạng thái', dataIndex: 'is_active', key: 'status', width: 135, render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Hoạt động' : 'Vô hiệu hóa'}</Tag> },
    { title: '', key: 'actions', fixed: 'right', width: 145, align: 'right', render: (_, user) => <Space size={2} onClick={(event) => event.stopPropagation()}><Button type="text" icon={<FiEdit2 />} onClick={() => showEdit(user)} aria-label="Sửa tài khoản" /><Button type="text" icon={<FiKey />} onClick={() => showPassword(user)} aria-label="Đổi mật khẩu" /><Popconfirm title={user.is_active ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt tài khoản?'} okText="Xác nhận" cancelText="Hủy" onConfirm={() => toggleActive(user)}><Button type="text" danger={user.is_active} icon={<FiPower />} aria-label="Đổi trạng thái" /></Popconfirm></Space> },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span>QUẢN TRỊ TÀI KHOẢN</span><h1>Nhân sự</h1><p>Quản lý thông tin, vai trò và quan hệ báo cáo.</p></div>
        <Button type="primary" icon={<FiPlus />} onClick={showCreate}>Thêm nhân sự</Button>
      </header>
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <Input allowClear prefix={<FiSearch />} placeholder="Tìm tên hoặc số điện thoại..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select allowClear placeholder="Tất cả phòng ban" value={departmentFilter} onChange={changeDepartmentFilter} options={departments.map((item) => ({ value: item.id, label: item.name }))} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="Tất cả cấp bậc" value={positionFilter} onChange={changePositionFilter} options={positionFilterOptions} />
          <Select allowClear placeholder="Tất cả trạng thái" value={statusFilter} onChange={setStatusFilter} options={[{ value: true, label: 'Đang hoạt động' }, { value: false, label: 'Đã vô hiệu hóa' }]} />
          <span>{filteredUsers.length} tài khoản</span>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1050 }}
          onRow={(employee) => ({
            className: styles.clickableRow,
            tabIndex: 0,
            role: 'button',
            'aria-label': `Xem công việc của ${employee.full_name}`,
            onClick: () => navigate(`/admin/reports?mode=user&user_id=${employee.id}`),
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(`/admin/reports?mode=user&user_id=${employee.id}`)
              }
            },
          })}
          locale={{ emptyText: <Empty description="Không có nhân sự phù hợp" /> }}
        />
      </section>

      <Modal title={editing ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'} open={open} onCancel={() => setOpen(false)} onOk={submit} confirmLoading={saving} okText={editing ? 'Lưu thay đổi' : 'Tạo tài khoản'} cancelText="Hủy" width={680} destroyOnHidden>
        <Form form={form} layout="vertical" className={styles.form}>
          <div className={styles.formGrid}>
            <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ và tên.' }]}><Input placeholder="Nguyễn Văn An" /></Form.Item>
            <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại.' }]}><Input placeholder="0901234567" /></Form.Item>
          </div>
          <div className={styles.formGrid}>
            <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}><Select options={[{ value: 'USER', label: 'Nhân viên' }, { value: 'SYSTEM_ADMIN', label: 'Quản trị công ty' }]} /></Form.Item>
            {!editing && <Form.Item name="password" label="Mật khẩu ban đầu" rules={[{ required: true, message: 'Nhập mật khẩu.' }, { min: 6, message: 'Ít nhất 6 ký tự.' }]}><Input.Password placeholder="Tối thiểu 6 ký tự" /></Form.Item>}
          </div>
          {selectedRole === 'USER' && (
            <>
              <div className={styles.formGrid}>
                <Form.Item name="department_id" label="Phòng ban" rules={[{ required: true, message: 'Chọn phòng ban.' }]}><Select placeholder="Chọn phòng ban" options={departments.filter((item) => item.is_active).map((item) => ({ value: item.id, label: item.name }))} onChange={() => form.setFieldsValue({ position_id: undefined, manager_id: undefined })} /></Form.Item>
                <Form.Item name="position_id" label="Cấp bậc" rules={[{ required: true, message: 'Chọn cấp bậc.' }]}><Select placeholder="Chọn cấp bậc" disabled={!selectedDepartmentId} options={currentPositions.filter((item) => item.is_active).map((item) => ({ value: item.id, label: `Cấp ${item.level_order} · ${item.name}` }))} onChange={() => form.setFieldValue('manager_id', undefined)} /></Form.Item>
              </div>
              <Form.Item name="manager_id" label="Quản lý trực tiếp" extra="Có thể để trống với vị trí cao nhất trong phòng ban."><Select allowClear showSearch optionFilterProp="label" placeholder="Chọn người quản lý" disabled={!selectedPositionId} options={managerOptions} /></Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal title={`Đổi mật khẩu · ${passwordUser?.full_name || ''}`} open={passwordOpen} onCancel={() => setPasswordOpen(false)} onOk={changePassword} confirmLoading={saving} okText="Đổi mật khẩu" cancelText="Hủy" destroyOnHidden>
        <Form form={passwordForm} layout="vertical" className={styles.form}>
          <Form.Item name="password" label="Mật khẩu mới" rules={[{ required: true, message: 'Nhập mật khẩu mới.' }, { min: 6, message: 'Ít nhất 6 ký tự.' }]}><Input.Password placeholder="Tối thiểu 6 ký tự" /></Form.Item>
          <Form.Item name="confirm_password" label="Nhập lại mật khẩu" dependencies={['password']} rules={[{ required: true, message: 'Nhập lại mật khẩu.' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Mật khẩu nhập lại chưa khớp.')) } })]}><Input.Password placeholder="Nhập lại mật khẩu mới" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
