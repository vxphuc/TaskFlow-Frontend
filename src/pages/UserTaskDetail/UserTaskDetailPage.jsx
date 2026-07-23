import {
  Alert,
  Avatar,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Skeleton,
  Tabs,
  Timeline,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiMessageSquare,
  FiPlay,
  FiRotateCcw,
  FiSend,
  FiSlash,
  FiX,
} from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import {
  approveSubmissionApi,
  cancelTaskApi,
  createTaskCommentApi,
  getTaskCommentsApi,
  getTaskDetailApi,
  getTaskHistoryApi,
  getTaskSubmissionsApi,
  getTaskSubtasksApi,
  rejectSubmissionApi,
  startSubmissionReviewApi,
  startTaskApi,
  submitTaskApi,
  updateTaskDeadlineApi,
  withdrawSubmissionApi,
} from '../../api/taskApi'
import { useAuth } from '../../contexts/useAuth'
import {
  formatDateTime,
  getPriorityLabel,
  getStatusLabel,
  isTaskOpen,
} from '../../utils/task'
import styles from './UserTaskDetailPage.module.css'

const actionLabels = {
  TASK_CREATED: 'Đã tạo công việc',
  TASK_STARTED: 'Đã bắt đầu thực hiện',
  TASK_SUBMITTED: 'Đã gửi kết quả',
  SUBMISSION_WITHDRAWN: 'Đã thu hồi kết quả',
  TASK_REVIEW_STARTED: 'Đã bắt đầu duyệt',
  TASK_APPROVED: 'Đã duyệt hoàn thành',
  TASK_REJECTED: 'Đã yêu cầu làm lại',
  TASK_DEADLINE_CHANGED: 'Đã thay đổi deadline',
  TASK_CANCELLED: 'Đã hủy công việc',
  COMMENT_CREATED: 'Đã gửi trao đổi',
  SUBTASK_CREATED: 'Đã tạo công việc con',
}

