import { Button, Drawer, Empty, Input, Select, Table, Tag, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiEye, FiSearch } from 'react-icons/fi'
import { getDepartmentsApi } from '../../api/departmentApi'
import { getRecurringTemplateTasksApi, getRecurringTemplatesApi } from '../../api/recurringTaskApi'
import { getUsersApi } from '../../api/userApi'
import styles from './AdminRecurringPage.module.css'

const statusMeta = {
  TODO: ['Chờ thực hiện', 'default'],
  IN_PROGRESS: ['Đang thực hiện', 'processing'],
  SUBMITTED: ['Đã nộp', 'cyan'],
  REVIEWING: ['Đang duyệt', 'blue'],
  COMPLETED: ['Hoàn thành', 'green'],
  REJECTED: ['Yêu cầu làm lại', 'red'],
  CANCELLED: ['Đã hủy', 'default'],
}

const priorityMeta = {
  LOW: ['Thấp', 'default'],
  MEDIUM: ['Trung bình', 'blue'],
  HIGH: ['Cao', 'orange'],
  URGENT: ['Khẩn cấp', 'red'],
}

export default function AdminRecurringPage() {
  const [templates, setTemplates] = useState([])
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState()
  const [status, setStatus] = useState()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [generatedTasks, setGeneratedTasks] = useState([])
  const [taskLoading, setTaskLoading] = useState(false)

  useEffect(() => {
    Promise.all([getRecurringTemplatesApi(), getDepartmentsApi(), getUsersApi()])
      .then(([templateResponse, departmentResponse, userResponse]) => {
        setTemplates(templateResponse.data.templates || [])
        setDepartments(departmentResponse.data.departments || [])
        setUsers(userResponse.data.users || [])
      })
      .catch((err) => message.error(err.response?.data?.message || 'Không thể tải danh sách task định kỳ.'))
      .finally(() => setLoading(false))
  }, [])

  const departmentsById = useMemo(
    () => Object.fromEntries(departments.map((item) => [item.id, item])),
    [departments],
  )
  const usersById = useMemo(
    () => Object.fromEntries(users.map((item) => [item.id, item])),
    [users],
  )

  const filteredTemplates = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi')
    return templates.filter((item) => {
      const matchesKeyword = !keyword || item.title.toLocaleLowerCase('vi').includes(keyword)
      const matchesDepartment = !departmentId || item.department_id === departmentId
      const matchesStatus = status === undefined || item.is_active === status
      return matchesKeyword && matchesDepartment && matchesStatus
    })
  }, [templates, search, departmentId, status])

  const viewGeneratedTasks = async (template) => {
    setSelectedTemplate(template)
    setDrawerOpen(true)
    setTaskLoading(true)
    try {
      const response = await getRecurringTemplateTasksApi(template.id)
      setGeneratedTasks(response.data.tasks || [])
    } catch (err) {
      setGeneratedTasks([])
      message.error(err.response?.data?.message || 'Không thể tải task đã sinh.')
    } finally {
      setTaskLoading(false)
    }
  }

  const columns = [
    { title: 'Mẫu công việc', dataIndex: 'title', key: 'title', width: 260, render: (value, row) => <div className={styles.nameCell}><strong>{value}</strong><span>{row.description || 'Không có mô tả'}</span></div> },
    { title: 'Phòng ban', dataIndex: 'department_id', key: 'department', width: 180, render: (value) => departmentsById[value]?.name || 'Không xác định' },
    { title: 'Người giao', dataIndex: 'created_by', key: 'creator', width: 165, render: (value) => usersById[value]?.full_name || 'Không xác định' },
    { title: 'Người nhận', dataIndex: 'assigned_to', key: 'assignee', width: 165, render: (value) => usersById[value]?.full_name || 'Không xác định' },
    { title: 'Lịch hàng tháng', key: 'schedule', width: 150, render: (_, row) => <div className={styles.schedule}><span>Tạo ngày {row.generate_day}</span><small>Hạn ngày {row.due_day}</small></div> },
    { title: 'Ưu tiên', dataIndex: 'priority', key: 'priority', width: 110, render: (value) => <Tag color={priorityMeta[value]?.[1]}>{priorityMeta[value]?.[0] || value}</Tag> },
    { title: 'Trạng thái', dataIndex: 'is_active', key: 'status', width: 125, render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Đang chạy' : 'Tạm ngưng'}</Tag> },
    { title: '', key: 'actions', fixed: 'right', width: 58, render: (_, row) => <Button type="text" icon={<FiEye />} onClick={() => viewGeneratedTasks(row)} aria-label="Xem task đã sinh" /> },
  ]

  const taskColumns = [
    { title: 'Kỳ', key: 'period', width: 100, render: (_, row) => row.period_month && row.period_year ? `${String(row.period_month).padStart(2, '0')}/${row.period_year}` : '-' },
    { title: 'Công việc', dataIndex: 'title', key: 'title', render: (value) => <strong>{value}</strong> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 145, render: (value) => <Tag color={statusMeta[value]?.[1]}>{statusMeta[value]?.[0] || value}</Tag> },
    { title: 'Thời hạn', dataIndex: 'due_date', key: 'due', width: 145, render: (value) => value ? dayjs(value).format('DD/MM/YYYY') : 'Chưa có' },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span>GIÁM SÁT HỆ THỐNG</span><h1>Task định kỳ</h1><p>Theo dõi các mẫu hàng tháng và lịch sử công việc được sinh tự động.</p></div>
      </header>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <Input allowClear prefix={<FiSearch />} placeholder="Tìm mẫu công việc..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select allowClear placeholder="Tất cả phòng ban" value={departmentId} onChange={setDepartmentId} options={departments.map((item) => ({ value: item.id, label: item.name }))} />
          <Select allowClear placeholder="Tất cả trạng thái" value={status} onChange={setStatus} options={[{ value: true, label: 'Đang chạy' }, { value: false, label: 'Tạm ngưng' }]} />
          <span>{filteredTemplates.length} mẫu</span>
        </div>
        <Table rowKey="id" columns={columns} dataSource={filteredTemplates} loading={loading} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 1250 }} locale={{ emptyText: <Empty description="Chưa có mẫu task định kỳ" /> }} />
      </section>

      <Drawer title="Công việc đã sinh" width={760} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {selectedTemplate && (
          <div className={styles.drawerHeader}>
            <span><FiCalendar /></span>
            <div><strong>{selectedTemplate.title}</strong><small>{departmentsById[selectedTemplate.department_id]?.name} · Tạo ngày {selectedTemplate.generate_day} hàng tháng</small></div>
          </div>
        )}
        <Table rowKey="id" columns={taskColumns} dataSource={generatedTasks} loading={taskLoading} pagination={false} scroll={{ x: 620 }} locale={{ emptyText: <Empty description="Mẫu này chưa sinh công việc" /> }} />
      </Drawer>
    </div>
  )
}
