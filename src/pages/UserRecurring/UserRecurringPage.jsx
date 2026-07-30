import {
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiCalendar,
  FiEdit2,
  FiEye,
  FiPlay,
  FiPlus,
  FiPower,
  FiSearch,
} from 'react-icons/fi'
import {
  createRecurringTemplateApi,
  generateRecurringTaskApi,
  getRecurringTemplateTasksApi,
  getRecurringTemplatesApi,
  setRecurringTemplateActiveApi,
  updateRecurringTemplateApi,
} from '../../api/recurringTaskApi'
import { getPersonalTaskReviewersApi, getUsersApi } from '../../api/userApi'
import { useAuth } from '../../contexts/useAuth'
import { getPriorityLabel, getStatusLabel, priorityOptions } from '../../utils/task'
import styles from './UserRecurringPage.module.css'

const frequencyOptions = [
  { value: 'DAILY', label: 'Hằng ngày' },
  { value: 'WEEKLY', label: 'Hằng tuần' },
  { value: 'MONTHLY', label: 'Hằng tháng' },
]

const weekdayOptions = [
  { value: 1, label: 'Thứ Hai' },
  { value: 2, label: 'Thứ Ba' },
  { value: 3, label: 'Thứ Tư' },
  { value: 4, label: 'Thứ Năm' },
  { value: 5, label: 'Thứ Sáu' },
  { value: 6, label: 'Thứ Bảy' },
  { value: 7, label: 'Chủ Nhật' },
]

const frequencyLabel = (frequency) =>
  frequencyOptions.find((item) => item.value === frequency)?.label || frequency

const scheduleLabel = (template) => {
  if (!template) return 'Chưa có lịch'
  if (template.frequency === 'DAILY') return 'Tạo mỗi ngày'
  if (template.frequency === 'WEEKLY') {
    const generateDay = Number(template.generate_day)
    return `Tạo vào ${weekdayOptions.find((item) => item.value === generateDay)?.label || 'ngày đã chọn'}`
  }
  return `Tạo ngày ${template.generate_day || 1} mỗi tháng`
}

