import { Alert, Button, Empty, Segmented, Select, Skeleton, Tag } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiArrowRight, FiCornerDownRight, FiInbox, FiRefreshCw } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import {
  getMyAssignedSubtasksApi,
  getMyAssignedTasksApi,
} from '../../api/taskApi'
import {
  formatDateTime,
  formatRelativeDeadline,
  getPriorityLabel,
  getStatusLabel,
  priorityOptions,
  taskStatuses,
} from '../../utils/task'
import styles from './UserAssignedTasksPage.module.css'

export default function UserAssignedTasksPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState(null)
  const [status, setStatus] = useState()
  const [priority, setPriority] = useState()
  const [taskKind, setTaskKind] = useState('ALL')
  const [error, setError] = useState('')

  const loadTasks = useCallback(async () => {
    setError('')
    try {
      const [taskResponse, subtaskResponse] = await Promise.all([
        getMyAssignedTasksApi({ status, priority }),
        getMyAssignedSubtasksApi({ status, priority }),
      ])
      setTasks([
        ...(taskResponse.data.tasks || []).map((task) => ({
          ...task,
          item_kind: 'TASK',
        })),
        ...(subtaskResponse.data.subtasks || []).map((task) => ({
          ...task,
          item_kind: 'SUBTASK',
        })),
      ].sort((left, right) => new Date(right.created_at) - new Date(left.created_at)))
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách công việc.')
    }
  }, [status, priority])

  useEffect(() => {
    Promise.resolve().then(loadTasks)
  }, [loadTasks])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadTasks()
    }, 10000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadTasks()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadTasks])

  const counts = useMemo(() => ({
    all: tasks?.length || 0,
    active: tasks?.filter((task) => ['TODO', 'IN_PROGRESS', 'REJECTED'].includes(task.status)).length || 0,
    subtasks: tasks?.filter((task) => task.item_kind === 'SUBTASK').length || 0,
  }), [tasks])

  const visibleTasks = useMemo(
    () => tasks?.filter(
      (task) => taskKind === 'ALL' || task.item_kind === taskKind,
    ) || [],
    [taskKind, tasks],
  )

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>CÔNG VIỆC CỦA TÔI</span>
          <h1>Việc được giao</h1>
          <p>Theo dõi tiến độ, deadline và gửi kết quả công việc.</p>
        </div>
        <Button icon={<FiRefreshCw />} onClick={loadTasks}>Làm mới</Button>
      </header>

      <section className={styles.toolbar}>
        <div className={styles.summary}>
          <FiInbox />
          <strong>{counts.active}</strong>
          <span>việc cần xử lý · {counts.subtasks} subtask</span>
        </div>
        <div className={styles.filters}>
          <Segmented
            value={taskKind}
            onChange={setTaskKind}
            options={[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'TASK', label: 'Task chính' },
              { value: 'SUBTASK', label: 'Subtask' },
            ]}
          />
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            options={taskStatuses}
            value={status}
            onChange={setStatus}
          />
          <Select
            allowClear
            placeholder="Mọi mức ưu tiên"
            options={priorityOptions}
            value={priority}
            onChange={setPriority}
          />
        </div>
      </section>

      {error && <Alert type="error" showIcon message={error} className={styles.alert} />}
      {!tasks ? <Skeleton active paragraph={{ rows: 8 }} /> : visibleTasks.length === 0 ? (
        <section className={styles.empty}><Empty description="Không có công việc phù hợp" /></section>
      ) : (
        <section className={styles.taskList}>
          <div className={styles.listHeader}>
            <span>Công việc</span><span>Trạng thái</span><span>Deadline</span><span />
          </div>
          {visibleTasks.map((task) => (
            <button
              type="button"
              key={task.id}
              className={styles.taskRow}
              onClick={() => navigate(`/app/tasks/${task.id}`)}
            >
              <span className={styles.taskMain}>
                <span className={`${styles.priorityBar} ${styles[task.priority.toLowerCase()]}`} />
                <span>
                  <strong>{task.title}</strong>
                  <small className={styles.meta}>
                    {task.item_kind === 'SUBTASK' ? (
                      <>
                        <Tag color="blue" bordered={false}>Subtask</Tag>
                        <FiCornerDownRight />
                        {task.parent_task_title || 'Task chính'}
                      </>
                    ) : (
                      <>
                        <Tag color="green" bordered={false}>Task chính</Tag>
                        {getPriorityLabel(task.priority)}
                      </>
                    )}
                  </small>
                </span>
              </span>
              <span className={`${styles.status} ${styles[task.status.toLowerCase()]}`}>
                {getStatusLabel(task.status)}
              </span>
              <span className={styles.deadline}>
                <strong>{formatDateTime(task.due_date)}</strong>
                <small>{formatRelativeDeadline(task.due_date)}</small>
              </span>
              <FiArrowRight className={styles.arrow} />
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
