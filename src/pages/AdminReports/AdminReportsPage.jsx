import {
  Alert,
  App,
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
  Tooltip,
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiActivity, FiBarChart2, FiCheckCircle, FiChevronDown, FiClock, FiDownload, FiEye, FiFile, FiRefreshCw } from 'react-icons/fi'
import { useSearchParams } from 'react-router'
import { getDepartmentsApi } from '../../api/departmentApi'
import { getDepartmentMonthlyReportApi, getUserMonthlyReportApi } from '../../api/reportApi'
import {
  downloadAttachmentApi,
  getTaskCommentsApi,
  getTaskAttachmentsApi,
  getTaskDetailApi,
  getTaskHistoryApi,
  getTaskProgressTreeApi,
  getTaskSubmissionsApi,
  getTaskSubtasksApi,
} from '../../api/taskApi'
import { getUsersApi } from '../../api/userApi'
import TaskProgressTree from '../UserTaskDetail/TaskProgressTree'
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

const formatFileSize = (value) => {
  if (!Number.isFinite(value)) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function StatusTag({ status }) {
  const [label, color] = statusMeta[status] || [status, 'default']
  return <Tag color={color}>{label}</Tag>
}

export default function AdminReportsPage() {
  const { message } = App.useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedUserId = searchParams.get('user_id')
  const [mode, setMode] = useState(
    searchParams.get('mode') === 'user' ? 'user' : 'department',
  )
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [departmentId, setDepartmentId] = useState()
  const [userId, setUserId] = useState()
  const [period, setPeriod] = useState(dayjs())
  const [report, setReport] = useState(null)
  const [taskKind, setTaskKind] = useState('ALL')
  const [taskState, setTaskState] = useState('ALL')
  const [taskPage, setTaskPage] = useState(1)
  const [expandedPanels, setExpandedPanels] = useState({
    positions: false,
    assignees: false,
    tasks: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [attachmentLoading, setAttachmentLoading] = useState(null)
  const [audit, setAudit] = useState(null)
  const taskListRef = useRef(null)

  useEffect(() => {
    Promise.all([getDepartmentsApi(), getUsersApi({ role: 'USER' })])
      .then(async ([departmentResponse, userResponse]) => {
        const departmentItems = departmentResponse.data.departments || []
        const userItems = userResponse.data.users || []
        setDepartments(departmentItems)
        setUsers(userItems)
        const firstDepartment = departmentItems.find((item) => item.is_active) || departmentItems[0]
        const firstUser = userItems.find((item) => item.is_active) || userItems[0]
        const requestedUser = userItems.find((item) => item.id === requestedUserId)
        const initialMode = requestedUser ? 'user' : 'department'
        const initialDepartment = requestedUser
          ? departmentItems.find((item) => item.id === requestedUser.department_id)
          : firstDepartment
        const initialUser = requestedUser || firstUser
        setMode(initialMode)
        setDepartmentId(initialDepartment?.id)
        setUserId(initialUser?.id)
        if (initialMode === 'user' && initialUser) {
          const response = await getUserMonthlyReportApi(
            initialUser.id,
            dayjs().year(),
            dayjs().month() + 1,
          )
          setReport(response.data.report)
        } else if (initialDepartment) {
          const response = await getDepartmentMonthlyReportApi(
            initialDepartment.id,
            dayjs().year(),
            dayjs().month() + 1,
          )
          setReport(response.data.report)
        }
      })
      .catch((err) => setError(err.response?.data?.message || 'Không thể tải dữ liệu báo cáo.'))
      .finally(() => setLoading(false))
  }, [requestedUserId])

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
      setTaskPage(1)
      setExpandedPanels({ positions: false, assignees: false, tasks: false })
      if (mode === 'user') {
        setSearchParams({ mode: 'user', user_id: targetId })
      } else {
        setSearchParams({ mode: 'department', department_id: targetId })
      }
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
    setTaskKind('ALL')
    setTaskState('ALL')
    setTaskPage(1)
    setExpandedPanels({ positions: false, assignees: false, tasks: false })
  }

  const openTaskAudit = async (task) => {
    setDrawerOpen(true)
    setAuditLoading(true)
    setAudit(null)
    try {
      const detail = await getTaskDetailApi(task.id)
      const detailTask = detail.data.task
      const progressRootId = detailTask.parent_task_id || detailTask.id
      const [subtasks, submissions, comments, history, attachments, progress] = await Promise.all([
        getTaskSubtasksApi(task.id),
        getTaskSubmissionsApi(task.id),
        getTaskCommentsApi(task.id),
        getTaskHistoryApi(task.id),
        getTaskAttachmentsApi(task.id),
        getTaskProgressTreeApi(progressRootId),
      ])
      setAudit({
        task: detailTask,
        subtasks: subtasks.data.subtasks || [],
        submissions: submissions.data.submissions || [],
        comments: comments.data.comments || [],
        logs: history.data.logs || [],
        attachments: attachments.data.attachments || [],
        progress: progress.data,
      })
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải chi tiết task.')
    } finally {
      setAuditLoading(false)
    }
  }

  const downloadAttachment = async (attachment) => {
    setAttachmentLoading(attachment.id)
    try {
      const response = await downloadAttachmentApi(attachment.id)
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.file_name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải file xuống.')
    } finally {
      setAttachmentLoading(null)
    }
  }

  const summary = report?.summary
  const totalTasks = summary?.total_tasks ?? summary?.total_assigned_tasks ?? 0
  const tasks = report?.tasks || []
  const filteredTasks = tasks.filter((task) => {
    const matchesKind = taskKind === 'ALL'
      || (taskKind === 'MAIN_TASK' && !task.parent_task_id)
      || (taskKind === 'SUBTASK' && Boolean(task.parent_task_id))
    if (!matchesKind) return false

    if (taskState === 'COMPLETED') return task.status === 'COMPLETED'
    if (taskState === 'PROCESSING') {
      return ['IN_PROGRESS', 'SUBMITTED', 'REVIEWING'].includes(task.status)
    }
    if (taskState === 'OVERDUE') {
      return task.kpi_timeline === 'OVERDUE'
        || (
          task.due_date
          && dayjs(task.due_date).isBefore(dayjs())
          && !['COMPLETED', 'CANCELLED'].includes(task.status)
        )
    }
    return true
  })
  const workItemBreakdown = report?.work_item_breakdown || {}

  const statItems = summary ? [
    { label: 'Tổng công việc', value: totalTasks, kind: 'ALL', state: 'ALL', icon: <FiBarChart2 />, tone: 'neutral' },
    { label: 'Đã hoàn thành', value: summary.completed_tasks, kind: 'ALL', state: 'COMPLETED', icon: <FiCheckCircle />, tone: 'success' },
    { label: 'Đang xử lý', value: (summary.in_progress_tasks || 0) + (summary.submitted_tasks || 0) + (summary.reviewing_tasks || 0), kind: 'ALL', state: 'PROCESSING', icon: <FiActivity />, tone: 'info' },
    { label: 'Quá hạn', value: summary.overdue_tasks, kind: 'ALL', state: 'OVERDUE', icon: <FiClock />, tone: 'danger' },
  ] : []

  const showTaskList = (kind, state) => {
    setTaskKind(kind)
    setTaskState(state)
    setTaskPage(1)
    setExpandedPanels((current) => ({ ...current, tasks: true }))
    window.requestAnimationFrame(() => {
      taskListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const togglePanel = (panel) => {
    setExpandedPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }))
  }

  const taskColumns = [
    { title: 'Công việc', dataIndex: 'title', key: 'title', width: 280, render: (value, row) => <div className={styles.taskName}><strong>{value}</strong><span><Tag color={row.parent_task_id ? 'blue' : 'green'}>{row.parent_task_id ? 'Subtask' : 'Task chính'}</Tag>{row.task_type === 'RECURRING' ? 'Định kỳ' : 'Một lần'}</span></div> },
    { title: 'Người nhận', dataIndex: 'assigned_to', key: 'assignee', width: 170, render: (value) => usersById[value]?.full_name || 'Không xác định' },
    { title: 'Ưu tiên', dataIndex: 'priority', key: 'priority', width: 115, render: (value) => <Tag color={priorityMeta[value]?.[1]}>{priorityMeta[value]?.[0] || value}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 145, render: (value) => <StatusTag status={value} /> },
    { title: 'Hạn hoàn thành', dataIndex: 'due_date', key: 'due', width: 155, render: (value) => formatDate(value) },
    { title: '', key: 'view', fixed: 'right', width: 58, render: (_, row) => <Button type="text" icon={<FiEye />} onClick={() => openTaskAudit(row)} aria-label="Xem chi tiết task" /> },
  ]

  const breakdownColumns = mode === 'department' ? [
    { title: 'Cấp bậc', dataIndex: 'position_name', key: 'name', render: (value) => value || 'Chưa xác định' },
    { title: 'Tổng task', dataIndex: 'total_tasks', key: 'total', width: 110 },
    { title: 'Task chính', dataIndex: 'main_task_count', key: 'main', width: 105 },
    { title: 'Subtask', dataIndex: 'subtask_count', key: 'subtask', width: 95 },
    { title: 'Hoàn thành', dataIndex: 'completed_tasks', key: 'completed', width: 120 },
    { title: 'Quá hạn', dataIndex: 'overdue_tasks', key: 'overdue', width: 100 },
  ] : []

  const assigneeColumns = [
    { title: 'Nhân viên', dataIndex: 'full_name', key: 'name', render: (value) => <strong>{value || 'Không xác định'}</strong> },
    { title: 'Tổng task', dataIndex: 'total_tasks', key: 'total', width: 105 },
    { title: 'Task chính', dataIndex: 'main_task_count', key: 'main', width: 105 },
    { title: 'Subtask', dataIndex: 'subtask_count', key: 'subtask', width: 95 },
    { title: 'Hoàn thành', dataIndex: 'completed_tasks', key: 'completed', width: 115 },
    { title: 'Quá hạn', dataIndex: 'overdue_tasks', key: 'overdue', width: 95 },
    { title: 'Lần trả lại', dataIndex: 'total_rejections', key: 'rejections', width: 105 },
  ]

  const taskAttachments = audit?.attachments?.filter(
    (attachment) => !attachment.submission_id,
  ) || []
  const attachmentsBySubmission = (audit?.attachments || []).reduce(
    (groups, attachment) => {
      if (!attachment.submission_id) return groups
      if (!groups[attachment.submission_id]) {
        groups[attachment.submission_id] = []
      }
      groups[attachment.submission_id].push(attachment)
      return groups
    },
    {},
  )

  const auditTabs = audit ? [
    {
      key: 'overview', label: 'Tổng quan', children: (
        <div className={styles.auditOverview}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Tiêu đề">{audit.task.title}</Descriptions.Item>
            <Descriptions.Item label="Mô tả">{audit.task.description || 'Không có mô tả'}</Descriptions.Item>
            <Descriptions.Item label="Người giao">{usersById[audit.task.created_by]?.full_name || audit.task.created_by}</Descriptions.Item>
            <Descriptions.Item label="Người nhận">{usersById[audit.task.assigned_to]?.full_name || audit.task.assigned_to}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><StatusTag status={audit.task.status} /></Descriptions.Item>
            <Descriptions.Item label="Thời hạn">{formatDate(audit.task.due_date)}</Descriptions.Item>
          </Descriptions>
          <AuditAttachmentList
            title="Tệp yêu cầu"
            items={taskAttachments}
            empty="Task không có tệp yêu cầu"
            loadingId={attachmentLoading}
            onDownload={downloadAttachment}
          />
        </div>
      ),
    },
    {
      key: 'progress',
      label: 'Cây tiến độ',
      children: (
        <TaskProgressTree
          data={audit.progress}
          loading={false}
          onOpenTask={(taskId) => openTaskAudit({ id: taskId })}
        />
      ),
    },
    { key: 'subtasks', label: `Subtask (${audit.subtasks.length})`, children: <AuditList items={audit.subtasks} empty="Không có subtask" renderItem={(item) => <><strong>{item.title}</strong><span><StatusTag status={item.status} /> · {usersById[item.assigned_to]?.full_name || 'Không xác định'}</span></>} /> },
    {
      key: 'submissions',
      label: `Kết quả (${audit.submissions.length})`,
      children: (
        <AuditList
          items={audit.submissions}
          empty="Chưa có kết quả nộp"
          renderItem={(item) => {
            const submissionAttachments = attachmentsBySubmission[item.id] || []
            return (
              <>
                <strong>Lần nộp {item.attempt_number}</strong>
                <p>{item.content}</p>
                <span>{formatDate(item.submitted_at)}</span>
                {submissionAttachments.length > 0 && (
                  <AuditAttachmentList
                    title="Tệp kết quả"
                    items={submissionAttachments}
                    loadingId={attachmentLoading}
                    onDownload={downloadAttachment}
                  />
                )}
              </>
            )
          }}
        />
      ),
    },
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

      {error && <Alert type="error" showIcon title={error} className={styles.alert} />}
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : report ? (
        <>
          <section className={styles.statGrid}>
            {statItems.map((item) => (
              <button
                type="button"
                className={styles.statItem}
                key={item.label}
                onClick={() => showTaskList(item.kind, item.state)}
                aria-label={`Xem ${item.label.toLocaleLowerCase('vi')}`}
              >
                <span data-tone={item.tone}>{item.icon}</span>
                <div><small>{item.label}</small><strong>{item.value || 0}</strong></div>
              </button>
            ))}
          </section>
          <section className={styles.typeSummary}>
            <article>
              <div><strong>Task chính</strong><span>{workItemBreakdown.main_tasks?.total_tasks || 0} công việc</span></div>
              <p><button type="button" onClick={() => showTaskList('MAIN_TASK', 'COMPLETED')}>Hoàn thành <strong>{workItemBreakdown.main_tasks?.completed_tasks || 0}</strong></button><button type="button" onClick={() => showTaskList('MAIN_TASK', 'OVERDUE')}>Quá hạn <strong>{workItemBreakdown.main_tasks?.overdue_tasks || 0}</strong></button><span>Tỷ lệ <strong>{workItemBreakdown.main_tasks?.completion_rate || 0}%</strong></span></p>
            </article>
            <article>
              <div><strong>Subtask</strong><span>{workItemBreakdown.subtasks?.total_tasks || 0} công việc</span></div>
              <p><button type="button" onClick={() => showTaskList('SUBTASK', 'COMPLETED')}>Hoàn thành <strong>{workItemBreakdown.subtasks?.completed_tasks || 0}</strong></button><button type="button" onClick={() => showTaskList('SUBTASK', 'OVERDUE')}>Quá hạn <strong>{workItemBreakdown.subtasks?.overdue_tasks || 0}</strong></button><span>Tỷ lệ <strong>{workItemBreakdown.subtasks?.completion_rate || 0}%</strong></span></p>
            </article>
          </section>
          <section className={styles.ratePanel}>
            <div><div><strong>Tỷ lệ hoàn thành</strong><span>{summary.completion_rate || 0}%</span></div><Progress percent={summary.completion_rate || 0} strokeColor="#206a37" showInfo={false} /></div>
            <div><div><strong>Hoàn thành đúng hạn</strong><span>{summary.on_time_rate || 0}%</span></div><Progress percent={summary.on_time_rate || 0} strokeColor="#3b82a0" showInfo={false} /></div>
            <div className={styles.miniSummary}><span>Chờ duyệt <strong>{summary.waiting_review_tasks || 0}</strong></span><span>Bị trả lại <strong>{summary.total_rejections || 0}</strong></span><span>Đã hủy <strong>{summary.cancelled_tasks || 0}</strong></span></div>
          </section>
          {mode === 'department' && (
            <>
              <ReportPanel
                id="position-performance"
                title="Hiệu suất theo cấp bậc"
                count={`${report.position_breakdown?.length || 0} nhóm`}
                open={expandedPanels.positions}
                onToggle={() => togglePanel('positions')}
              >
                <Table rowKey={(row) => row.position_id || 'none'} columns={breakdownColumns} dataSource={report.position_breakdown || []} pagination={false} scroll={{ x: 560 }} locale={{ emptyText: <Empty description="Chưa có dữ liệu cấp bậc" /> }} />
              </ReportPanel>
              <ReportPanel
                id="employee-performance"
                title="Hiệu suất nhân viên"
                count={`${report.assignee_breakdown?.length || 0} nhân viên`}
                open={expandedPanels.assignees}
                onToggle={() => togglePanel('assignees')}
              >
                <Table rowKey="user_id" columns={assigneeColumns} dataSource={report.assignee_breakdown || []} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 620 }} locale={{ emptyText: <Empty description="Chưa có dữ liệu nhân viên" /> }} />
              </ReportPanel>
            </>
          )}
          <ReportPanel
            id="task-list"
            title="Danh sách công việc"
            count={`${filteredTasks.length} công việc`}
            open={expandedPanels.tasks}
            onToggle={() => togglePanel('tasks')}
            panelRef={taskListRef}
          >
            <div className={styles.panelTools}>
              <Segmented size="small" value={taskKind} onChange={(value) => { setTaskKind(value); setTaskPage(1) }} options={[{ value: 'ALL', label: 'Tất cả' }, { value: 'MAIN_TASK', label: 'Task chính' }, { value: 'SUBTASK', label: 'Subtask' }]} />
              <Select size="small" value={taskState} onChange={(value) => { setTaskState(value); setTaskPage(1) }} aria-label="Lọc trạng thái công việc" options={[{ value: 'ALL', label: 'Tất cả trạng thái' }, { value: 'COMPLETED', label: 'Đã hoàn thành' }, { value: 'PROCESSING', label: 'Đang xử lý' }, { value: 'OVERDUE', label: 'Quá hạn' }]} />
            </div>
            <Table rowKey="id" columns={taskColumns} dataSource={filteredTasks} pagination={{ current: taskPage, pageSize: 8, showSizeChanger: false, onChange: setTaskPage }} scroll={{ x: 1160 }} locale={{ emptyText: <Empty description="Không có công việc phù hợp" /> }} />
          </ReportPanel>
        </>
      ) : <Empty className={styles.emptyReport} description="Chọn điều kiện và xem báo cáo" />}

      <Drawer title="Chi tiết kiểm tra công việc" size={760} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {auditLoading ? <div className={styles.drawerLoading}><Spin /></div> : audit ? <Tabs items={auditTabs} /> : <Empty description="Không tải được dữ liệu task" />}
      </Drawer>
    </div>
  )
}

