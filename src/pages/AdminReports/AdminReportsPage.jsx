import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Progress,
  Segmented,
  Select,
  Skeleton,
  Spin,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { FiActivity, FiBarChart2, FiCheckCircle, FiClock, FiEye, FiRefreshCw } from 'react-icons/fi'
import { getDepartmentsApi } from '../../api/departmentApi'
import { getDepartmentMonthlyReportApi, getUserMonthlyReportApi } from '../../api/reportApi'
import {
  getTaskCommentsApi,
  getTaskDetailApi,
  getTaskHistoryApi,
  getTaskSubmissionsApi,
  getTaskSubtasksApi,
} from '../../api/taskApi'
import { getUsersApi } from '../../api/userApi'
import styles from './AdminReportsPage.module.css'

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

const formatDate = (value) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : 'Chưa có'

function StatusTag({ status }) {
  const [label, color] = statusMeta[status] || [status, 'default']
  return <Tag color={color}>{label}</Tag>
}

export default function AdminReportsPage() {
  const [mode, setMode] = useState('department')
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [departmentId, setDepartmentId] = useState()
  const [userId, setUserId] = useState()
  const [period, setPeriod] = useState(dayjs())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [audit, setAudit] = useState(null)

  useEffect(() => {
    Promise.all([getDepartmentsApi(), getUsersApi({ role: 'USER' })])
      .then(async ([departmentResponse, userResponse]) => {
        const departmentItems = departmentResponse.data.departments || []
        const userItems = userResponse.data.users || []
        setDepartments(departmentItems)
        setUsers(userItems)
        const firstDepartment = departmentItems.find((item) => item.is_active) || departmentItems[0]
        const firstUser = userItems.find((item) => item.is_active) || userItems[0]
        setDepartmentId(firstDepartment?.id)
        setUserId(firstUser?.id)
        if (firstDepartment) {
          const response = await getDepartmentMonthlyReportApi(
            firstDepartment.id,
            dayjs().year(),
            dayjs().month() + 1,
          )
          setReport(response.data.report)
        }
      })
      .catch((err) => setError(err.response?.data?.message || 'Không thể tải dữ liệu báo cáo.'))
      .finally(() => setLoading(false))
  }, [])

  const usersById = useMemo(
    () => Object.fromEntries(users.map((user) => [user.id, user])),
    [users],
  )

  const departmentUsers = users.filter(
    (user) => !departmentId || user.department_id === departmentId,
  )

  const loadReport = async () => {
    const targetId = mode === 'department' ? departmentId : userId
    if (!targetId) {
      message.warning(mode === 'department' ? 'Chọn phòng ban cần xem.' : 'Chọn nhân viên cần xem.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const year = period.year()
      const month = period.month() + 1
      const response = mode === 'department'
        ? await getDepartmentMonthlyReportApi(targetId, year, month)
        : await getUserMonthlyReportApi(targetId, year, month)
      setReport(response.data.report)
    } catch (err) {
      setReport(null)
      setError(err.response?.data?.message || 'Không thể tải báo cáo.')
    } finally {
      setLoading(false)
    }
  }

  const changeMode = (value) => {
    setMode(value)
    setReport(null)
    setError('')
  }

  const openTaskAudit = async (task) => {
    setDrawerOpen(true)
    setAuditLoading(true)
    setAudit(null)
    try {
      const [detail, subtasks, submissions, comments, history] = await Promise.all([
        getTaskDetailApi(task.id),
        getTaskSubtasksApi(task.id),
        getTaskSubmissionsApi(task.id),
        getTaskCommentsApi(task.id),
        getTaskHistoryApi(task.id),
      ])
      setAudit({
        task: detail.data.task,
        subtasks: subtasks.data.subtasks || [],
        submissions: submissions.data.submissions || [],
        comments: comments.data.comments || [],
        logs: history.data.logs || [],
      })
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải chi tiết task.')
    } finally {
      setAuditLoading(false)
    }
  }

  const summary = report?.summary
  const totalTasks = summary?.total_tasks ?? summary?.total_assigned_tasks ?? 0
  const tasks = report?.tasks || []

  const statItems = summary ? [
    { label: 'Tổng công việc', value: totalTasks, icon: <FiBarChart2 />, tone: 'neutral' },
    { label: 'Đã hoàn thành', value: summary.completed_tasks, icon: <FiCheckCircle />, tone: 'success' },
    { label: 'Đang xử lý', value: (summary.in_progress_tasks || 0) + (summary.submitted_tasks || 0) + (summary.reviewing_tasks || 0), icon: <FiActivity />, tone: 'info' },
    { label: 'Quá hạn', value: summary.overdue_tasks, icon: <FiClock />, tone: 'danger' },
  ] : []

  const taskColumns = [
    { title: 'Công việc', dataIndex: 'title', key: 'title', width: 260, render: (value, row) => <div className={styles.taskName}><strong>{value}</strong><span>{row.task_type === 'RECURRING' ? 'Định kỳ' : 'Một lần'}</span></div> },
    { title: 'Người nhận', dataIndex: 'assigned_to', key: 'assignee', width: 170, render: (value) => usersById[value]?.full_name || 'Không xác định' },
    { title: 'Ưu tiên', dataIndex: 'priority', key: 'priority', width: 115, render: (value) => <Tag color={priorityMeta[value]?.[1]}>{priorityMeta[value]?.[0] || value}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 145, render: (value) => <StatusTag status={value} /> },
    { title: 'Hạn hoàn thành', dataIndex: 'due_date', key: 'due', width: 155, render: (value) => formatDate(value) },
    { title: '', key: 'view', fixed: 'right', width: 58, render: (_, row) => <Button type="text" icon={<FiEye />} onClick={() => openTaskAudit(row)} aria-label="Xem chi tiết task" /> },
  ]

  const breakdownColumns = mode === 'department' ? [
    { title: 'Cấp bậc', dataIndex: 'position_name', key: 'name', render: (value) => value || 'Chưa xác định' },
    { title: 'Tổng task', dataIndex: 'total_tasks', key: 'total', width: 110 },
    { title: 'Hoàn thành', dataIndex: 'completed_tasks', key: 'completed', width: 120 },
    { title: 'Quá hạn', dataIndex: 'overdue_tasks', key: 'overdue', width: 100 },
  ] : []

  const assigneeColumns = [
    { title: 'Nhân viên', dataIndex: 'full_name', key: 'name', render: (value) => <strong>{value || 'Không xác định'}</strong> },
    { title: 'Tổng task', dataIndex: 'total_tasks', key: 'total', width: 105 },
    { title: 'Hoàn thành', dataIndex: 'completed_tasks', key: 'completed', width: 115 },
    { title: 'Quá hạn', dataIndex: 'overdue_tasks', key: 'overdue', width: 95 },
    { title: 'Lần trả lại', dataIndex: 'total_rejections', key: 'rejections', width: 105 },
  ]

  const auditTabs = audit ? [
    {
      key: 'overview', label: 'Tổng quan', children: (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Tiêu đề">{audit.task.title}</Descriptions.Item>
          <Descriptions.Item label="Mô tả">{audit.task.description || 'Không có mô tả'}</Descriptions.Item>
          <Descriptions.Item label="Người giao">{usersById[audit.task.created_by]?.full_name || audit.task.created_by}</Descriptions.Item>
          <Descriptions.Item label="Người nhận">{usersById[audit.task.assigned_to]?.full_name || audit.task.assigned_to}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái"><StatusTag status={audit.task.status} /></Descriptions.Item>
          <Descriptions.Item label="Thời hạn">{formatDate(audit.task.due_date)}</Descriptions.Item>
        </Descriptions>
      ),
    },
    { key: 'subtasks', label: `Subtask (${audit.subtasks.length})`, children: <AuditList items={audit.subtasks} empty="Không có subtask" renderItem={(item) => <><strong>{item.title}</strong><span><StatusTag status={item.status} /> · {usersById[item.assigned_to]?.full_name || 'Không xác định'}</span></>} /> },
    { key: 'submissions', label: `Kết quả (${audit.submissions.length})`, children: <AuditList items={audit.submissions} empty="Chưa có kết quả nộp" renderItem={(item) => <><strong>Lần nộp {item.attempt_number}</strong><p>{item.content}</p><span>{formatDate(item.submitted_at)}</span></>} /> },
    { key: 'comments', label: `Trao đổi (${audit.comments.length})`, children: <AuditList items={audit.comments} empty="Chưa có trao đổi" renderItem={(item) => <><strong>{usersById[item.user_id]?.full_name || 'Người dùng'}</strong><p>{item.content}</p><span>{formatDate(item.created_at)}</span></>} /> },
    { key: 'history', label: `Lịch sử (${audit.logs.length})`, children: <AuditList items={audit.logs} empty="Chưa có lịch sử" renderItem={(item) => <><strong>{item.action.replaceAll('_', ' ')}</strong><span>{formatDate(item.created_at)}</span></>} /> },
  ] : []

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><span>BÁO CÁO VẬN HÀNH</span><h1>Hiệu suất công việc</h1><p>Theo dõi kết quả theo tháng và kiểm tra chi tiết luồng task.</p></div>
      </header>

      <section className={styles.filters}>
        <Segmented value={mode} onChange={changeMode} options={[{ value: 'department', label: 'Theo phòng ban' }, { value: 'user', label: 'Theo nhân viên' }]} />
        {mode === 'department' ? (
          <Select showSearch optionFilterProp="label" value={departmentId} onChange={(value) => { setDepartmentId(value); setUserId(users.find((user) => user.department_id === value)?.id) }} placeholder="Chọn phòng ban" options={departments.map((item) => ({ value: item.id, label: item.name }))} />
        ) : (
          <Select showSearch optionFilterProp="label" value={userId} onChange={setUserId} placeholder="Chọn nhân viên" options={departmentUsers.map((item) => ({ value: item.id, label: item.full_name }))} />
        )}
        <DatePicker picker="month" value={period} onChange={(value) => value && setPeriod(value)} format="MM/YYYY" allowClear={false} />
        <Button type="primary" icon={<FiRefreshCw />} onClick={loadReport}>Xem báo cáo</Button>
      </section>

      {error && <Alert type="error" showIcon message={error} className={styles.alert} />}
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : report ? (
        <>
          <section className={styles.statGrid}>
            {statItems.map((item) => <article className={styles.statItem} key={item.label}><span data-tone={item.tone}>{item.icon}</span><div><small>{item.label}</small><strong>{item.value || 0}</strong></div></article>)}
          </section>
          <section className={styles.ratePanel}>
            <div><div><strong>Tỷ lệ hoàn thành</strong><span>{summary.completion_rate || 0}%</span></div><Progress percent={summary.completion_rate || 0} strokeColor="#206a37" showInfo={false} /></div>
            <div><div><strong>Hoàn thành đúng hạn</strong><span>{summary.on_time_rate || 0}%</span></div><Progress percent={summary.on_time_rate || 0} strokeColor="#3b82a0" showInfo={false} /></div>
            <div className={styles.miniSummary}><span>Chờ duyệt <strong>{summary.waiting_review_tasks || 0}</strong></span><span>Bị trả lại <strong>{summary.total_rejections || 0}</strong></span><span>Đã hủy <strong>{summary.cancelled_tasks || 0}</strong></span></div>
          </section>
          {mode === 'department' && (
            <>
              <section className={styles.panel}><div className={styles.panelTitle}><h2>Hiệu suất theo cấp bậc</h2><span>{report.position_breakdown?.length || 0} nhóm</span></div><Table rowKey={(row) => row.position_id || 'none'} columns={breakdownColumns} dataSource={report.position_breakdown || []} pagination={false} scroll={{ x: 560 }} locale={{ emptyText: <Empty description="Chưa có dữ liệu cấp bậc" /> }} /></section>
              <section className={styles.panel}><div className={styles.panelTitle}><h2>Hiệu suất nhân viên</h2><span>{report.assignee_breakdown?.length || 0} nhân viên</span></div><Table rowKey="user_id" columns={assigneeColumns} dataSource={report.assignee_breakdown || []} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 620 }} locale={{ emptyText: <Empty description="Chưa có dữ liệu nhân viên" /> }} /></section>
            </>
          )}
          <section className={styles.panel}><div className={styles.panelTitle}><h2>Danh sách công việc</h2><span>{tasks.length} công việc</span></div><Table rowKey="id" columns={taskColumns} dataSource={tasks} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 950 }} locale={{ emptyText: <Empty description="Không có công việc trong kỳ" /> }} /></section>
        </>
      ) : <Empty className={styles.emptyReport} description="Chọn điều kiện và xem báo cáo" />}

      <Drawer title="Chi tiết kiểm tra công việc" width={760} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {auditLoading ? <div className={styles.drawerLoading}><Spin /></div> : audit ? <Tabs items={auditTabs} /> : <Empty description="Không tải được dữ liệu task" />}
      </Drawer>
    </div>
  )
}

function AuditList({ items, empty, renderItem }) {
  if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />
  return <div className={styles.auditList}>{items.map((item) => <article key={item.id}>{renderItem(item)}</article>)}</div>
}
