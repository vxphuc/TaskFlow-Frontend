import {
  Alert,
  App,
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Skeleton,
  Switch,
  Tabs,
  Timeline,
  Tooltip,
  Upload,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDownload,
  FiEdit2,
  FiFile,
  FiGitBranch,
  FiList,
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
import { useNavigate, useParams, useSearchParams } from 'react-router'
import {
  approveSubmissionApi,
  cancelTaskApi,
  createSubtaskApi,
  createTaskChecklistItemApi,
  createTaskCommentApi,
  deleteAttachmentApi,
  deleteTaskChecklistItemApi,
  downloadAttachmentApi,
  getTaskAttachmentsApi,
  getTaskCommentsApi,
  getTaskChecklistApi,
  getTaskDetailApi,
  getTaskHistoryApi,
  getTaskProgressTreeApi,
  getTaskSubmissionsApi,
  getTaskSubtasksApi,
  getSubtaskAssigneesApi,
  getTaskReviewerCandidatesApi,
  rejectSubmissionApi,
  startSubmissionReviewApi,
  startTaskApi,
  submitTaskApi,
  toggleTaskChecklistItemApi,
  updateTaskApi,
  updateTaskChecklistItemApi,
  updateTaskDeadlineApi,
  updateTaskSubtaskPolicyApi,
  uploadSubmissionAttachmentApi,
  uploadTaskAttachmentApi,
  withdrawSubmissionApi,
} from '../../api/taskApi'
import AttachmentPicker from '../../components/AttachmentPicker/AttachmentPicker'
import { useAuth } from '../../contexts/useAuth'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import SubtaskChecklistOverview from './SubtaskChecklistOverview'
import TaskProgressTree from './TaskProgressTree'
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
  TASK_UPDATED: 'Đã chỉnh sửa công việc',
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

const workspaceTabs = new Set([
  'progress',
  'checklist',
  'submissions',
  'comments',
  'subtasks',
  'history',
])

const formatFileSize = (value) => {
  if (!Number.isFinite(value)) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export default function UserTaskDetailPage() {
  const { message } = App.useApp()
  const { taskId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [commentForm] = Form.useForm()
  const [checklistForm] = Form.useForm()
  const [actionForm] = Form.useForm()
  const commentListRef = useRef(null)
  const previousCommentCountRef = useRef(0)
  const assigneesLoadedForTaskRef = useRef(null)
  const [task, setTask] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [comments, setComments] = useState([])
  const [checklistItems, setChecklistItems] = useState([])
  const [checklistProgress, setChecklistProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
  })
  const [checklistPermissions, setChecklistPermissions] = useState({
    can_add: false,
    can_manage: false,
    can_toggle: false,
  })
  const [subtasks, setSubtasks] = useState([])
  const [progressTree, setProgressTree] = useState(null)
  const [progressTreeLoading, setProgressTreeLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [attachments, setAttachments] = useState([])
  const [assignees, setAssignees] = useState([])
  const [assigneeDepartments, setAssigneeDepartments] = useState([])
  const [subtaskReviewers, setSubtaskReviewers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [attachmentLoading, setAttachmentLoading] = useState(null)
  const [checklistLoading, setChecklistLoading] = useState(null)
  const [subtaskPolicyLoading, setSubtaskPolicyLoading] = useState(false)
  const [editingChecklistItem, setEditingChecklistItem] = useState(null)
  const [checklistEditValue, setChecklistEditValue] = useState('')
  const [actionModal, setActionModal] = useState(null)
  const [submissionFiles, setSubmissionFiles] = useState([])
  const [subtaskCreationFiles, setSubtaskCreationFiles] = useState([])
  const selectedSubtaskDepartment = Form.useWatch(
    'assignee_department_id',
    actionForm,
  )
  const selectedSubtaskAssignee = Form.useWatch('assigned_to', actionForm)
  const visibleSubtaskAssignees = useMemo(
    () => assignees.filter(
      (item) => (
        !selectedSubtaskDepartment
        || item.department_id === selectedSubtaskDepartment
      ),
    ),
    [assignees, selectedSubtaskDepartment],
  )
  const selectedSubtaskAssigneeData = useMemo(
    () => assignees.find((item) => item.id === selectedSubtaskAssignee),
    [assignees, selectedSubtaskAssignee],
  )
  const isCrossDepartmentSubtask = Boolean(
    selectedSubtaskAssigneeData
    && selectedSubtaskAssigneeData.department_id !== user.department_id,
  )
  const requestedWorkspaceTab = searchParams.get('tab')
  const canViewProgressTree = Boolean(
    task
    && [task.created_by, task.assigned_to].includes(user.id)
    && !task.parent_task_id
  )
  const activeWorkspaceTab = (
    workspaceTabs.has(requestedWorkspaceTab)
    && (requestedWorkspaceTab !== 'progress' || canViewProgressTree)
  )
    ? requestedWorkspaceTab
    : 'submissions'
  const displayedChecklistProgress = canViewProgressTree && progressTree?.summary
    ? {
        completed: progressTree.summary.checklist_completed,
        total: progressTree.summary.checklist_total,
      }
    : checklistProgress

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
        checklistRes,
        subtasksRes,
        historyRes,
        attachmentRes,
      ] = await Promise.all([
        getTaskDetailApi(taskId),
        getTaskSubmissionsApi(taskId),
        getTaskCommentsApi(taskId),
        getTaskChecklistApi(taskId),
        getTaskSubtasksApi(taskId),
        getTaskHistoryApi(taskId),
        getTaskAttachmentsApi(taskId),
      ])
      setTask(taskRes.data.task)
      setSubmissions(submissionsRes.data.submissions || [])
      setComments(commentsRes.data.comments || [])
      setChecklistItems(checklistRes.data.items || [])
      setChecklistProgress(checklistRes.data.progress || {
        total: 0,
        completed: 0,
        percentage: 0,
      })
      setChecklistPermissions(checklistRes.data.permissions || {
        can_add: false,
        can_manage: false,
        can_toggle: false,
      })
      setSubtasks(subtasksRes.data.subtasks || [])
      setHistory(historyRes.data.logs || [])
      setAttachments(attachmentRes.data.attachments || [])

      const nextTask = taskRes.data.task
      if (
        [nextTask.created_by, nextTask.assigned_to].includes(user.id)
        && !nextTask.parent_task_id
      ) {
        setProgressTreeLoading(true)
        try {
          const progressResponse = await getTaskProgressTreeApi(taskId)
          setProgressTree(progressResponse.data)
        } catch {
          setProgressTree(null)
        } finally {
          setProgressTreeLoading(false)
        }
      } else {
        setProgressTree(null)
        setProgressTreeLoading(false)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải chi tiết công việc.')
    } finally {
      setLoading(false)
    }
  }, [taskId, user.id])

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

  const refreshChecklist = useCallback(async () => {
    try {
      const response = await getTaskChecklistApi(taskId)
      setChecklistItems(response.data.items || [])
      setChecklistProgress(response.data.progress || {
        total: 0,
        completed: 0,
        percentage: 0,
      })
      setChecklistPermissions(response.data.permissions || {
        can_add: false,
        can_manage: false,
        can_toggle: false,
      })
    } catch {
      // The fallback detail refresh owns the user-facing error state.
    }
  }, [taskId])

  const refreshProgressTree = useCallback(async () => {
    if (!canViewProgressTree) return

    try {
      const response = await getTaskProgressTreeApi(taskId)
      setProgressTree(response.data)
    } catch {
      // The fallback detail refresh owns the user-facing error state.
    }
  }, [canViewProgressTree, taskId])

  const refreshRealtimeDetail = useCallback((event) => {
    if (event?.action === 'COMMENT_CREATED') {
      refreshComments()
      return
    }
    if (event?.action?.startsWith('CHECKLIST_')) {
      if (!event.reference_id || event.reference_id === taskId) {
        refreshChecklist()
      }
      refreshProgressTree()
      return
    }

    loadDetail()
  }, [loadDetail, refreshChecklist, refreshComments, refreshProgressTree, taskId])

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
    if (
      !task
      || task.parent_task_id
      || ![task.assigned_to, task.created_by].includes(user.id)
      || !isTaskOpen(task.status)
      || assigneesLoadedForTaskRef.current === taskId
    ) return

    assigneesLoadedForTaskRef.current = taskId
    Promise.resolve()
      .then(() => getSubtaskAssigneesApi(taskId))
      .then((response) => {
        setAssignees(response.data.users || [])
        setAssigneeDepartments(response.data.departments || [])
      })
      .catch(() => {
        assigneesLoadedForTaskRef.current = null
        setAssignees([])
        setAssigneeDepartments([])
      })
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
    if (actionModal === 'edit') {
      return runAction(() => updateTaskApi(taskId, {
        title: values.title,
        description: values.description,
        priority: values.priority,
        due_date: values.due_date?.toISOString() || null,
      }))
    }
    if (actionModal === 'subtask') {
      return runAction(async () => {
        const response = await createSubtaskApi(taskId, {
          title: values.title,
          description: values.description,
          assigned_to: values.assigned_to,
          reviewer_id: values.reviewer_id,
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
        setSubtaskReviewers([])
      })
    }
  }

  const closeActionModal = () => {
    if (actionLoading) return
    setActionModal(null)
    setSubmissionFiles([])
    setSubtaskCreationFiles([])
    setSubtaskReviewers([])
    actionForm.resetFields()
  }

  const loadSubtaskReviewers = async (assigneeId) => {
    actionForm.setFieldValue('reviewer_id', undefined)
    if (!assigneeId) {
      setSubtaskReviewers([])
      return
    }

    try {
      const response = await getTaskReviewerCandidatesApi(assigneeId)
      const nextReviewers = response.data.reviewers || []
      setSubtaskReviewers(nextReviewers)
      const assignee = assignees.find((item) => item.id === assigneeId)
      if (assignee?.department_id !== user.department_id) {
        const directManager = nextReviewers.find(
          (item) => item.id === assignee.manager_id,
        )
        if (directManager) {
          actionForm.setFieldValue('reviewer_id', directManager.id)
        }
      }
    } catch {
      setSubtaskReviewers([])
    }
  }

  const openActionModal = (modalName) => {
    if (modalName === 'edit') {
      actionForm.setFieldsValue({
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: task.due_date ? dayjs(task.due_date) : null,
      })
    }
    if (modalName === 'subtask') {
      const defaultDepartmentId = assigneeDepartments.some(
        (department) => department.id === user.department_id,
      )
        ? user.department_id
        : assigneeDepartments[0]?.id
      actionForm.setFieldsValue({
        assignee_department_id: defaultDepartmentId,
        assigned_to: undefined,
        reviewer_id: undefined,
      })
    }
    setActionModal(modalName)
  }

  const changeSubtaskPolicy = async (checked) => {
    setSubtaskPolicyLoading(true)
    setError('')
    try {
      const response = await updateTaskSubtaskPolicyApi(taskId, {
        require_subtasks_completed: checked,
      })
      setTask(response.data.task)
      message.success('Đã cập nhật quy tắc subtask.')
    } catch (err) {
      setError(
        err.response?.data?.message
        || 'Không thể cập nhật quy tắc subtask.',
      )
    } finally {
      setSubtaskPolicyLoading(false)
    }
  }

  const sendComment = async ({ content }) => {
    await runAction(() => createTaskCommentApi(taskId, { content }))
    commentForm.resetFields()
  }

  const runChecklistAction = async (key, callback) => {
    setChecklistLoading(key)
    setError('')
    try {
      await callback()
      await refreshChecklist()
      return true
    } catch (err) {
      setError(
        err.response?.data?.message
        || 'Không thể cập nhật checklist.',
      )
      return false
    } finally {
      setChecklistLoading(null)
    }
  }

  const addChecklistItem = async ({ content }) => {
    const succeeded = await runChecklistAction(
      'create',
      () => createTaskChecklistItemApi(taskId, { content }),
    )
    if (succeeded) checklistForm.resetFields()
  }

  const toggleChecklistItem = (item, isCompleted) => runChecklistAction(
    item.id,
    () => toggleTaskChecklistItemApi(taskId, item.id, {
      is_completed: isCompleted,
    }),
  )

  const deleteChecklistItem = (itemId) => runChecklistAction(
    itemId,
    () => deleteTaskChecklistItemApi(taskId, itemId),
  )

  const beginChecklistEdit = (item) => {
    setEditingChecklistItem(item.id)
    setChecklistEditValue(item.content)
  }

  const cancelChecklistEdit = () => {
    setEditingChecklistItem(null)
    setChecklistEditValue('')
  }

  const saveChecklistEdit = async (itemId) => {
    const content = checklistEditValue.trim()
    if (!content) {
      setError('Nội dung hạng mục là bắt buộc.')
      return
    }

    const succeeded = await runChecklistAction(
      itemId,
      () => updateTaskChecklistItemApi(taskId, itemId, { content }),
    )
    if (succeeded) cancelChecklistEdit()
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
    if (
      (isAssignee || isCreator)
      && !task.parent_task_id
      && isTaskOpen(task.status)
    ) {
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
    if (
      isCreator
      && ['TODO', 'IN_PROGRESS', 'REJECTED'].includes(task.status)
    ) {
      items.push({
        key: 'edit',
        label: task.parent_task_id ? 'Sửa subtask' : 'Sửa task',
        icon: <FiEdit2 />,
        modal: 'edit',
      })
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
      {error && <Alert type="error" showIcon title={error} className={styles.alert} closable onClose={() => setError('')} />}
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
                  onClick={() => action.run ? action.run() : openActionModal(action.modal)}
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
              {!task.is_personal && (
                <small>
                  Người duyệt: {task.reviewer_name || 'Người giao'}
                </small>
              )}
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
                ...(canViewProgressTree ? [{
                  key: 'progress',
                  label: (
                    <span className={styles.tabLabel}>
                      <FiGitBranch />
                      Tiến độ tổng quan
                    </span>
                  ),
                  children: (
                    <TaskProgressTree
                      data={progressTree}
                      loading={progressTreeLoading}
                      onOpenTask={(id) => navigate(`/app/tasks/${id}`)}
                    />
                  ),
                }] : []),
                {
                  key: 'checklist',
                  label: (
                    <span className={styles.tabLabel}>
                      <FiList />
                      Checklist ({displayedChecklistProgress.completed}/{displayedChecklistProgress.total})
                    </span>
                  ),
                  children: (
                    <div className={styles.checklistPanel}>
                      <div className={styles.checklistHeader}>
                        <div>
                          <strong>Tiến độ công việc</strong>
                          <span>
                            {checklistProgress.total
                              ? `${checklistProgress.completed} trên ${checklistProgress.total} hạng mục đã hoàn thành`
                              : 'Chưa có hạng mục nào'}
                          </span>
                        </div>
                        <strong className={styles.progressValue}>
                          {checklistProgress.percentage}%
                        </strong>
                      </div>
                      <Progress
                        percent={checklistProgress.percentage}
                        showInfo={false}
                        strokeColor="#206a37"
                        railColor="#e6ece8"
                      />

                      {checklistPermissions.can_add && (
                        <Form
                          form={checklistForm}
                          className={styles.checklistForm}
                          onFinish={addChecklistItem}
                        >
                          <Form.Item
                            name="content"
                            rules={[
                              {
                                required: true,
                                whitespace: true,
                                message: 'Nhập nội dung hạng mục',
                              },
                              {
                                max: 255,
                                message: 'Tối đa 255 ký tự',
                              },
                            ]}
                          >
                            <Input
                              maxLength={255}
                              placeholder="Ví dụ: Ảnh banner 1"
                              onPressEnter={(event) => {
                                if (!event.nativeEvent.isComposing) {
                                  event.preventDefault()
                                  checklistForm.submit()
                                }
                              }}
                            />
                          </Form.Item>
                          <Button
                            type="primary"
                            htmlType="submit"
                            icon={<FiPlus />}
                            loading={checklistLoading === 'create'}
                          >
                            Thêm mục
                          </Button>
                        </Form>
                      )}

                      {checklistItems.length === 0 ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={
                            checklistPermissions.can_add
                              ? 'Thêm các hạng mục cần hoàn thành'
                              : 'Task này chưa có hạng mục checklist'
                          }
                        />
                      ) : (
                        <div className={styles.checklistItems}>
                          {checklistItems.map((item) => (
                            <div
                              key={item.id}
                              className={`${styles.checklistItem} ${
                                item.is_completed ? styles.checklistCompleted : ''
                              }`}
                            >
                              <Checkbox
                                checked={item.is_completed}
                                disabled={
                                  !checklistPermissions.can_toggle
                                  || checklistLoading === item.id
                                }
                                onChange={(event) => toggleChecklistItem(
                                  item,
                                  event.target.checked,
                                )}
                              />
                              {editingChecklistItem === item.id ? (
                                <div className={styles.checklistEdit}>
                                  <Input
                                    value={checklistEditValue}
                                    maxLength={255}
                                    autoFocus
                                    onChange={(event) => setChecklistEditValue(event.target.value)}
                                    onPressEnter={(event) => {
                                      if (!event.nativeEvent.isComposing) {
                                        event.preventDefault()
                                        saveChecklistEdit(item.id)
                                      }
                                    }}
                                  />
                                  <Tooltip title="Lưu thay đổi">
                                    <Button
                                      type="text"
                                      icon={<FiCheck />}
                                      loading={checklistLoading === item.id}
                                      onClick={() => saveChecklistEdit(item.id)}
                                      aria-label="Lưu hạng mục"
                                    />
                                  </Tooltip>
                                  <Tooltip title="Hủy chỉnh sửa">
                                    <Button
                                      type="text"
                                      icon={<FiX />}
                                      disabled={checklistLoading === item.id}
                                      onClick={cancelChecklistEdit}
                                      aria-label="Hủy chỉnh sửa hạng mục"
                                    />
                                  </Tooltip>
                                </div>
                              ) : (
                                <div className={styles.checklistContent}>
                                  <strong>{item.content}</strong>
                                  <span>
                                    {item.is_completed
                                      ? `${item.completed_by_name || 'Người thực hiện'} hoàn thành · ${formatDateTime(item.completed_at)}`
                                      : 'Chưa hoàn thành'}
                                  </span>
                                </div>
                              )}
                              {item.can_manage
                                && editingChecklistItem !== item.id && (
                                <div className={styles.checklistActions}>
                                  <Tooltip title="Sửa hạng mục">
                                    <Button
                                      type="text"
                                      icon={<FiEdit2 />}
                                      disabled={checklistLoading !== null}
                                      onClick={() => beginChecklistEdit(item)}
                                      aria-label="Sửa hạng mục"
                                    />
                                  </Tooltip>
                                  <Popconfirm
                                    title="Xóa hạng mục?"
                                    description="Trạng thái hoàn thành của hạng mục này cũng sẽ bị xóa."
                                    okText="Xóa"
                                    cancelText="Giữ lại"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => deleteChecklistItem(item.id)}
                                  >
                                    <Tooltip title="Xóa hạng mục">
                                      <Button
                                        type="text"
                                        danger
                                        icon={<FiTrash2 />}
                                        loading={checklistLoading === item.id}
                                        aria-label="Xóa hạng mục"
                                      />
                                    </Tooltip>
                                  </Popconfirm>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {!checklistPermissions.can_toggle
                        && isAssignee
                        && task.status !== 'IN_PROGRESS'
                        && checklistItems.length > 0 && (
                          <p className={styles.checklistHint}>
                            Bắt đầu task để đánh dấu tiến độ. Khi đã gửi kết quả,
                            checklist sẽ chuyển sang chỉ đọc.
                          </p>
                      )}

                      {!task.parent_task_id && canViewProgressTree && (
                        <SubtaskChecklistOverview
                          data={progressTree}
                          loading={progressTreeLoading}
                          onOpenTask={(id) => navigate(`/app/tasks/${id}`)}
                        />
                      )}
                    </div>
                  ),
                },
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
                  children: (
                    <div className={styles.subtaskWorkspace}>
                      {!task.parent_task_id && (
                        <div className={styles.subtaskPolicy}>
                          <div>
                            <strong>Hoàn tất subtask trước task chính</strong>
                            <span>
                              {task.require_subtasks_completed
                                ? 'Task chính chỉ được gửi kết quả khi mọi subtask đã hoàn thành hoặc được hủy.'
                                : 'Task chính có thể gửi kết quả mà không cần chờ subtask.'}
                            </span>
                          </div>
                          {isCreator ? (
                            <Switch
                              checked={task.require_subtasks_completed}
                              loading={subtaskPolicyLoading}
                              disabled={!isTaskOpen(task.status)}
                              onChange={changeSubtaskPolicy}
                            />
                          ) : (
                            <strong>
                              {task.require_subtasks_completed
                                ? 'Bắt buộc'
                                : 'Không bắt buộc'}
                            </strong>
                          )}
                        </div>
                      )}
                      {subtasks.length === 0 ? (
                        <Empty description="Chưa có công việc con" />
                      ) : (
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
                                <small>Người duyệt: {subtask.reviewer_name || 'Người giao'}</small>
                                <small>Hạn {formatDateTime(subtask.due_date)}</small>
                              </span>
                              <span className={`${styles.status} ${styles[subtask.status.toLowerCase()]}`}>{getStatusLabel(subtask.status)}</span>
                              <FiArrowLeft className={styles.openIcon} />
                            </button>
                          ))}
                        </div>
                      )}
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
          edit: task?.parent_task_id ? 'Sửa subtask' : 'Sửa task',
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
          {actionModal === 'edit' && (
            <>
              <Form.Item
                name="title"
                label="Tiêu đề"
                rules={[
                  { required: true, message: 'Nhập tiêu đề công việc' },
                  { max: 200, message: 'Tiêu đề tối đa 200 ký tự' },
                ]}
              >
                <Input placeholder="Nhập tiêu đề công việc" />
              </Form.Item>
              <Form.Item name="description" label="Mô tả">
                <Input.TextArea
                  rows={4}
                  placeholder="Mục tiêu, yêu cầu và kết quả mong đợi"
                />
              </Form.Item>
              <div className={styles.formGrid}>
                <Form.Item name="priority" label="Ưu tiên">
                  <Select options={priorityOptions} />
                </Form.Item>
                <Form.Item name="due_date" label="Deadline">
                  <DatePicker
                    allowClear
                    showTime
                    needConfirm={false}
                    format="DD/MM/YYYY HH:mm"
                    className={styles.fullWidth}
                  />
                </Form.Item>
              </div>
            </>
          )}
          {actionModal === 'subtask' && (
            <>
              <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề subtask' }, { max: 200 }]}>
                <Input placeholder="Ví dụ: Tổng hợp dữ liệu đầu vào" />
              </Form.Item>
              <Form.Item name="description" label="Mô tả">
                <Input.TextArea rows={3} placeholder="Yêu cầu và kết quả mong đợi" />
              </Form.Item>
              <Form.Item
                name="assignee_department_id"
                label="Bộ phận thực hiện"
                rules={[{ required: true, message: 'Chọn bộ phận thực hiện' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chọn bộ phận"
                  onChange={() => {
                    actionForm.setFieldValue('assigned_to', undefined)
                    actionForm.setFieldValue('reviewer_id', undefined)
                    setSubtaskReviewers([])
                  }}
                  options={assigneeDepartments.map((department) => ({
                    value: department.id,
                    label: department.id === user.department_id
                      ? `${department.name} · Bộ phận của bạn`
                      : department.name,
                  }))}
                />
              </Form.Item>
              <Form.Item name="assigned_to" label="Người thực hiện" rules={[{ required: true, message: 'Chọn người thực hiện' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={visibleSubtaskAssignees.length ? 'Chọn nhân sự thực hiện' : 'Bộ phận này không có nhân sự phù hợp'}
                  onChange={loadSubtaskReviewers}
                  options={visibleSubtaskAssignees.map((item) => ({
                    value: item.id,
                    label: `${item.full_name} · ${item.position_name}`,
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
              <Form.Item
                name="reviewer_id"
                label="Người duyệt"
                rules={isCrossDepartmentSubtask
                  ? [{ required: true, message: 'Chọn người duyệt thuộc bộ phận thực hiện' }]
                  : []}
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={isCrossDepartmentSubtask
                    ? 'Chọn quản lý thuộc bộ phận thực hiện'
                    : 'Mặc định: người tạo subtask duyệt'}
                  options={subtaskReviewers.map((reviewer) => ({
                    value: reviewer.id,
                    label: reviewer.id === user.id
                      ? `${reviewer.full_name} · Bản thân`
                      : `${reviewer.full_name} · ${reviewer.phone}`,
                  }))}
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
              disabled={
                actionModal === 'subtask'
                && !visibleSubtaskAssignees.length
              }
            >
              Xác nhận
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