export default function UserTaskDetailPage() {
  const { taskId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [commentForm] = Form.useForm()
  const [actionForm] = Form.useForm()
  const [task, setTask] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [comments, setComments] = useState([])
  const [subtasks, setSubtasks] = useState([])
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionModal, setActionModal] = useState(null)

  const loadDetail = useCallback(async () => {
    setError('')
    try {
      const [taskRes, submissionsRes, commentsRes, subtasksRes, historyRes] = await Promise.all([
        getTaskDetailApi(taskId),
        getTaskSubmissionsApi(taskId),
        getTaskCommentsApi(taskId),
        getTaskSubtasksApi(taskId),
        getTaskHistoryApi(taskId),
      ])
      setTask(taskRes.data.task)
      setSubmissions(submissionsRes.data.submissions || [])
      setComments(commentsRes.data.comments || [])
      setSubtasks(subtasksRes.data.subtasks || [])
      setHistory(historyRes.data.logs || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải chi tiết công việc.')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    Promise.resolve().then(loadDetail)
  }, [loadDetail])

  const isAssignee = task?.assigned_to === user.id
  const isCreator = task?.created_by === user.id
  const latestSubmission = submissions.at(-1)

  const runAction = useCallback(async (callback) => {
    setActionLoading(true)
    setError('')
    try {
      await callback()
      setActionModal(null)
      actionForm.resetFields()
      await loadDetail()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể thực hiện thao tác.')
    } finally {
      setActionLoading(false)
    }
  }, [actionForm, loadDetail])

  const submitActionModal = (values) => {
    if (actionModal === 'submit') {
      return runAction(() => submitTaskApi(taskId, { content: values.content }))
    }
    if (actionModal === 'withdraw') {
      return runAction(() => withdrawSubmissionApi(latestSubmission.id, { reason: values.reason }))
    }
    if (actionModal === 'reject') {
      return runAction(() => rejectSubmissionApi(latestSubmission.id, { comment: values.reason }))
    }
    if (actionModal === 'approve') {
      return runAction(() => approveSubmissionApi(latestSubmission.id, { comment: values.reason }))
    }
    if (actionModal === 'deadline') {
      return runAction(() => updateTaskDeadlineApi(taskId, { due_date: values.due_date.toISOString() }))
    }
    if (actionModal === 'cancel') {
      return runAction(() => cancelTaskApi(taskId, { reason: values.reason }))
    }
  }

  const sendComment = async ({ content }) => {
    await runAction(() => createTaskCommentApi(taskId, { content }))
    commentForm.resetFields()
  }

  const actions = useMemo(() => {
    if (!task) return []
    const items = []
    if (isAssignee && ['TODO', 'REJECTED'].includes(task.status)) {
      items.push({ key: 'start', label: 'Bắt đầu', icon: <FiPlay />, primary: true, run: () => runAction(() => startTaskApi(taskId)) })
    }
    if (isAssignee && ['IN_PROGRESS', 'REJECTED'].includes(task.status)) {
      items.push({ key: 'submit', label: 'Gửi kết quả', icon: <FiSend />, primary: true, modal: 'submit' })
    }
    if (isAssignee && task.status === 'SUBMITTED' && latestSubmission && !latestSubmission.is_withdrawn) {
      items.push({ key: 'withdraw', label: 'Thu hồi kết quả', icon: <FiRotateCcw />, modal: 'withdraw' })
    }
    if (isCreator && task.status === 'SUBMITTED' && latestSubmission) {
      items.push({ key: 'review', label: 'Bắt đầu duyệt', icon: <FiClock />, primary: true, run: () => runAction(() => startSubmissionReviewApi(latestSubmission.id)) })
    }
    if (isCreator && task.status === 'REVIEWING' && latestSubmission) {
      items.push({ key: 'approve', label: 'Duyệt hoàn thành', icon: <FiCheck />, primary: true, modal: 'approve' })
      items.push({ key: 'reject', label: 'Yêu cầu làm lại', icon: <FiX />, danger: true, modal: 'reject' })
    }
    if (isCreator && isTaskOpen(task.status)) {
      items.push({ key: 'deadline', label: 'Đổi deadline', icon: <FiCalendar />, modal: 'deadline' })
      items.push({ key: 'cancel', label: 'Hủy task', icon: <FiSlash />, danger: true, modal: 'cancel' })
    }
    return items
  }, [task, isAssignee, isCreator, latestSubmission, taskId, runAction])

  if (loading) return <div className={styles.page}><Skeleton active paragraph={{ rows: 12 }} /></div>

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <FiArrowLeft /> Quay lại danh sách
      </button>
      {error && <Alert type="error" showIcon message={error} className={styles.alert} closable onClose={() => setError('')} />}
      {!task ? <Empty description="Không tìm thấy công việc" /> : (
        <>
          <header className={styles.hero}>
            <div className={styles.heroMain}>
              <div className={styles.badges}>
                <span className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`}>{getPriorityLabel(task.priority)}</span>
                <span className={`${styles.status} ${styles[task.status.toLowerCase()]}`}>{getStatusLabel(task.status)}</span>
              </div>
              <h1>{task.title}</h1>
              <p>{task.description || 'Không có mô tả chi tiết cho công việc này.'}</p>
            </div>
            <div className={styles.actions}>
              {actions.map((action) => (
                <Button
                  key={action.key}
                  type={action.primary ? 'primary' : 'default'}
                  danger={action.danger}
                  icon={action.icon}
                  loading={actionLoading}
                  onClick={() => action.run ? action.run() : setActionModal(action.modal)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </header>

          <section className={styles.metaGrid}>
            <div><span>Vai trò của bạn</span><strong>{isCreator ? 'Người giao việc' : 'Người thực hiện'}</strong></div>
            <div><span>Ngày giao</span><strong>{formatDateTime(task.assigned_at)}</strong></div>
            <div><span>Deadline hiện tại</span><strong>{formatDateTime(task.due_date)}</strong></div>
            <div><span>Ngày hoàn thành</span><strong>{formatDateTime(task.completed_at)}</strong></div>
          </section>

          <section className={styles.workspace}>
            <Tabs
              items={[
                {
                  key: 'submissions',
                  label: `Kết quả (${submissions.length})`,
                  children: (
                    <div className={styles.submissionList}>
                      {submissions.length === 0 ? <Empty description="Chưa có kết quả được gửi" /> : submissions.map((submission) => (
                        <article key={submission.id} className={`${styles.submission} ${submission.is_withdrawn ? styles.withdrawn : ''}`}>
                          <div className={styles.submissionHead}>
                            <strong>Lần gửi #{submission.attempt_number}</strong>
                            <span>{submission.is_withdrawn ? 'Đã thu hồi' : 'Đã gửi'} · {formatDateTime(submission.submitted_at)}</span>
                          </div>
                          <p>{submission.content}</p>
                          {submission.withdrawal_reason && <small>Lý do thu hồi: {submission.withdrawal_reason}</small>}
                        </article>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'comments',
                  label: `Trao đổi (${comments.length})`,
                  children: (
                    <div className={styles.comments}>
                      <div className={styles.commentList}>
                        {comments.length === 0 ? <Empty description="Chưa có trao đổi" /> : comments.map((comment) => {
                          const mine = comment.user_id === user.id
                          const author = mine ? 'Bạn' : comment.user_id === task.created_by ? 'Người giao việc' : 'Người thực hiện'
                          return (
                            <article key={comment.id} className={`${styles.comment} ${mine ? styles.mine : ''}`}>
                              <Avatar size={34}>{author.charAt(0)}</Avatar>
                              <div><strong>{author}</strong><p>{comment.content}</p><time>{formatDateTime(comment.created_at)}</time></div>
                            </article>
                          )
                        })}
                      </div>
                      <Form form={commentForm} className={styles.commentForm} onFinish={sendComment}>
                        <Form.Item name="content" rules={[{ required: true, message: 'Nhập nội dung trao đổi' }]}>
                          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="Trao đổi về yêu cầu, kết quả hoặc deadline..." />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" icon={<FiMessageSquare />} loading={actionLoading}>Gửi trao đổi</Button>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: 'subtasks',
                  label: `Công việc con (${subtasks.length})`,
                  children: subtasks.length === 0 ? <Empty description="Chưa có công việc con" /> : (
                    <div className={styles.subtaskList}>
                      {subtasks.map((subtask) => (
                        <button type="button" key={subtask.id} onClick={() => navigate(`/app/tasks/${subtask.id}`)}>
                          <span><strong>{subtask.title}</strong><small>Hạn {formatDateTime(subtask.due_date)}</small></span>
                          <span className={`${styles.status} ${styles[subtask.status.toLowerCase()]}`}>{getStatusLabel(subtask.status)}</span>
                          <FiArrowLeft className={styles.openIcon} />
                        </button>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'history',
                  label: 'Lịch sử',
                  children: (
                    <Timeline
                      className={styles.timeline}
                      items={history.map((log) => ({
                        color: log.action === 'TASK_CANCELLED' || log.action === 'TASK_REJECTED' ? 'red' : 'green',
                        children: <div><strong>{actionLabels[log.action] || log.action}</strong><small>{formatDateTime(log.created_at)}</small></div>,
                      }))}
                    />
                  ),
                },
              ]}
            />
          </section>
        </>
      )}

      <Modal
        title={{
          submit: 'Gửi kết quả công việc',
          withdraw: 'Thu hồi kết quả',
          approve: 'Duyệt hoàn thành',
          reject: 'Yêu cầu làm lại',
          deadline: 'Thay đổi deadline',
          cancel: 'Hủy công việc',
        }[actionModal]}
        open={Boolean(actionModal)}
        onCancel={() => { setActionModal(null); actionForm.resetFields() }}
        footer={null}
        destroyOnHidden
      >
        <Form form={actionForm} layout="vertical" onFinish={submitActionModal}>
          {actionModal === 'submit' && (
            <Form.Item name="content" label="Nội dung kết quả" rules={[{ required: true, message: 'Nhập nội dung kết quả' }]}>
              <Input.TextArea rows={5} placeholder="Mô tả kết quả đã hoàn thành, đường dẫn tài liệu..." />
            </Form.Item>
          )}
          {['withdraw', 'approve', 'reject', 'cancel'].includes(actionModal) && (
            <Form.Item
              name="reason"
              label={actionModal === 'approve' ? 'Nhận xét' : 'Lý do'}
              rules={['reject'].includes(actionModal) ? [{ required: true, message: 'Vui lòng nhập lý do' }] : []}
            >
              <Input.TextArea rows={4} placeholder="Nhập nội dung..." />
            </Form.Item>
          )}
          {actionModal === 'deadline' && (
            <Form.Item name="due_date" label="Deadline mới" initialValue={task?.due_date ? dayjs(task.due_date) : null} rules={[{ required: true, message: 'Chọn deadline mới' }]}>
              <DatePicker showTime format="DD/MM/YYYY HH:mm" className={styles.fullWidth} />
            </Form.Item>
          )}
          <div className={styles.modalActions}>
            <Button onClick={() => setActionModal(null)}>Đóng</Button>
            <Button type="primary" danger={['reject', 'cancel'].includes(actionModal)} htmlType="submit" loading={actionLoading}>
              Xác nhận
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