function ReportPanel({ id, title, count, open, onToggle, panelRef, children }) {
  return (
    <section className={styles.panel} ref={panelRef}>
      <button
        type="button"
        className={styles.panelToggle}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-content`}
        aria-label={`${open ? 'Thu gọn' : 'Mở'} ${title}`}
      >
        <h2>{title}</h2>
        <span>
          {count}
          <FiChevronDown className={open ? styles.chevronOpen : ''} />
        </span>
      </button>
      {open && (
        <div className={styles.panelContent} id={`${id}-content`}>
          {children}
        </div>
      )}
    </section>
  )
}

function AuditList({ items, empty, renderItem }) {
  if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />
  return <div className={styles.auditList}>{items.map((item) => <article key={item.id}>{renderItem(item)}</article>)}</div>
}

function AuditAttachmentList({ title, items, empty, loadingId, onDownload }) {
  return (
    <section className={styles.auditFiles}>
      <header>
        <FiFile />
        <strong>{title} ({items.length})</strong>
      </header>
      {!items.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={empty || 'Không có tệp đính kèm'}
        />
      ) : (
        <div className={styles.auditFileList}>
          {items.map((attachment) => (
            <div className={styles.auditFile} key={attachment.id}>
              <span><FiFile /></span>
              <div>
                <strong title={attachment.file_name}>{attachment.file_name}</strong>
                <small>
                  {formatFileSize(attachment.file_size)} · {formatDate(attachment.created_at)}
                </small>
              </div>
              <Tooltip title="Tải file">
                <Button
                  type="text"
                  icon={<FiDownload />}
                  loading={loadingId === attachment.id}
                  onClick={() => onDownload(attachment)}
                  aria-label={`Tải ${attachment.file_name}`}
                />
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
