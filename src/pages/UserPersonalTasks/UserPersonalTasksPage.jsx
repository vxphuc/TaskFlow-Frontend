import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Tabs,
  message,
} from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiShield,
  FiUser,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import {
  createPersonalTaskApi,
  getPersonalReviewQueueApi,
  getPersonalTasksApi,
  uploadTaskAttachmentApi,
} from '../../api/taskApi'
import { getPersonalTaskReviewersApi } from '../../api/userApi'
import AttachmentPicker from '../../components/AttachmentPicker/AttachmentPicker'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import {
  formatDateTime,
  getPriorityLabel,
  getStatusLabel,
  priorityOptions,
  taskStatuses,
} from '../../utils/task'
import styles from './UserPersonalTasksPage.module.css'

const reviewStatuses = new Set(['SUBMITTED', 'REVIEWING'])

export default function UserPersonalTasksPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [personalTasks, setPersonalTasks] = useState(null)
  const [reviewTasks, setReviewTasks] = useState([])
  const [reviewers, setReviewers] = useState([])
  const [activeTab, setActiveTab] = useState('mine')
  const [status, setStatus] = useState()
  const [modalOpen, setModalOpen] = useState(false)
  const [creationFiles, setCreationFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setError('')
    try {
      const [personalResponse, reviewResponse, reviewerResponse] = await Promise.all([
        getPersonalTasksApi({ status }),
        getPersonalReviewQueueApi(),
        getPersonalTaskReviewersApi().catch(() => ({ data: { reviewers: [] } })),
      ])
      setPersonalTasks(personalResponse.data.tasks || [])
      setReviewTasks(reviewResponse.data.tasks || [])
      setReviewers(reviewerResponse.data.reviewers || [])
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Không thể tải công việc cá nhân.')
    }
  }, [status])

  useEffect(() => {
    Promise.resolve().then(loadData)
  }, [loadData])

  useRealtimeRefresh(loadData, 'task')

  const waitingReviews = useMemo(
    () => reviewTasks.filter((task) => reviewStatuses.has(task.status)).length,
    [reviewTasks],
  )

  const openCreate = () => {
    setCreationFiles([])
    form.resetFields()
    form.setFieldsValue({ priority: 'MEDIUM' })
    setModalOpen(true)
  }

  const closeCreate = () => {
    if (submitting) return
    setModalOpen(false)
    setCreationFiles([])
    form.resetFields()
  }

  const createTask = async (values) => {
    setSubmitting(true)
    setError('')
    try {
      const response = await createPersonalTaskApi({
        ...values,
        reviewer_id: values.reviewer_id || null,
        due_date: values.due_date?.toISOString(),
      })
      const task = response.data.task

      if (creationFiles.length) {
        const results = await Promise.allSettled(
          creationFiles.map((file) => uploadTaskAttachmentApi(task.id, file)),
        )
        const failedCount = results.filter((result) => result.status === 'rejected').length
        if (failedCount) {
          message.warning(
            `Đã tạo việc, nhưng ${failedCount}/${creationFiles.length} file tải lên không thành công.`,
          )
        } else {
          message.success('Đã tạo việc cá nhân và tải file đính kèm.')
        }
      } else {
        message.success('Đã tạo việc cá nhân.')
      }

      setModalOpen(false)
      setCreationFiles([])
      form.resetFields()
      await loadData()
      navigate(`/app/tasks/${task.id}`)
    } catch (createError) {
      const errorMessage = createError.response?.data?.message || 'Không thể tạo việc cá nhân.'
      setError(errorMessage)
      message.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const renderTaskList = (tasks, reviewMode = false) => {
    if (!tasks.length) {
      return (
        <Empty
          description={
            reviewMode
              ? 'Chưa có công việc cá nhân nào nhờ bạn duyệt'
              : 'Bạn chưa tạo công việc cá nhân'
          }
        >
          {!reviewMode && (
            <Button type="primary" icon={<FiPlus />} onClick={openCreate}>
              Tạo việc đầu tiên
            </Button>
          )}
        </Empty>
      )
    }

    return (
      <div className={styles.taskGrid}>
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            className={styles.taskCard}
            onClick={() => navigate(`/app/tasks/${task.id}`)}
          >
            <span className={styles.cardTop}>
              <span className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`}>
                {getPriorityLabel(task.priority)}
              </span>
              <span className={`${styles.status} ${styles[task.status.toLowerCase()]}`}>
                {getStatusLabel(task.status)}
              </span>
            </span>
            <strong>{task.title}</strong>
            <p>{task.description || 'Không có mô tả công việc.'}</p>
            <span className={styles.reviewer}>
              {reviewMode ? (
                <><FiUser /> Người thực hiện: <b>{task.assigned_to_name}</b></>
              ) : task.requires_review ? (
                <><FiShield /> Người duyệt: <b>{task.reviewer_name}</b></>
              ) : (
                <><FiCheckCircle /> Tự hoàn thành, không cần duyệt</>
              )}
            </span>
            <span className={styles.cardBottom}>
              <small><FiClock /> Hạn {formatDateTime(task.due_date)}</small>
              <FiArrowRight />
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>KẾ HOẠCH CỦA TÔI</span>
          <h1>Việc cá nhân</h1>
          <p>Tự quản lý công việc mặc định và chọn người duyệt khi cần xác nhận kết quả.</p>
        </div>
        <Button type="primary" icon={<FiPlus />} onClick={openCreate}>
          Tạo việc cá nhân
        </Button>
      </header>

      <section className={styles.summaryGrid}>
        <article>
          <span><FiUser /></span>
          <div><small>Việc của tôi</small><strong>{personalTasks?.length || 0}</strong></div>
        </article>
        <article>
          <span><FiShield /></span>
          <div><small>Đang chờ tôi duyệt</small><strong>{waitingReviews}</strong></div>
        </article>
      </section>

      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message={error}
          className={styles.alert}
          onClose={() => setError('')}
        />
      )}

      <section className={styles.panel}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            activeTab === 'mine' ? (
              <Select
                allowClear
                className={styles.statusFilter}
                placeholder="Tất cả trạng thái"
                options={taskStatuses}
                value={status}
                onChange={setStatus}
              />
            ) : null
          }
          items={[
            {
              key: 'mine',
              label: `Việc của tôi (${personalTasks?.length || 0})`,
              children: personalTasks === null
                ? <Skeleton active paragraph={{ rows: 7 }} />
                : renderTaskList(personalTasks),
            },
            {
              key: 'review',
              label: `Tôi duyệt (${waitingReviews})`,
              children: renderTaskList(reviewTasks, true),
            },
          ]}
        />
      </section>

      <Modal
        title="Tạo việc cá nhân"
        open={modalOpen}
        onCancel={closeCreate}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={createTask}>
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[
              { required: true, message: 'Nhập tiêu đề công việc.' },
              { max: 200 },
            ]}
          >
            <Input placeholder="Ví dụ: Đăng bài Facebook hằng ngày" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={4} placeholder="Nội dung và kết quả cần hoàn thành" />
          </Form.Item>
          <Form.Item
            name="reviewer_id"
            label="Người duyệt kết quả"
            extra="Để trống nếu công việc không cần ai duyệt. Task sẽ hoàn thành ngay khi bạn gửi kết quả."
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Không cần duyệt"
              options={reviewers.map((reviewer) => ({
                value: reviewer.id,
                label: `${reviewer.full_name} · ${reviewer.phone}`,
              }))}
            />
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
            <Button onClick={closeCreate} disabled={submitting}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Tạo công việc
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