export default function UserRecurringPage() {
  const { user } = useAuth()
  const [templateForm] = Form.useForm()
  const [generateForm] = Form.useForm()
  const [templates, setTemplates] = useState([])
  const [assignees, setAssignees] = useState([])
  const [reviewers, setReviewers] = useState([])
  const [generatedTasks, setGeneratedTasks] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState()
  const [loading, setLoading] = useState(true)
  const [taskLoading, setTaskLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const selectedFrequency = Form.useWatch('frequency', templateForm)
  const selectedAssignee = Form.useWatch('assigned_to', templateForm)

  const loadPage = useCallback(async () => {
    setLoading(true)
    try {
      const [templateResponse, userResponse, reviewerResponse] = await Promise.all([
        getRecurringTemplatesApi(),
        getUsersApi({ is_active: true }),
        getPersonalTaskReviewersApi().catch(() => ({ data: { reviewers: [] } })),
      ])
      setTemplates(
        Array.isArray(templateResponse.data.templates)
          ? templateResponse.data.templates
          : [],
      )
      setAssignees(
        Array.isArray(userResponse.data.users)
          ? userResponse.data.users
          : [],
      )
      setReviewers(
        Array.isArray(reviewerResponse.data.reviewers)
          ? reviewerResponse.data.reviewers
          : [],
      )
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải danh sách task định kỳ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(loadPage)
  }, [loadPage])

  const usersById = useMemo(
    () => ({
      [user.id]: user,
      ...Object.fromEntries(assignees.map((item) => [item.id, item])),
    }),
    [assignees, user],
  )

  const filteredTemplates = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi')
    return templates.filter((item) => {
      const matchesKeyword = !keyword
        || String(item.title || '').toLocaleLowerCase('vi').includes(keyword)
      const matchesStatus = status === undefined || item.is_active === status
      return matchesKeyword && matchesStatus
    })
  }, [search, status, templates])

  const openCreate = () => {
    setEditingTemplate(null)
    templateForm.resetFields()
    templateForm.setFieldsValue({
      priority: 'MEDIUM',
      frequency: 'MONTHLY',
      generate_day: 1,
      due_after_days: 4,
      assigned_to: user.id,
      reviewer_id: undefined,
    })
    setFormOpen(true)
  }

  const openEdit = (template) => {
    setEditingTemplate(template)
    templateForm.setFieldsValue({
      title: template.title,
      description: template.description,
      assigned_to: template.assigned_to,
      reviewer_id: template.reviewer_id || undefined,
      frequency: template.frequency,
      generate_day: template.generate_day,
      due_after_days: template.due_after_days,
      priority: template.priority,
    })
    setFormOpen(true)
  }

  const saveTemplate = async (values) => {
    setSubmitting(true)
    try {
      if (editingTemplate) {
        await updateRecurringTemplateApi(editingTemplate.id, values)
        message.success('Đã cập nhật mẫu task định kỳ.')
      } else {
        await createRecurringTemplateApi(values)
        message.success('Đã tạo mẫu task định kỳ.')
      }
      setFormOpen(false)
      templateForm.resetFields()
      await loadPage()
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể lưu mẫu task định kỳ.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTemplate = async (template) => {
    try {
      await setRecurringTemplateActiveApi(template.id, !template.is_active)
      message.success(template.is_active ? 'Đã tạm ngưng mẫu.' : 'Đã kích hoạt mẫu.')
      await loadPage()
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể thay đổi trạng thái mẫu.')
    }
  }

  const openGenerate = (template) => {
    setSelectedTemplate(template)
    generateForm.setFieldsValue({ period: dayjs() })
    setGenerateOpen(true)
  }

  const generateTask = async ({ period }) => {
    setSubmitting(true)
    try {
      await generateRecurringTaskApi({
        template_id: selectedTemplate.id,
        date: period.format('YYYY-MM-DD'),
      })
      message.success('Đã sinh task cho kỳ đã chọn.')
      setGenerateOpen(false)
      await loadPage()
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể sinh task cho kỳ đã chọn.')
    } finally {
      setSubmitting(false)
    }
  }

  const viewGeneratedTasks = async (template) => {
    setSelectedTemplate(template)
    setGeneratedTasks([])
    setDrawerOpen(true)
    setTaskLoading(true)
    try {
      const response = await getRecurringTemplateTasksApi(template.id)
      setGeneratedTasks(response.data.tasks || [])
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải lịch sử task.')
    } finally {
      setTaskLoading(false)
    }
  }

  const columns = [
    {
      title: 'Mẫu công việc',
      dataIndex: 'title',
      key: 'title',
      width: 280,
      render: (value, row) => (
        <div className={styles.nameCell}>
          <strong>{value}</strong>
          <span>{row.description || 'Không có mô tả'}</span>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      key: 'role',
      width: 125,
      render: (_, row) => (
        <Tag color={row.is_personal ? 'green' : row.created_by === user.id ? 'cyan' : 'blue'}>
          {row.is_personal ? 'Cá nhân' : row.created_by === user.id ? 'Tôi tạo' : 'Được giao'}
        </Tag>
      ),
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'assigned_to',
      key: 'assignee',
      width: 180,
      render: (value) => usersById[value]?.full_name || 'Nhân sự hiện tại',
    },
    {
      title: 'Người duyệt',
      dataIndex: 'reviewer_name',
      key: 'reviewer',
      width: 170,
      render: (value, row) => row.requires_review ? value || 'Chưa xác định' : 'Không cần duyệt',
    },
    {
      title: 'Chu kỳ',
      key: 'schedule',
      width: 190,
      render: (_, row) => (
        <div className={styles.schedule}>
          <span>{frequencyLabel(row.frequency)}</span>
          <small>{scheduleLabel(row)} · hạn sau {row.due_after_days} ngày</small>
        </div>
      ),
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (value) => <Tag>{getPriorityLabel(value)}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'status',
      width: 120,
      render: (value) => (
        <Tag color={value ? 'green' : 'default'}>{value ? 'Đang chạy' : 'Tạm ngưng'}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      fixed: 'right',
      width: 170,
      render: (_, row) => {
        const canManage = row.created_by === user.id
        return (
          <Space size={2}>
            <Tooltip title="Xem task đã sinh">
              <Button type="text" icon={<FiEye />} onClick={() => viewGeneratedTasks(row)} />
            </Tooltip>
            {canManage && (
              <>
                <Tooltip title="Chỉnh sửa mẫu">
                  <Button type="text" icon={<FiEdit2 />} onClick={() => openEdit(row)} />
                </Tooltip>
                <Tooltip title="Sinh task cho một kỳ">
                  <Button
                    type="text"
                    icon={<FiPlay />}
                    disabled={!row.is_active}
                    onClick={() => openGenerate(row)}
                  />
                </Tooltip>
                <Popconfirm
                  title={row.is_active ? 'Tạm ngưng mẫu này?' : 'Kích hoạt lại mẫu này?'}
                  onConfirm={() => toggleTemplate(row)}
                  okText="Xác nhận"
                  cancelText="Đóng"
                >
                  <Tooltip title={row.is_active ? 'Tạm ngưng' : 'Kích hoạt'}>
                    <Button type="text" danger={row.is_active} icon={<FiPower />} />
                  </Tooltip>
                </Popconfirm>
              </>
            )}
          </Space>
        )
      },
    },
  ]

  const taskColumns = [
    {
      title: 'Kỳ',
      key: 'period',
      width: 120,
      render: (_, row) => row.period_date
        ? dayjs(row.period_date).format('DD/MM/YYYY')
        : `${String(row.period_month).padStart(2, '0')}/${row.period_year}`,
    },
    { title: 'Công việc', dataIndex: 'title', key: 'title' },
    {
      title: 'Người liên quan',
      key: 'participantName',
      width: 170,
      render: (_, row) => row.created_by === user.id
        ? `Người thực hiện: ${
          row.assigned_to_name
            || usersById[row.assigned_to]?.full_name
            || 'Chưa xác định'
        }`
        : `Người giao: ${
          row.created_by_name
            || usersById[row.created_by]?.full_name
            || 'Chưa xác định'
        }`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (value) => <Tag>{getStatusLabel(value)}</Tag>,
    },
    {
      title: 'Deadline',
      dataIndex: 'due_date',
      key: 'dueDate',
      width: 140,
      render: (value) => value ? dayjs(value).format('DD/MM/YYYY') : 'Chưa có',
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>LẬP KẾ HOẠCH ĐỊNH KỲ</span>
          <h1>Task định kỳ</h1>
          <p>Tạo công việc lặp lại hằng ngày, hằng tuần hoặc hằng tháng.</p>
        </div>
        <Button type="primary" icon={<FiPlus />} onClick={openCreate}>
          Tạo mẫu
        </Button>
      </header>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <Input
            allowClear
            prefix={<FiSearch />}
            placeholder="Tìm mẫu công việc..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            value={status}
            onChange={setStatus}
            options={[
              { value: true, label: 'Đang chạy' },
              { value: false, label: 'Tạm ngưng' },
            ]}
          />
          <span>{filteredTemplates.length} mẫu</span>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredTemplates}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1330 }}
          locale={{ emptyText: <Empty description="Chưa có mẫu task định kỳ" /> }}
        />
      </section>

      <Modal
        title={editingTemplate ? 'Chỉnh sửa mẫu định kỳ' : 'Tạo mẫu định kỳ'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={templateForm} layout="vertical" onFinish={saveTemplate}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }, { max: 200 }]}>
            <Input placeholder="Ví dụ: Báo cáo kết quả kinh doanh tháng" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Yêu cầu và kết quả cần hoàn thành" />
          </Form.Item>
          <Form.Item name="assigned_to" label="Người thực hiện" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              onChange={() => templateForm.setFieldValue('reviewer_id', undefined)}
              options={[
                { value: user.id, label: `${user.full_name} · Bản thân` },
                ...assignees
                  .filter((item) => item.id !== user.id)
                  .map((item) => ({
                    value: item.id,
                    label: `${item.full_name} · ${item.phone}`,
                  })),
              ]}
            />
          </Form.Item>
          {selectedAssignee === user.id && (
            <Form.Item
              name="reviewer_id"
              label="Người duyệt kết quả"
              extra="Để trống nếu task tự hoàn thành ngay sau khi bạn gửi kết quả."
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
          )}
          <Form.Item
            name="frequency"
            label="Chu kỳ lặp lại"
            rules={[{ required: true, message: 'Chọn chu kỳ lặp lại.' }]}
          >
            <Select
              options={frequencyOptions}
              onChange={() => templateForm.setFieldValue('generate_day', 1)}
            />
          </Form.Item>
          <div className={styles.formGrid}>
            {selectedFrequency === 'WEEKLY' && (
              <Form.Item
                name="generate_day"
                label="Ngày tạo trong tuần"
                rules={[{ required: true }]}
              >
                <Select options={weekdayOptions} />
              </Form.Item>
            )}
            {selectedFrequency === 'MONTHLY' && (
              <Form.Item
                name="generate_day"
                label="Ngày tạo trong tháng"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={31} className={styles.fullWidth} />
              </Form.Item>
            )}
            <Form.Item
              name="due_after_days"
              label="Thời hạn hoàn thành"
              extra="0 là hết hạn cuối ngày phát sinh."
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0}
                max={365}
                suffix="ngày"
                className={styles.fullWidth}
              />
            </Form.Item>
          </div>
          <Form.Item name="priority" label="Mức ưu tiên">
            <Select options={priorityOptions} />
          </Form.Item>
          <div className={styles.modalActions}>
            <Button onClick={() => setFormOpen(false)}>Đóng</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>Lưu mẫu</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`Sinh task · ${selectedTemplate?.title || ''}`}
        open={generateOpen}
        onCancel={() => setGenerateOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={generateForm} layout="vertical" onFinish={generateTask}>
          <Form.Item name="period" label="Kỳ công việc" rules={[{ required: true }]}>
            <DatePicker
              picker={
                selectedTemplate?.frequency === 'MONTHLY'
                  ? 'month'
                  : selectedTemplate?.frequency === 'WEEKLY'
                    ? 'week'
                    : 'date'
              }
              format={
                selectedTemplate?.frequency === 'MONTHLY'
                  ? 'MM/YYYY'
                  : selectedTemplate?.frequency === 'WEEKLY'
                    ? '[Tuần] wo/YYYY'
                    : 'DD/MM/YYYY'
              }
              className={styles.fullWidth}
            />
          </Form.Item>
          <p className={styles.hint}>
            Mỗi mẫu chỉ sinh một task cho cùng một ngày phát sinh.
          </p>
          <div className={styles.modalActions}>
            <Button onClick={() => setGenerateOpen(false)}>Đóng</Button>
            <Button type="primary" htmlType="submit" loading={submitting} icon={<FiCalendar />}>
              Sinh task
            </Button>
          </div>
        </Form>
      </Modal>

      <Drawer
        title="Công việc đã sinh"
        width={760}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedTemplate && (
          <div className={styles.drawerHeader}>
            <span><FiCalendar /></span>
            <div>
              <strong>{selectedTemplate.title}</strong>
              <small>
                {scheduleLabel(selectedTemplate)} · Hạn sau {selectedTemplate.due_after_days} ngày
              </small>
            </div>
          </div>
        )}
        <Table
          rowKey="id"
          columns={taskColumns}
          dataSource={generatedTasks}
          loading={taskLoading}
          pagination={false}
          scroll={{ x: 620 }}
          locale={{ emptyText: <Empty description="Mẫu này chưa sinh công việc" /> }}
        />
      </Drawer>
    </div>
  )
}
