import {
  Alert,
  Avatar,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Tabs,
  Timeline,
  Tooltip,
  Upload,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDownload,
  FiFile,
  FiMessageSquare,
  FiPlus,
  FiPlay,
  FiRefreshCw,
  FiRotateCcw,
  FiSend,
  FiSlash,
  FiTrash2,
  FiUpload,
  FiUser,
  FiX,
} from 'react-icons/fi'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  approveSubmissionApi,
  cancelTaskApi,
  createSubtaskApi,
  createTaskCommentApi,
  deleteAttachmentApi,
  downloadAttachmentApi,
  getTaskAttachmentsApi,
  getTaskCommentsApi,
  getTaskDetailApi,
  getTaskHistoryApi,
  getTaskSubmissionsApi,
  getTaskSubtasksApi,
  getSubtaskAssigneesApi,
  rejectSubmissionApi,
  startSubmissionReviewApi,
  startTaskApi,
  submitTaskApi,
  updateTaskDeadlineApi,
  uploadSubmissionAttachmentApi,
  uploadTaskAttachmentApi,
  withdrawSubmissionApi,
} from '../../api/taskApi'
import AttachmentPicker from '../../components/AttachmentPicker/AttachmentPicker'
import { useAuth } from '../../contexts/useAuth'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import {
  formatDateTime,
  getPriorityLabel,
  getStatusLabel,
  isTaskOpen,
  priorityOptions,
} from '../../utils/task'
import styles from './UserTaskDetailPage.module.css'

