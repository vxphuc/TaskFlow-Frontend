import { Alert, Button, DatePicker, Empty, Form, Input, Modal, Select, Skeleton, Space } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiArrowRight,
  FiCornerDownRight,
  FiHelpCircle,
  FiPlus,
  FiSend,
  FiUser,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { createTaskApi, getMyCreatedTasksApi } from '../../api/taskApi'
import { getUsersApi } from '../../api/userApi'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import { formatDateTime, getPriorityLabel, getStatusLabel, priorityOptions, taskStatuses } from '../../utils/task'
import styles from './UserCreatedTasksPage.module.css'

export default function UserCreatedTasksPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [tasks, setTasks] = useState(null)
  const [createdSubtasks, setCreatedSubtasks] = useState([])
  const [assignees, setAssignees] = useState([])
  const [status, setStatus] = useState()
  const [priority, setPriority] = useState()
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setError('')
    try {
      const [tasksRes, usersRes] = await Promise.all([
        getMyCreatedTasksApi({ status, priority }),
        getUsersApi({ is_active: true }),
      ])
      setTasks(tasksRes.data.tasks || [])
      setCreatedSubtasks(tasksRes.data.created_subtasks || [])
      setAssignees(usersRes.data.users || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu giao việc.')
    }
  }, [status, priority])

  useEffect(() => {
    Promise.resolve().then(loadData)
  }, [loadData])

  useRealtimeRefresh(loadData, 'task')

  const assigneesById = useMemo(
    () => Object.fromEntries(assignees.map((item) => [item.id, item])),
    [assignees],
  )

  const createTask = async (values) => {
    setSubmitting(true)
    try {
      const response = await createTaskApi({
        ...values,
        due_date: values.due_date?.toISOString(),
      })
      setModalOpen(false)
      form.resetFields()
      await loadData()
      navigate(`/app/tasks/${response.data.task.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo task.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>QUẢN LÝ GIAO VIỆC</span>
          <h1>Việc tôi giao</h1>
          <p>Theo dõi công việc đã giao cho các cấp dưới trong phòng ban.</p>
        </div>
        <Space wrap>
          <Button
            icon={<FiHelpCircle />}
            onClick={() => navigate('/app/guide#create-task')}
          >
            Hướng dẫn
          </Button>
          <Button type="primary" icon={<FiPlus />} onClick={() => setModalOpen(true)}>
            Giao công việc
          </Button>
        </Space>
      </header>

      <section className={styles.toolbar}>
        <div className={styles.summary}>
          <FiSend />
          <strong>{tasks?.length || 0}</strong>
          <span>task chính · {createdSubtasks.length} subtask bạn đã giao</span>
        </div>
        <div className={styles.filters}>
          <Select allowClear placeholder="Tất cả trạng thái" options={taskStatuses} value={status} onChange={setStatus} />
          <Select allowClear placeholder="Mọi mức ưu tiên" options={priorityOptions} value={priority} onChange={setPriority} />
        </div>
      </section>

      {error && <Alert type="error" showIcon message={error} className={styles.alert} closable onClose={() => setError('')} />}
      {!tasks ? <Skeleton active paragraph={{ rows: 8 }} /> : tasks.length === 0 && createdSubtasks.length === 0 ? (
        <section className={styles.empty}>
          <Empty description="Bạn chưa giao công việc nào">
            <Button type="primary" icon={<FiPlus />} onClick={() => setModalOpen(true)}>Tạo task đầu tiên</Button>
          </Empty>
        </section>
      ) : (
        <>
          {tasks.length > 0 && (
            <section className={styles.taskGrid}>
              {tasks.map((task) => (
                <article key={task.id} className={styles.taskCard}>
              <button
                type="button"
                className={styles.taskMain}
                onClick={() => navigate(`/app/tasks/${task.id}`)}
              >
                <span className={styles.cardTop}>
                  <span className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`}>{getPriorityLabel(task.priority)}</span>
                  <span className={`${styles.status} ${styles[task.status.toLowerCase()]}`}>{getStatusLabel(task.status)}</span>
                </span>
                <strong className={styles.title}>{task.title}</strong>
                <span className={styles.description}>{task.description || 'Không có mô tả công việc.'}</span>
                <span className={styles.people}>
                  <span><FiUser /> Người thực hiện: <b>{task.assigned_to_name || 'Chưa xác định'}</b></span>
                </span>
                <span className={styles.cardBottom}>
                  <small>Hạn {formatDateTime(task.due_date)}</small><FiArrowRight />
                </span>
              </button>

              <div className={styles.subtasks}>
                <div className={styles.subtaskHeader}>
                  <span>Subtask đã giao</span>
                  <strong>{task.subtasks?.length || 0}</strong>
                </div>
                {!task.subtasks?.length ? (
                  <span className={styles.noSubtask}>Chưa có subtask</span>
                ) : (
                  <div className={styles.subtaskList}>
                    {task.subtasks.map((subtask) => (
                      <button
                        type="button"
                        key={subtask.id}
                        onClick={() => navigate(`/app/tasks/${subtask.id}`)}
                      >
                        <FiCornerDownRight />
                        <span>
                          <strong>{subtask.title}</strong>
                          <small>
                            <FiUser />
                            Người thực hiện: {subtask.assigned_to_name || assigneesById[subtask.assigned_to]?.full_name || 'Chưa xác định'}
                          </small>
                          <small>
                            Hạn {formatDateTime(subtask.due_date)}
                          </small>
                        </span>
                        <span className={`${styles.status} ${styles[subtask.status.toLowerCase()]}`}>
                          {getStatusLabel(subtask.status)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
                </article>
              ))}
            </section>
          )}

          <section className={styles.createdSubtasks}>
            <div className={styles.createdSubtaskHeader}>
              <div>
                <span>SUBTASK TÔI GIAO</span>
                <h2>Danh sách công việc con</h2>
              </div>
              <strong>{createdSubtasks.length}</strong>
            </div>
            {createdSubtasks.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa giao subtask nào" />
            ) : (
              <div className={`${styles.subtaskList} ${styles.createdSubtaskList}`}>
                {createdSubtasks.map((subtask) => (
                  <button
                    type="button"
                    key={subtask.id}
                    onClick={() => navigate(`/app/tasks/${subtask.id}`)}
                  >
                    <FiCornerDownRight />
                    <span>
                      <strong>{subtask.title}</strong>
                      <small>
                        <FiUser />
                        Người thực hiện: {subtask.assigned_to_name || assigneesById[subtask.assigned_to]?.full_name || 'Chưa xác định'}
                      </small>
                      <small>
                        {subtask.parent_task_title || 'Task chính'}
                        {' · '}
                        Hạn {formatDateTime(subtask.due_date)}
                      </small>
                    </span>
                    <span className={`${styles.status} ${styles[subtask.status.toLowerCase()]}`}>
                      {getStatusLabel(subtask.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Modal
        title="Giao công việc mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={createTask} initialValues={{ priority: 'MEDIUM' }}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề công việc' }, { max: 200 }]}>
            <Input placeholder="Ví dụ: Hoàn thiện báo cáo tháng" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={4} placeholder="Mục tiêu, yêu cầu và kết quả mong đợi" />
          </Form.Item>
          <Form.Item name="assigned_to" label="Người thực hiện" rules={[{ required: true, message: 'Chọn người thực hiện' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={assignees.length ? 'Chọn nhân sự cấp dưới' : 'Không có nhân sự phù hợp'}
              options={assignees.map((user) => ({ value: user.id, label: `${user.full_name} · ${user.phone}` }))}
            />
          </Form.Item>
          <div className={styles.formGrid}>
            <Form.Item name="priority" label="Ưu tiên">
              <Select options={priorityOptions} />
            </Form.Item>
            <Form.Item name="due_date" label="Deadline">
              <DatePicker showTime format="DD/MM/YYYY HH:mm" placeholder="Chọn thời hạn" />
            </Form.Item>
          </div>
          <div className={styles.modalActions}>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={!assignees.length}>Giao task</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
