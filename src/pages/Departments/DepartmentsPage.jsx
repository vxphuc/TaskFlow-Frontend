import { App, Button, Empty, Form, Input, Modal, Popconfirm, Space, Table, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiPower, FiSearch } from 'react-icons/fi'
import { useNavigate } from 'react-router'
import {
  createDepartmentApi,
  getDepartmentsApi,
  setDepartmentActiveApi,
  updateDepartmentApi,
} from '../../api/departmentApi'
import styles from './DepartmentsPage.module.css'

export default function DepartmentsPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await getDepartmentsApi()
      setItems(response.data.departments || [])
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách phòng ban.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getDepartmentsApi()
      .then((response) => setItems(response.data.departments || []))
      .catch((err) => message.error(err.response?.data?.message || 'Không thể tải danh sách phòng ban.'))
      .finally(() => setLoading(false))
  }, [message])

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi')
    if (!keyword) return items
    return items.filter((item) =>
      [item.name, item.code, item.description].some((value) =>
        value?.toLocaleLowerCase('vi').includes(keyword),
      ),
    )
  }, [items, search])

  const showCreate = () => {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  const showEdit = (department) => {
    setEditing(department)
    form.setFieldsValue(department)
    setOpen(true)
  }

  const submit = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editing) await updateDepartmentApi(editing.id, values)
      else await createDepartmentApi(values)
      message.success(editing ? 'Đã cập nhật phòng ban.' : 'Đã tạo phòng ban mới.')
      setOpen(false)
      await loadData()
    } catch (err) {
      if (err.errorFields) return
      message.error(err.response?.data?.message || 'Không thể lưu phòng ban.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (department) => {
    try {
      await setDepartmentActiveApi(department.id, !department.is_active)
      message.success(department.is_active ? 'Đã ngừng hoạt động phòng ban.' : 'Đã kích hoạt phòng ban.')
      await loadData()
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể thay đổi trạng thái.')
    }
  }

  const columns = [
    { title: 'Phòng ban', dataIndex: 'name', key: 'name', render: (value, row) => <div className={styles.nameCell}><strong>{value}</strong><span>{row.code}</span></div> },
    { title: 'Mô tả', dataIndex: 'description', key: 'description', render: (value) => value || <span className={styles.muted}>Chưa có mô tả</span> },
    { title: 'Trạng thái', dataIndex: 'is_active', key: 'status', width: 140, render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Đang hoạt động' : 'Đã tạm ngưng'}</Tag> },
    { title: '', key: 'actions', width: 110, align: 'right', render: (_, row) => <Space size={4} onClick={(event) => event.stopPropagation()}><Button type="text" icon={<FiEdit2 />} onClick={() => showEdit(row)} aria-label="Sửa phòng ban" /><Popconfirm title={row.is_active ? 'Tạm ngưng phòng ban?' : 'Kích hoạt phòng ban?'} description="Thay đổi này có hiệu lực ngay." okText="Xác nhận" cancelText="Hủy" onConfirm={() => toggleActive(row)}><Button type="text" danger={row.is_active} icon={<FiPower />} aria-label="Đổi trạng thái" /></Popconfirm></Space> },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span>THIẾT LẬP TỔ CHỨC</span><h1>Phòng ban</h1><p>Quản lý các đơn vị đang vận hành trong doanh nghiệp.</p></div>
        <Button type="primary" icon={<FiPlus />} onClick={showCreate}>Thêm phòng ban</Button>
      </header>
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <Input allowClear prefix={<FiSearch />} placeholder="Tìm theo tên, mã phòng ban..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <span>{filteredItems.length} phòng ban</span>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredItems}
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 720 }}
          onRow={(department) => ({
            className: styles.clickableRow,
            tabIndex: 0,
            role: 'button',
            'aria-label': `Mở phòng ban ${department.name}`,
            onClick: () => navigate(`/admin/positions?department_id=${department.id}`),
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(`/admin/positions?department_id=${department.id}`)
              }
            },
          })}
          locale={{ emptyText: <Empty description="Chưa có phòng ban" /> }}
        />
      </section>

      <Modal title={editing ? 'Cập nhật phòng ban' : 'Tạo phòng ban mới'} open={open} onCancel={() => setOpen(false)} onOk={submit} confirmLoading={saving} okText={editing ? 'Lưu thay đổi' : 'Tạo phòng ban'} cancelText="Hủy" destroyOnHidden>
        <Form form={form} layout="vertical" className={styles.form}>
          <Form.Item name="name" label="Tên phòng ban" rules={[{ required: true, message: 'Nhập tên phòng ban.' }, { max: 150, message: 'Tối đa 150 ký tự.' }]}><Input placeholder="Ví dụ: Phòng Kinh doanh" /></Form.Item>
          <Form.Item name="code" label="Mã phòng ban" rules={[{ required: true, message: 'Nhập mã phòng ban.' }, { max: 50, message: 'Tối đa 50 ký tự.' }]}><Input placeholder="Ví dụ: SALES" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.toUpperCase() }} /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} placeholder="Mô tả ngắn về chức năng của phòng ban" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