const actionLabels = {
  ATTACHMENT_DELETED: 'Đã xóa file đính kèm',
  ATTACHMENT_UPLOADED: 'Đã tải file đính kèm',
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

const workspaceTabs = new Set(['submissions', 'comments', 'subtasks', 'history'])

const formatFileSize = (value) => {
  if (!Number.isFinite(value)) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export default function UserTaskDetailPage() {
  const { taskId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [commentForm] = Form.useForm()
  const [actionForm] = Form.useForm()
  const commentListRef = useRef(null)
  const previousCommentCountRef = useRef(0)
  const [task, setTask] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [comments, setComments] = useState([])
  const [subtasks, setSubtasks] = useState([])
  const [history, setHistory] = useState([])
  const [attachments, setAttachments] = useState([])
  const [assignees, setAssignees] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [attachmentLoading, setAttachmentLoading] = useState(null)
  const [actionModal, setActionModal] = useState(null)
  const [submissionFiles, setSubmissionFiles] = useState([])
  const [subtaskCreationFiles, setSubtaskCreationFiles] = useState([])
  const requestedWorkspaceTab = searchParams.get('tab')
  const activeWorkspaceTab = workspaceTabs.has(requestedWorkspaceTab)
    ? requestedWorkspaceTab
    : 'submissions'

  const changeWorkspaceTab = (tab) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      if (tab === 'submissions') {
        next.delete('tab')
      } else {
        next.set('tab', tab)
      }
      return next
    }, { replace: true })
  }

  const loadDetail = useCallback(async () => {
    setError('')
    try {
      const [
        taskRes,
        submissionsRes,
        commentsRes,
        subtasksRes,
        historyRes,
        attachmentRes,
      ] = await Promise.all([
        getTaskDetailApi(taskId),
        getTaskSubmissionsApi(taskId),
        getTaskCommentsApi(taskId),
        getTaskSubtasksApi(taskId),
        getTaskHistoryApi(taskId),
        getTaskAttachmentsApi(taskId),
      ])
      setTask(taskRes.data.task)
      setSubmissions(submissionsRes.data.submissions || [])
      setComments(commentsRes.data.comments || [])
      setSubtasks(subtasksRes.data.subtasks || [])
      setHistory(historyRes.data.logs || [])
      setAttachments(attachmentRes.data.attachments || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải chi tiết công việc.')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    Promise.resolve().then(loadDetail)
  }, [loadDetail])

  const refreshComments = useCallback(async () => {
    try {
      const response = await getTaskCommentsApi(taskId)
      setComments(response.data.comments || [])
    } catch {
      // The fallback detail refresh owns the user-facing error state.
    }
  }, [taskId])

  const refreshRealtimeDetail = useCallback((event) => {
    if (event?.action === 'COMMENT_CREATED') {
      refreshComments()
      return
    }

    loadDetail()
  }, [loadDetail, refreshComments])

  useRealtimeRefresh(refreshRealtimeDetail, 'task')

  useEffect(() => {
    if (
      comments.length > previousCommentCountRef.current
      && commentListRef.current
    ) {
      commentListRef.current.scrollTo({
        top: commentListRef.current.scrollHeight,
        behavior: previousCommentCountRef.current === 0 ? 'auto' : 'smooth',
      })
    }

    previousCommentCountRef.current = comments.length
  }, [comments])

  useEffect(() => {
    if (!task || task.assigned_to !== user.id || task.parent_task_id) return

    Promise.resolve()
      .then(() => getSubtaskAssigneesApi(taskId))
      .then((response) => setAssignees(response.data.users || []))
      .catch(() => setAssignees([]))
  }, [task, taskId, user.id])

  const isAssignee = task?.assigned_to === user.id
  const isCreator = task?.created_by === user.id
  const isReviewer = task?.reviewer_id === user.id
  const latestSubmission = submissions.at(-1)
  const canUploadToSubmission = (submission) => (
    isAssignee
    && submission.submitted_by === user.id
    && !submission.is_withdrawn
    && submission.id === latestSubmission?.id
    && (
      (task.requires_review && task.status === 'SUBMITTED')
      || (!task.requires_review && task.status === 'COMPLETED')
    )
  )
  const taskAttachments = useMemo(
    () => attachments.filter((attachment) => !attachment.submission_id),
    [attachments],
  )
  const attachmentsBySubmission = useMemo(
    () => attachments.reduce((groups, attachment) => {
      if (!attachment.submission_id) return groups

      if (!groups[attachment.submission_id]) {
        groups[attachment.submission_id] = []
      }
      groups[attachment.submission_id].push(attachment)
      return groups
    }, {}),
    [attachments],
  )

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
      return runAction(async () => {
        const response = await submitTaskApi(taskId, { content: values.content })
        const submission = response.data.submission

        if (submissionFiles.length) {
          const uploadResults = await Promise.allSettled(
            submissionFiles.map(
              (file) => uploadSubmissionAttachmentApi(submission.id, file),
            ),
          )
          const failedUploads = uploadResults.filter(
            (result) => result.status === 'rejected',
          )

          if (failedUploads.length) {
            message.warning(
              `Kết quả đã được gửi, nhưng ${failedUploads.length}/${submissionFiles.length} file tải lên không thành công.`,
            )
          } else {
            message.success(
              `Đã gửi kết quả kèm ${submissionFiles.length} file.`,
            )
          }
        }

        setSubmissionFiles([])
      })
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
    if (actionModal === 'subtask') {
      return runAction(async () => {
        const response = await createSubtaskApi(taskId, {
          title: values.title,
          description: values.description,
          assigned_to: values.assigned_to,
          priority: values.priority,
          due_date: values.due_date?.toISOString(),
        })
        const subtask = response.data.subtask

        if (subtaskCreationFiles.length) {
          const uploadResults = await Promise.allSettled(
            subtaskCreationFiles.map(
              (file) => uploadTaskAttachmentApi(subtask.id, file),
            ),
          )
          const failedUploads = uploadResults.filter(
            (result) => result.status === 'rejected',
          )

          if (failedUploads.length) {
            message.warning(
              `Subtask đã được tạo, nhưng ${failedUploads.length}/${subtaskCreationFiles.length} file tải lên không thành công.`,
            )
          } else {
            message.success(
              `Đã tạo subtask và tải lên ${subtaskCreationFiles.length} file.`,
            )
          }
        }

        setSubtaskCreationFiles([])
      })
    }
  }

  const closeActionModal = () => {
    if (actionLoading) return
    setActionModal(null)
    setSubmissionFiles([])
    setSubtaskCreationFiles([])
    actionForm.resetFields()
  }

  const sendComment = async ({ content }) => {
    await runAction(() => createTaskCommentApi(taskId, { content }))
    commentForm.resetFields()
  }

  const uploadAttachment = async (file, submissionId = null) => {
    const loadingKey = submissionId || 'task'
    setAttachmentLoading(loadingKey)
    setError('')
    try {
      if (submissionId) {
        await uploadSubmissionAttachmentApi(submissionId, file)
      } else {
        await uploadTaskAttachmentApi(taskId, file)
      }
      message.success('Đã tải file lên.')
      await loadDetail()
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'Không thể tải file lên.')
    } finally {
      setAttachmentLoading(null)
    }
    return false
  }

  const downloadAttachment = async (attachment) => {
    setAttachmentLoading(attachment.id)
    setError('')
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
    } catch (downloadError) {
      setError(downloadError.response?.data?.message || 'Không thể tải file xuống.')
    } finally {
      setAttachmentLoading(null)
    }
  }

  const deleteAttachment = async (attachment) => {
    setAttachmentLoading(attachment.id)
    setError('')
    try {
      await deleteAttachmentApi(attachment.id)
      message.success('Đã xóa file đính kèm.')
      await loadDetail()
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.message
        || 'Không thể xóa file đính kèm.',
      )
    } finally {
      setAttachmentLoading(null)
    }
  }

  const renderAttachmentList = (items) => (
    <div className={styles.attachmentList}>
      {items.map((attachment) => (
        <article key={attachment.id} className={styles.attachment}>
          <span className={styles.fileIcon}><FiFile /></span>
          <span className={styles.fileInfo}>
            <strong title={attachment.file_name}>{attachment.file_name}</strong>
            <small>
              {formatFileSize(attachment.file_size)}
              {' · '}
              {formatDateTime(attachment.created_at)}
            </small>
          </span>
          <span className={styles.attachmentActions}>
            <Tooltip title="Tải xuống">
              <Button
                type="text"
                icon={<FiDownload />}
                loading={attachmentLoading === attachment.id}
                onClick={() => downloadAttachment(attachment)}
                aria-label={`Tải ${attachment.file_name}`}
              />
            </Tooltip>
            {attachment.can_delete && (
              <Popconfirm
                title="Xóa file đính kèm?"
                description="File sẽ bị xóa khỏi lần gửi kết quả này."
                okText="Xóa file"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteAttachment(attachment)}
              >
                <Tooltip title="Xóa file">
                  <Button
                    type="text"
                    danger
                    icon={<FiTrash2 />}
                    disabled={attachmentLoading === attachment.id}
                    aria-label={`Xóa ${attachment.file_name}`}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </span>
        </article>
      ))}
    </div>
  )

  const actions = useMemo(() => {
    if (!task) return []
    const items = []
    if (isAssignee && task.status === 'TODO') {
      items.push({ key: 'start', label: 'Bắt đầu', icon: <FiPlay />, primary: true, run: () => runAction(() => startTaskApi(taskId)) })
    }
    if (isAssignee && task.status === 'REJECTED') {
      items.push({ key: 'restart', label: 'Nhận làm lại', icon: <FiRefreshCw />, primary: true, run: () => runAction(() => startTaskApi(taskId)) })
    }
    if (isAssignee && task.status === 'IN_PROGRESS') {
      items.push({ key: 'submit', label: 'Gửi kết quả', icon: <FiSend />, primary: true, modal: 'submit' })
    }
    if (isAssignee && !task.parent_task_id && isTaskOpen(task.status)) {
      items.push({ key: 'subtask', label: 'Tạo subtask', icon: <FiPlus />, modal: 'subtask' })
    }
    if (isAssignee && task.status === 'SUBMITTED' && latestSubmission && !latestSubmission.is_withdrawn) {
      items.push({ key: 'withdraw', label: 'Thu hồi kết quả', icon: <FiRotateCcw />, modal: 'withdraw' })
    }
    if (isReviewer && task.status === 'SUBMITTED' && latestSubmission) {
      items.push({ key: 'review', label: 'Bắt đầu duyệt', icon: <FiClock />, primary: true, run: () => runAction(() => startSubmissionReviewApi(latestSubmission.id)) })
    }
    if (isReviewer && task.status === 'REVIEWING' && latestSubmission) {
      items.push({ key: 'approve', label: 'Duyệt hoàn thành', icon: <FiCheck />, primary: true, modal: 'approve' })
      items.push({ key: 'reject', label: 'Yêu cầu làm lại', icon: <FiX />, danger: true, modal: 'reject' })
    }
    if (isCreator && isTaskOpen(task.status)) {
      items.push({ key: 'deadline', label: 'Đổi deadline', icon: <FiCalendar />, modal: 'deadline' })
      items.push({ key: 'cancel', label: 'Hủy task', icon: <FiSlash />, danger: true, modal: 'cancel' })
    }
    return items
  }, [task, isAssignee, isCreator, isReviewer, latestSubmission, taskId, runAction])

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
              {(taskAttachments.length > 0 || (isCreator && isTaskOpen(task.status))) && (
                <div className={styles.requirementAttachments}>
                  <div className={styles.attachmentSectionHead}>
                    <div>
                      <strong>Tệp kèm yêu cầu ({taskAttachments.length})</strong>
                      <span>Tài liệu, hình ảnh và dữ liệu đầu vào của công việc</span>
                    </div>
                    {isCreator && isTaskOpen(task.status) && (
                      <Upload
                        showUploadList={false}
                        beforeUpload={(file) => uploadAttachment(file)}
                      >
                        <Button
                          size="small"
                          icon={<FiUpload />}
                          loading={attachmentLoading === 'task'}
                        >
                          Bổ sung tệp
                        </Button>
                      </Upload>
                    )}
                  </div>
                  {taskAttachments.length > 0 && renderAttachmentList(taskAttachments)}
                </div>
              )}
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
            <div>
              <span>
                {task.is_personal
                  ? isCreator ? 'Người duyệt' : 'Người thực hiện'
                  : isCreator ? 'Người thực hiện' : 'Người giao'}
              </span>
              <strong>
                {task.is_personal
                  ? isCreator
                    ? task.reviewer_name || 'Không cần duyệt'
                    : task.assigned_to_name || 'Chưa xác định'
                  : isCreator
                    ? task.assigned_to_name || 'Chưa xác định'
                    : task.created_by_name || 'Chưa xác định'}
              </strong>
            </div>
            <div><span>Ngày giao</span><strong>{formatDateTime(task.assigned_at)}</strong></div>
            <div><span>Deadline hiện tại</span><strong>{formatDateTime(task.due_date)}</strong></div>
            <div><span>Ngày hoàn thành</span><strong>{formatDateTime(task.completed_at)}</strong></div>
          </section>

          <section className={styles.workspace}>
            <Tabs
              activeKey={activeWorkspaceTab}
              onChange={changeWorkspaceTab}
              items={[
                {
                  key: 'submissions',
                  label: `Kết quả (${submissions.length})`,
                  children: (
                    <div className={styles.submissionList}>
                      {submissions.length === 0 ? <Empty description="Chưa có kết quả được gửi" /> : submissions.map((submission) => {
                        const submissionAttachments = attachmentsBySubmission[submission.id] || []
                        return (
                          <article key={submission.id} className={`${styles.submission} ${submission.is_withdrawn ? styles.withdrawn : ''}`}>
                          <div className={styles.submissionHead}>
                            <strong>Lần gửi #{submission.attempt_number}</strong>
                            <span>{submission.is_withdrawn ? 'Đã thu hồi' : 'Đã gửi'} · {formatDateTime(submission.submitted_at)}</span>
                          </div>
                          <p>{submission.content}</p>
                          {submission.withdrawal_reason && <small>Lý do thu hồi: {submission.withdrawal_reason}</small>}
                          {submissionAttachments.length > 0 && (
                            <div className={styles.submissionAttachments}>
                              <strong>Tệp gửi kèm ({submissionAttachments.length})</strong>
                              {renderAttachmentList(submissionAttachments)}
                            </div>
                          )}
                          {canUploadToSubmission(submission) && (
                            <Upload
                              showUploadList={false}
                              beforeUpload={(file) => uploadAttachment(file, submission.id)}
                            >
                              <Button
                                size="small"
                                icon={<FiUpload />}
                                loading={attachmentLoading === submission.id}
                                className={styles.submissionUpload}
                              >
                                Đính kèm vào lần gửi
                              </Button>
                            </Upload>
                          )}
                          </article>
                        )
                      })}
                    </div>
                  ),
                },
                {
                  key: 'comments',
                  label: `Trao đổi (${comments.length})`,
                  children: (
                    <div className={styles.comments}>
                      <div className={styles.commentList} ref={commentListRef}>
                        {comments.length === 0 ? <Empty description="Chưa có trao đổi" /> : comments.map((comment) => {
                          const mine = comment.user_id === user.id
                          const author = mine
                            ? 'Bạn'
                            : comment.author_name
                              || (comment.user_id === task.created_by
                                ? task.is_personal ? 'Người thực hiện' : 'Người giao việc'
                                : comment.user_id === task.reviewer_id
                                  ? 'Người duyệt'
                                  : 'Người thực hiện')
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
                          <Input
                            size="large"
                            placeholder="Trao đổi về yêu cầu, kết quả hoặc deadline..."
                            onPressEnter={(event) => {
                              event.preventDefault()
                              if (!event.nativeEvent.isComposing && !actionLoading) {
                                commentForm.submit()
                              }
                            }}
                          />
                        </Form.Item>
                        <Button
                          type="primary"
                          size="large"
                          htmlType="submit"
                          icon={<FiMessageSquare />}
                          loading={actionLoading}
                        >
                          Gửi trao đổi
                        </Button>
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
                          <span>
                            <strong>{subtask.title}</strong>
                            {subtask.created_by === user.id ? (
                              <small><FiUser /> Người thực hiện: {subtask.assigned_to_name || 'Chưa xác định'}</small>
                            ) : (
                              <small><FiSend /> Người giao: {subtask.created_by_name || 'Chưa xác định'}</small>
                            )}
                            <small>Hạn {formatDateTime(subtask.due_date)}</small>
                          </span>
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
          subtask: 'Tạo công việc con',
        }[actionModal]}
        open={Boolean(actionModal)}
        onCancel={closeActionModal}
        footer={null}
        destroyOnHidden
      >
        <Form form={actionForm} layout="vertical" onFinish={submitActionModal}>
          {actionModal === 'submit' && (
            <>
              <Form.Item name="content" label="Nội dung kết quả" rules={[{ required: true, message: 'Nhập nội dung kết quả' }]}>
                <Input.TextArea rows={5} placeholder="Mô tả kết quả đã hoàn thành, đường dẫn tài liệu..." />
              </Form.Item>
              <Form.Item label="File hoặc hình ảnh gửi kèm">
                <AttachmentPicker
                  files={submissionFiles}
                  onChange={setSubmissionFiles}
                  disabled={actionLoading}
                />
              </Form.Item>
            </>
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
              <DatePicker
                showTime
                needConfirm={false}
                format="DD/MM/YYYY HH:mm"
                className={styles.fullWidth}
              />
            </Form.Item>
          )}
          {actionModal === 'subtask' && (
            <>
              <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề subtask' }, { max: 200 }]}>
                <Input placeholder="Ví dụ: Tổng hợp dữ liệu đầu vào" />
              </Form.Item>
              <Form.Item name="description" label="Mô tả">
                <Input.TextArea rows={3} placeholder="Yêu cầu và kết quả mong đợi" />
              </Form.Item>
              <Form.Item name="assigned_to" label="Người thực hiện" rules={[{ required: true, message: 'Chọn người thực hiện' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={assignees.length ? 'Chọn nhân sự' : 'Không có nhân sự phù hợp'}
                  options={assignees.map((item) => ({
                    value: item.id,
                    label: `${item.full_name} · ${item.phone}`,
                  }))}
                />
              </Form.Item>
              <div className={styles.formGrid}>
                <Form.Item name="priority" label="Ưu tiên" initialValue="MEDIUM">
                  <Select options={priorityOptions} />
                </Form.Item>
                <Form.Item name="due_date" label="Deadline">
                  <DatePicker
                    showTime
                    needConfirm={false}
                    format="DD/MM/YYYY HH:mm"
                    className={styles.fullWidth}
                  />
                </Form.Item>
              </div>
              <Form.Item label="File hoặc hình ảnh đính kèm">
                <AttachmentPicker
                  files={subtaskCreationFiles}
                  onChange={setSubtaskCreationFiles}
                  disabled={actionLoading}
                />
              </Form.Item>
            </>
          )}
          <div className={styles.modalActions}>
            <Button onClick={closeActionModal} disabled={actionLoading}>Đóng</Button>
            <Button
              type="primary"
              danger={['reject', 'cancel'].includes(actionModal)}
              htmlType="submit"
              loading={actionLoading}
              disabled={actionModal === 'subtask' && !assignees.length}
            >
              Xác nhận
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
