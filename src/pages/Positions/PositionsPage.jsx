import { App, Button, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiPower } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router'
import { getDepartmentsApi } from '../../api/departmentApi'
import { createPositionApi, getPositionsApi, setPositionActiveApi, updatePositionApi } from '../../api/positionApi'
import styles from './PositionsPage.module.css'

export default function PositionsPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form] = Form.useForm()
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState()
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const selectedDepartment = departments.find((item) => item.id === departmentId)

  const loadPositions = useCallback(async (id) => {
    if (!id) { setPositions([]); setLoading(false); return }
    setLoading(true)
    try {
      const response = await getPositionsApi(id)
      setPositions(response.data.positions || [])
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách cấp bậc.')
    } finally { setLoading(false) }
  }, [message])

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await getDepartmentsApi()
        const items = response.data.departments || []
        setDepartments(items)
        const requestedId = searchParams.get('department_id')
        const requestedDepartment = items.find((item) => item.id === requestedId)
        const initialDepartment = requestedDepartment
          || items.find((item) => item.is_active)
          || items[0]
        setDepartmentId(initialDepartment?.id)
        await loadPositions(initialDepartment?.id)
      } catch (err) {
        message.error(err.response?.data?.message || 'Không thể tải phòng ban.')
        setLoading(false)
      }
    }
    loadDepartments()
  }, [loadPositions, message, searchParams])

  const changeDepartment = (value) => {
    setDepartmentId(value)
    setSearchParams({ department_id: value })
    loadPositions(value)
  }

  const parentOptions = useMemo(() => positions
    .filter((item) => item.id !== editing?.id && item.is_active)
    .map((item) => ({ value: item.id, label: `Cấp ${item.level_order} · ${item.name}` })), [positions, editing])

  const showCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ level_order: positions.length + 1, can_view_department_report: false })
    setOpen(true)
  }

  const showEdit = (position) => {
    setEditing(position)
    form.setFieldsValue(position)
    setOpen(true)
  }

  const submit = async () => {
    const values = await form.validateFields()
    const payload = { ...values, parent_position_id: values.parent_position_id || null }
    setSaving(true)
    try {
      if (editing) await updatePositionApi(editing.id, payload)
      else await createPositionApi(departmentId, payload)
      message.success(editing ? 'Đã cập nhật cấp bậc.' : 'Đã thêm cấp bậc mới.')
      setOpen(false)
      await loadPositions(departmentId)
    } catch (err) {
      if (!err.errorFields) message.error(err.response?.data?.message || 'Không thể lưu cấp bậc.')
    } finally { setSaving(false) }
  }

  const toggleActive = async (position) => {
    try {
      await setPositionActiveApi(position.id, !position.is_active)
      message.success(position.is_active ? 'Đã tạm ngưng cấp bậc.' : 'Đã kích hoạt cấp bậc.')
      await loadPositions(departmentId)
    } catch (err) { message.error(err.response?.data?.message || 'Không thể thay đổi trạng thái.') }
  }

  const openPositionUsers = (position) => {
    const params = new URLSearchParams({
      department_id: departmentId,
      position_id: position.id,
    })
    navigate(`/admin/users?${params.toString()}`)
  }

  const columns = [
    { title: 'Thứ tự', dataIndex: 'level_order', key: 'level', width: 90, render: (value) => <span className={styles.level}>Cấp {value}</span> },
    { title: 'Tên cấp bậc', dataIndex: 'name', key: 'name', render: (value, row) => <div className={styles.nameCell}><strong>{value}</strong><span>{row.code}</span></div> },
    { title: 'Cấp trên trực tiếp', dataIndex: 'parent_position_id', key: 'parent', render: (value) => value ? positions.find((item) => item.id === value)?.name || 'Không xác định' : <span className={styles.muted}>Cấp cao nhất</span> },
    { title: 'Quyền báo cáo', dataIndex: 'can_view_department_report', key: 'report', width: 135, render: (value) => value ? <Tag color="green">Được xem</Tag> : <Tag>Không</Tag> },
    { title: 'Trạng thái', dataIndex: 'is_active', key: 'status', width: 135, render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Hoạt động' : 'Tạm ngưng'}</Tag> },
    { title: '', key: 'actions', width: 105, align: 'right', render: (_, row) => <Space size={4} onClick={(event) => event.stopPropagation()}><Button type="text" icon={<FiEdit2 />} onClick={() => showEdit(row)} aria-label="Sửa cấp bậc" /><Popconfirm title={row.is_active ? 'Tạm ngưng cấp bậc?' : 'Kích hoạt cấp bậc?'} okText="Xác nhận" cancelText="Hủy" onConfirm={() => toggleActive(row)}><Button type="text" danger={row.is_active} icon={<FiPower />} aria-label="Đổi trạng thái" /></Popconfirm></Space> },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span>PHÂN CẤP LINH HOẠT</span><h1>Cấp bậc phòng ban</h1><p>Thiết lập chuỗi quản lý riêng cho từng đơn vị.</p></div>
        <Button type="primary" icon={<FiPlus />} disabled={!departmentId || !selectedDepartment?.is_active} onClick={showCreate}>Thêm cấp bậc</Button>
      </header>
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div><label>Phòng ban</label><Select value={departmentId} onChange={changeDepartment} placeholder="Chọn phòng ban" options={departments.map((item) => ({ value: item.id, label: item.name, disabled: !item.is_active }))} /></div>
          <span>{positions.length} cấp bậc</span>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={positions}
          loading={loading}
          pagination={false}
          scroll={{ x: 850 }}
          onRow={(position) => ({
            className: styles.clickableRow,
            tabIndex: 0,
            role: 'button',
            'aria-label': `Xem nhân sự thuộc cấp bậc ${position.name}`,
            onClick: () => openPositionUsers(position),
            onKeyDown: (event) => {
              if (event.target !== event.currentTarget) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openPositionUsers(position)
              }
            },
          })}
          locale={{ emptyText: <Empty description={departmentId ? 'Phòng ban chưa có cấp bậc' : 'Chọn một phòng ban'} /> }}
        />
      </section>

      <Modal title={editing ? 'Cập nhật cấp bậc' : `Thêm cấp bậc · ${selectedDepartment?.name || ''}`} open={open} onCancel={() => setOpen(false)} onOk={submit} confirmLoading={saving} okText={editing ? 'Lưu thay đổi' : 'Thêm cấp bậc'} cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical" className={styles.form}>
          <div className={styles.formGrid}>
            <Form.Item name="name" label="Tên cấp bậc" rules={[{ required: true, message: 'Nhập tên cấp bậc.' }]}><Input placeholder="Ví dụ: Trưởng phòng" /></Form.Item>
            <Form.Item name="code" label="Mã cấp bậc" rules={[{ required: true, message: 'Nhập mã cấp bậc.' }]}><Input placeholder="MANAGER" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.toUpperCase() }} /></Form.Item>
          </div>
          <div className={styles.formGrid}>
            <Form.Item name="level_order" label="Thứ tự cấp" rules={[{ required: true, message: 'Nhập thứ tự.' }]}><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="parent_position_id" label="Cấp trên trực tiếp"><Select allowClear placeholder="Không có (cấp cao nhất)" options={parentOptions} /></Form.Item>
          </div>
          <Form.Item name="can_view_department_report" label="Quyền xem báo cáo phòng ban" valuePropName="checked"><Switch checkedChildren="Có" unCheckedChildren="Không" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
