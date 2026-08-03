import { Alert, Button, DatePicker, Empty, Form, Input, Modal, Pagination, Select, Skeleton, Space, Switch, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiArrowRight,
  FiCornerDownRight,
  FiHelpCircle,
  FiPlus,
  FiSend,
  FiUser,
} from 'react-icons/fi'
import { useNavigate } from 'react-router'
import {
  createTaskApi,
  getMyCreatedTasksApi,
  getTaskAssigneeCandidatesApi,
  getTaskReviewerCandidatesApi,
  uploadTaskAttachmentApi,
} from '../../api/taskApi'
import AttachmentPicker from '../../components/AttachmentPicker/AttachmentPicker'
import { useAuth } from '../../contexts/useAuth'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import { formatDateTime, getPriorityLabel, getStatusLabel, priorityOptions, taskStatuses } from '../../utils/task'
import styles from './UserCreatedTasksPage.module.css'

const SUBTASKS_PER_PAGE = 10

export default function UserCreatedTasksPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [tasks, setTasks] = useState(null)
  const [createdSubtasks, setCreatedSubtasks] = useState([])
  const [subtaskPage, setSubtaskPage] = useState(1)
  const [assignees, setAssignees] = useState([])
  const [assigneeDepartments, setAssigneeDepartments] = useState([])
  const [reviewers, setReviewers] = useState([])
  const [status, setStatus] = useState()
  const [priority, setPriority] = useState()
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [creationFiles, setCreationFiles] = useState([])
  const [error, setError] = useState('')
  const selectedAssignee = Form.useWatch('assigned_to', form)
  const selectedDepartment = Form.useWatch('assignee_department_id', form)
  const selectedAssigneeData = useMemo(
    () => assignees.find((item) => item.id === selectedAssignee),
    [assignees, selectedAssignee],
  )
  const isCrossDepartment = Boolean(
    selectedAssigneeData
    && selectedAssigneeData.department_id !== user.department_id,
  )

  const loadData = useCallback(async () => {
    setError('')
    try {
      const [tasksRes, usersRes] = await Promise.all([
        getMyCreatedTasksApi({ status, priority }),
        getTaskAssigneeCandidatesApi(),
      ])
      setTasks(tasksRes.data.tasks || [])
      const nextCreatedSubtasks = tasksRes.data.created_subtasks || []
      setCreatedSubtasks(nextCreatedSubtasks)
      setSubtaskPage((currentPage) => Math.min(
        currentPage,
        Math.max(
          1,
          Math.ceil(nextCreatedSubtasks.length / SUBTASKS_PER_PAGE),
        ),
      ))
      setAssignees(usersRes.data.users || [])
      setAssigneeDepartments(usersRes.data.departments || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu giao việc.')
    }
  }, [status, priority])

  useEffect(() => {
    Promise.resolve().then(loadData)
  }, [loadData])

  useEffect(() => {
    if (!modalOpen || !selectedAssignee) {
      Promise.resolve().then(() => setReviewers([]))
      return
    }

    getTaskReviewerCandidatesApi(selectedAssignee)
      .then((response) => {
        const nextReviewers = response.data.reviewers || []
        setReviewers(nextReviewers)
        const assignee = assignees.find((item) => item.id === selectedAssignee)
        if (assignee?.department_id !== user.department_id) {
          const directManager = nextReviewers.find(
            (item) => item.id === assignee.manager_id,
          )
          if (directManager) {
            form.setFieldValue('reviewer_id', directManager.id)
          }
        }
      })
      .catch(() => setReviewers([]))
  }, [assignees, form, modalOpen, selectedAssignee, user.department_id])

  useRealtimeRefresh(loadData, 'task')

  const assigneesById = useMemo(
    () => Object.fromEntries(assignees.map((item) => [item.id, item])),
    [assignees],
  )

  const visibleAssignees = useMemo(
    () => assignees.filter(
      (item) => !selectedDepartment || item.department_id === selectedDepartment,
    ),
    [assignees, selectedDepartment],
  )

  const paginatedCreatedSubtasks = useMemo(() => {
    const startIndex = (subtaskPage - 1) * SUBTASKS_PER_PAGE
    return createdSubtasks.slice(
      startIndex,
      startIndex + SUBTASKS_PER_PAGE,
    )
  }, [createdSubtasks, subtaskPage])

  const createTask = async (values) => {
    setSubmitting(true)
    try {
      const taskValues = { ...values }
      delete taskValues.assignee_department_id
      const response = await createTaskApi({
        ...taskValues,
        due_date: values.due_date?.toISOString(),
      })
      const task = response.data.task

      if (creationFiles.length) {
        const uploadResults = await Promise.allSettled(
          creationFiles.map((file) => uploadTaskAttachmentApi(task.id, file)),
        )
        const failedUploads = uploadResults.filter((result) => result.status === 'rejected')

        if (failedUploads.length) {
          message.warning(
            `Task đã được tạo, nhưng ${failedUploads.length}/${creationFiles.length} file tải lên không thành công.`,
          )
        } else {
          message.success(`Đã tạo task và tải lên ${creationFiles.length} file.`)
        }
      }

      setModalOpen(false)
      setCreationFiles([])
      form.resetFields()
      await loadData()
      navigate(`/app/tasks/${task.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo task.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeCreateModal = () => {
    if (submitting) return
    setModalOpen(false)
    setCreationFiles([])
    setReviewers([])
    form.resetFields()
  }

  const openCreateModal = () => {
    const defaultDepartmentId = assigneeDepartments.some(
      (department) => department.id === user.department_id,
    )
      ? user.department_id
      : assigneeDepartments[0]?.id
    setModalOpen(true)
    form.setFieldsValue({
      assignee_department_id: defaultDepartmentId,
      assigned_to: undefined,
      reviewer_id: undefined,
    })
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>QUẢN LÝ GIAO VIỆC</span>
          <h1>Việc tôi giao</h1>
          <p>Theo dõi công việc đã giao cho nhân sự phù hợp trong và ngoài phòng ban.</p>
        </div>
        <Space wrap>
          <Button
            icon={<FiHelpCircle />}
            onClick={() => navigate('/app/guide#create-task')}
          >
            Hướng dẫn
          </Button>
          <Button type="primary" icon={<FiPlus />} onClick={openCreateModal}>
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
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            options={taskStatuses}
            value={status}
            onChange={(value) => {
              setStatus(value)
              setSubtaskPage(1)
            }}
          />
          <Select
            allowClear
            placeholder="Mọi mức ưu tiên"
            options={priorityOptions}
            value={priority}
            onChange={(value) => {
              setPriority(value)
              setSubtaskPage(1)
            }}
          />
        </div>
      </section>

      {error && <Alert type="error" showIcon message={error} className={styles.alert} closable onClose={() => setError('')} />}
      {!tasks ? <Skeleton active paragraph={{ rows: 8 }} /> : tasks.length === 0 && createdSubtasks.length === 0 ? (
        <section className={styles.empty}>
          <Empty description="Bạn chưa giao công việc nào">
            <Button type="primary" icon={<FiPlus />} onClick={openCreateModal}>Tạo task đầu tiên</Button>
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
                  <span>Người duyệt: <b>{task.reviewer_name || 'Bạn'}</b></span>
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
                {paginatedCreatedSubtasks.map((subtask) => (
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
            {createdSubtasks.length > SUBTASKS_PER_PAGE && (
              <div className={styles.subtaskPagination}>
                <Pagination
                  current={subtaskPage}
                  pageSize={SUBTASKS_PER_PAGE}
                  total={createdSubtasks.length}
                  showSizeChanger={false}
                  responsive
                  onChange={setSubtaskPage}
                  showTotal={(total, range) => (
                    `${range[0]}-${range[1]} trên ${total} subtask`
                  )}
                />
              </div>
            )}
          </section>
        </>
      )}

      <Modal
        title="Giao công việc mới"
        open={modalOpen}
        onCancel={closeCreateModal}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createTask}
          initialValues={{
            priority: 'MEDIUM',
            require_subtasks_completed: false,
            assignee_department_id: user.department_id,
          }}
        >
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề công việc' }, { max: 200 }]}>
            <Input placeholder="Ví dụ: Hoàn thiện báo cáo tháng" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={4} placeholder="Mục tiêu, yêu cầu và kết quả mong đợi" />
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
                form.setFieldValue('assigned_to', undefined)
                form.setFieldValue('reviewer_id', undefined)
                setReviewers([])
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
              placeholder={visibleAssignees.length ? 'Chọn nhân sự thực hiện' : 'Bộ phận này không có nhân sự phù hợp'}
              onChange={() => form.setFieldValue('reviewer_id', undefined)}
              options={visibleAssignees.map((candidate) => ({
                value: candidate.id,
                label: `${candidate.full_name} · ${candidate.position_name}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="reviewer_id"
            label="Người duyệt"
            rules={isCrossDepartment
              ? [{ required: true, message: 'Chọn người duyệt thuộc bộ phận thực hiện' }]
              : []}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={
                selectedAssignee
                  ? isCrossDepartment
                    ? 'Chọn quản lý thuộc bộ phận thực hiện'
                    : 'Mặc định: bạn duyệt'
                  : 'Chọn người thực hiện trước'
              }
              disabled={!selectedAssignee}
              options={reviewers.map((reviewer) => ({
                value: reviewer.id,
                label: reviewer.id === user.id
                  ? `${reviewer.full_name} · Bản thân`
                  : `${reviewer.full_name} · ${reviewer.phone}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="require_subtasks_completed"
            label="Phải hoàn thành subtask trước khi gửi kết quả task chính"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <div className={styles.formGrid}>
            <Form.Item name="priority" label="Ưu tiên">
              <Select options={priorityOptions} />
            </Form.Item>
            <Form.Item name="due_date" label="Deadline">
              <DatePicker
                showTime
                needConfirm={false}
                format="DD/MM/YYYY HH:mm"
                placeholder="Chọn thời hạn"
              />
            </Form.Item>
          </div>
          <Form.Item label="File hoặc hình ảnh đính kèm">
            <AttachmentPicker
              files={creationFiles}
              onChange={setCreationFiles}
              disabled={submitting}
            />
          </Form.Item>
          <div className={styles.modalActions}>
            <Button onClick={closeCreateModal} disabled={submitting}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={!visibleAssignees.length}
            >
              Giao task
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
