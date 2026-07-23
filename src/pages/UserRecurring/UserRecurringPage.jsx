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
import { getUsersApi } from '../../api/userApi'
import { useAuth } from '../../contexts/useAuth'
import { getPriorityLabel, getStatusLabel, priorityOptions } from '../../utils/task'
import styles from './UserRecurringPage.module.css'

export default function UserRecurringPage() {
  const { user } = useAuth()
  const [templateForm] = Form.useForm()
  const [generateForm] = Form.useForm()
  const [templates, setTemplates] = useState([])
  const [assignees, setAssignees] = useState([])
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

  const loadPage = useCallback(async () => {
    setLoading(true)
    try {
      const [templateResponse, userResponse] = await Promise.all([
        getRecurringTemplatesApi(),
        getUsersApi({ is_active: true }),
      ])
      setTemplates(templateResponse.data.templates || [])
      setAssignees(userResponse.data.users || [])
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
        || item.title.toLocaleLowerCase('vi').includes(keyword)
      const matchesStatus = status === undefined || item.is_active === status
      return matchesKeyword && matchesStatus
    })
  }, [search, status, templates])

  const openCreate = () => {
    setEditingTemplate(null)
    templateForm.resetFields()
    templateForm.setFieldsValue({ priority: 'MEDIUM', generate_day: 1, due_day: 5 })
    setFormOpen(true)
  }

  const openEdit = (template) => {
    setEditingTemplate(template)
    templateForm.setFieldsValue({
      title: template.title,
      description: template.description,
      assigned_to: template.assigned_to,
      generate_day: template.generate_day,
      due_day: template.due_day,
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
    generateForm.setFieldsValue({ period: dayjs().startOf('month') })
    setGenerateOpen(true)
  }

  const generateTask = async ({ period }) => {
    setSubmitting(true)
    try {
      await generateRecurringTaskApi({
        template_id: selectedTemplate.id,
        year: period.year(),
        month: period.month() + 1,
      })
      message.success(`Đã sinh task kỳ ${period.format('MM/YYYY')}.`)
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
        <Tag color={row.created_by === user.id ? 'green' : 'blue'}>
          {row.created_by === user.id ? 'Tôi tạo' : 'Được giao'}
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
      title: 'Lịch hàng tháng',
      key: 'schedule',
      width: 155,
      render: (_, row) => (
        <div className={styles.schedule}>
          <span>Tạo ngày {row.generate_day}</span>
          <small>Hạn ngày {row.due_day}</small>
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
                <Tooltip title="Sinh task theo tháng">
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
      width: 100,
      render: (_, row) => `${String(row.period_month).padStart(2, '0')}/${row.period_year}`,
    },
    { title: 'Công việc', dataIndex: 'title', key: 'title' },
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
          <p>Tạo mẫu công việc hàng tháng và quản lý các kỳ đã phát sinh.</p>
        </div>
        <Button type="primary" icon={<FiPlus />} onClick={openCreate} disabled={!assignees.length}>
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
          scroll={{ x: 1160 }}
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
              options={assignees.map((item) => ({
                value: item.id,
                label: `${item.full_name} · ${item.phone}`,
              }))}
            />
          </Form.Item>
          <div className={styles.formGrid}>
            <Form.Item name="generate_day" label="Ngày tạo hàng tháng" rules={[{ required: true }]}>
              <InputNumber min={1} max={31} className={styles.fullWidth} />
            </Form.Item>
            <Form.Item name="due_day" label="Ngày hết hạn" rules={[{ required: true }]}>
              <InputNumber min={1} max={31} className={styles.fullWidth} />
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
            <DatePicker picker="month" format="MM/YYYY" className={styles.fullWidth} />
          </Form.Item>
          <p className={styles.hint}>Mỗi mẫu chỉ sinh một task cho mỗi tháng.</p>
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
              <small>Tạo ngày {selectedTemplate.generate_day} · Hạn ngày {selectedTemplate.due_day}</small>
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
