import {
  Alert,
  App,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
} from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiEye,
  FiPlus,
  FiSend,
  FiUser,
  FiX,
  FiZap,
} from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router'
import {
  approveInitiativeApi,
  createInitiativeApi,
  getInitiativesApi,
  rejectInitiativeApi,
} from '../../api/initiativeApi'
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'
import { formatDateTime, priorityOptions } from '../../utils/task'
import styles from './InitiativesPage.module.css'

const statusMeta = {
  PENDING: { label: 'Chờ duyệt', color: 'gold' },
  APPROVED: { label: 'Đã duyệt', color: 'green' },
  REJECTED: { label: 'Không duyệt', color: 'red' },
}

export default function InitiativesPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [createForm] = Form.useForm()
  const [reviewForm] = Form.useForm()
  const [mine, setMine] = useState(null)
  const [toReview, setToReview] = useState([])
  const [manager, setManager] = useState(null)
  const [pendingReviewTotal, setPendingReviewTotal] = useState(0)
  const [view, setView] = useState('mine')
  const [status, setStatus] = useState()
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewMode, setReviewMode] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setError('')
    try {
      const response = await getInitiativesApi()
      setMine(response.data.mine || [])
      setToReview(response.data.to_review || [])
      setManager(response.data.manager || null)
      setPendingReviewTotal(response.data.pending_review_total || 0)
    } catch (loadError) {
      setError(
        loadError.response?.data?.message
          || 'Không thể tải danh sách sáng kiến.',
      )
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(loadData)
  }, [loadData])

  useRealtimeRefresh(loadData, 'initiative')

  const allInitiatives = useMemo(
    () => [...(mine || []), ...toReview],
    [mine, toReview],
  )
  const selected = allInitiatives.find(
    (item) => item.id === searchParams.get('initiative'),
  ) || null

  const source = view === 'mine' ? (mine || []) : toReview
  const filtered = status
    ? source.filter((item) => item.status === status)
    : source

  const mineStats = useMemo(() => ({
    total: (mine || []).length,
    pending: (mine || []).filter((item) => item.status === 'PENDING').length,
    approved: (mine || []).filter((item) => item.status === 'APPROVED').length,
  }), [mine])

  const openDetail = (initiative) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.set('initiative', initiative.id)
      return next
    })
  }

  const closeDetail = () => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.delete('initiative')
      return next
    }, { replace: true })
  }

  const submitInitiative = async (values) => {
    setSubmitting(true)
    setError('')
    try {
      await createInitiativeApi(values)
      message.success('Đã gửi sáng kiến đến quản lý trực tiếp.')
      setCreateOpen(false)
      createForm.resetFields()
      await loadData()
    } catch (submitError) {
      setError(
        submitError.response?.data?.message
          || 'Không thể gửi sáng kiến.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const closeCreateModal = () => {
    if (submitting) return
    setCreateOpen(false)
    createForm.resetFields()
  }

  const openReview = (mode) => {
    setReviewMode(mode)
    reviewForm.resetFields()
    if (mode === 'approve') {
      reviewForm.setFieldsValue({ priority: 'MEDIUM' })
    }
  }

  const closeReviewModal = () => {
    if (submitting) return
    setReviewMode(null)
    reviewForm.resetFields()
  }

  const submitReview = async (values) => {
    if (!selected) return

    setSubmitting(true)
    setError('')
    try {
      await (reviewMode === 'approve'
        ? approveInitiativeApi(selected.id, {
            priority: values.priority,
            due_date: values.due_date?.toISOString(),
            review_comment: values.review_comment,
          })
        : rejectInitiativeApi(selected.id, {
            review_comment: values.review_comment,
          }))

      setReviewMode(null)
      reviewForm.resetFields()
      message.success(
        reviewMode === 'approve'
          ? 'Đã duyệt sáng kiến và tạo task.'
          : 'Đã phản hồi không duyệt sáng kiến.',
      )
      await loadData()
    } catch (reviewError) {
      setError(
        reviewError.response?.data?.message
          || 'Không thể xử lý sáng kiến.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span>ĐỀ XUẤT CẢI TIẾN</span>
          <h1>Sáng kiến và ý tưởng mới</h1>
          <p>Gửi đề xuất tới quản lý và theo dõi quá trình phê duyệt.</p>
        </div>
        <Tooltip
          title={!manager ? 'Tài khoản cần có quản lý trực tiếp để gửi sáng kiến' : ''}
        >
          <span>
            <Button
              type="primary"
              icon={<FiPlus />}
              disabled={!manager}
              onClick={() => setCreateOpen(true)}
            >
              Gửi sáng kiến
            </Button>
          </span>
        </Tooltip>
      </header>

      {error && (
        <Alert
          type="error"
          showIcon
          closable
          title={error}
          onClose={() => setError('')}
          className={styles.alert}
        />
      )}

      {mine && !manager && (
        <Alert
          type="warning"
          showIcon
          title="Bạn chưa có quản lý trực tiếp"
          description="Liên hệ quản trị viên để cập nhật người quản lý trước khi gửi sáng kiến."
          className={styles.alert}
        />
      )}

      <section className={styles.summary}>
        <div>
          <span className={styles.summaryIcon}><FiZap /></span>
          <span><small>Tổng đề xuất</small><strong>{mineStats.total}</strong></span>
        </div>
        <div>
          <span className={styles.summaryIcon}><FiClock /></span>
          <span><small>Đang chờ duyệt</small><strong>{mineStats.pending}</strong></span>
        </div>
        <div>
          <span className={styles.summaryIcon}><FiCheck /></span>
          <span><small>Đã thành task</small><strong>{mineStats.approved}</strong></span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <Segmented
            value={view}
            onChange={(value) => {
              setView(value)
              setStatus(undefined)
            }}
            options={[
              {
                value: 'mine',
                label: `Sáng kiến của tôi (${mine?.length || 0})`,
              },
              {
                value: 'review',
                label: `Cần tôi duyệt (${pendingReviewTotal})`,
              },
            ]}
          />
          <Select
            allowClear
            value={status}
            onChange={setStatus}
            placeholder="Tất cả trạng thái"
            options={Object.entries(statusMeta).map(([value, item]) => ({
              value,
              label: item.label,
            }))}
          />
        </div>

        {!mine ? (
          <div className={styles.loading}><Skeleton active paragraph={{ rows: 6 }} /></div>
        ) : filtered.length === 0 ? (
          <Empty
            className={styles.empty}
            description={
              view === 'mine'
                ? 'Chưa có sáng kiến phù hợp'
                : 'Không có sáng kiến cần xử lý'
            }
          />
        ) : (
          <div className={styles.list}>
            {filtered.map((initiative) => {
              const meta = statusMeta[initiative.status]
              return (
                <button
                  type="button"
                  key={initiative.id}
                  className={styles.row}
                  onClick={() => openDetail(initiative)}
                >
                  <span className={styles.rowIcon}><FiZap /></span>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTop}>
                      <strong>{initiative.title}</strong>
                      <Tag color={meta.color}>{meta.label}</Tag>
                    </span>
                    <span className={styles.description}>
                      {initiative.description}
                    </span>
                    <span className={styles.meta}>
                      <span>
                        <FiUser />
                        {view === 'mine'
                          ? `Người duyệt: ${initiative.reviewer_name}`
                          : `Người đề xuất: ${initiative.proposed_by_name}`}
                      </span>
                      <span><FiClock /> {formatDateTime(initiative.submitted_at)}</span>
                    </span>
                  </span>
                  <FiArrowRight className={styles.arrow} />
                </button>
              )
            })}
          </div>
        )}
      </section>

      <Modal
        title="Gửi sáng kiến mới"
        open={createOpen}
        footer={null}
        destroyOnHidden
        onCancel={closeCreateModal}
      >
        <Form form={createForm} layout="vertical" onFinish={submitInitiative}>
          <Alert
            type="info"
            showIcon
            title={`Người nhận: ${manager?.full_name || 'Chưa xác định'}`}
            className={styles.formAlert}
          />
          <Form.Item
            name="title"
            label="Tên sáng kiến"
            rules={[
              { required: true, message: 'Nhập tên sáng kiến' },
              { max: 200 },
            ]}
          >
            <Input placeholder="Ví dụ: Rút ngắn quy trình tổng hợp báo cáo" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Nội dung đề xuất"
            rules={[
              { required: true, message: 'Mô tả nội dung sáng kiến' },
              { max: 10000 },
            ]}
          >
            <Input.TextArea
              rows={6}
              showCount
              maxLength={10000}
              placeholder="Vấn đề hiện tại, cách cải tiến và cách thực hiện..."
            />
          </Form.Item>
          <Form.Item
            name="expected_benefit"
            label="Lợi ích dự kiến"
            rules={[{ max: 5000 }]}
          >
            <Input.TextArea
              rows={3}
              showCount
              maxLength={5000}
              placeholder="Thời gian, chi phí hoặc chất lượng có thể cải thiện..."
            />
          </Form.Item>
          <div className={styles.modalActions}>
            <Button onClick={closeCreateModal} disabled={submitting}>
              Đóng
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<FiSend />}
            >
              Gửi quản lý
            </Button>
          </div>
        </Form>
      </Modal>

      <Drawer
        title="Chi tiết sáng kiến"
        open={Boolean(selected)}
        onClose={closeDetail}
        size="min(560px, 100vw)"
      >
        {selected && (
          <div className={styles.detail}>
            <div className={styles.detailHead}>
              <span className={styles.detailIcon}><FiZap /></span>
              <div>
                <Tag color={statusMeta[selected.status].color}>
                  {statusMeta[selected.status].label}
                </Tag>
                <h2>{selected.title}</h2>
              </div>
            </div>

            <dl className={styles.people}>
              <div><dt>Người đề xuất</dt><dd>{selected.proposed_by_name}</dd></div>
              <div><dt>Người duyệt</dt><dd>{selected.reviewer_name}</dd></div>
              <div><dt>Ngày gửi</dt><dd>{formatDateTime(selected.submitted_at)}</dd></div>
              <div>
                <dt>Ngày xử lý</dt>
                <dd>{selected.reviewed_at ? formatDateTime(selected.reviewed_at) : 'Chưa xử lý'}</dd>
              </div>
            </dl>

            <section className={styles.detailSection}>
              <span>NỘI DUNG ĐỀ XUẤT</span>
              <p>{selected.description}</p>
            </section>

            <section className={styles.detailSection}>
              <span>LỢI ÍCH DỰ KIẾN</span>
              <p>{selected.expected_benefit || 'Chưa cung cấp.'}</p>
            </section>

            {selected.review_comment && (
              <section className={styles.reviewComment}>
                <span>PHẢN HỒI CỦA QUẢN LÝ</span>
                <p>{selected.review_comment}</p>
              </section>
            )}

            {selected.can_review && (
              <Space className={styles.reviewActions}>
                <Button
                  danger
                  icon={<FiX />}
                  onClick={() => openReview('reject')}
                >
                  Không duyệt
                </Button>
                <Button
                  type="primary"
                  icon={<FiCheck />}
                  onClick={() => openReview('approve')}
                >
                  Duyệt và tạo task
                </Button>
              </Space>
            )}

            {selected.approved_task_id && (
              <Button
                type="primary"
                ghost
                block
                icon={<FiEye />}
                onClick={() => navigate(`/app/tasks/${selected.approved_task_id}`)}
              >
                Mở công việc đã tạo
              </Button>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        title={reviewMode === 'approve' ? 'Duyệt và tạo task' : 'Không duyệt sáng kiến'}
        open={Boolean(reviewMode)}
        footer={null}
        destroyOnHidden
        onCancel={closeReviewModal}
      >
        <Form form={reviewForm} layout="vertical" onFinish={submitReview}>
          {reviewMode === 'approve' && (
            <div className={styles.formGrid}>
              <Form.Item name="priority" label="Mức ưu tiên">
                <Select options={priorityOptions} />
              </Form.Item>
              <Form.Item name="due_date" label="Deadline">
                <DatePicker
                  showTime
                  needConfirm={false}
                  format="DD/MM/YYYY HH:mm"
                  className={styles.fullWidth}
                  placeholder="Chọn thời hạn"
                />
              </Form.Item>
            </div>
          )}
          <Form.Item
            name="review_comment"
            label={reviewMode === 'approve' ? 'Ghi chú khi duyệt' : 'Lý do không duyệt'}
            rules={
              reviewMode === 'reject'
                ? [{ required: true, message: 'Nhập lý do không duyệt' }]
                : []
            }
          >
            <Input.TextArea
              rows={4}
              maxLength={5000}
              placeholder={
                reviewMode === 'approve'
                  ? 'Phạm vi hoặc lưu ý khi triển khai...'
                  : 'Giải thích để người đề xuất hiểu và cải thiện...'
              }
            />
          </Form.Item>
          <div className={styles.modalActions}>
            <Button onClick={closeReviewModal} disabled={submitting}>
              Đóng
            </Button>
            <Button
              type="primary"
              danger={reviewMode === 'reject'}
              htmlType="submit"
              loading={submitting}
            >
              {reviewMode === 'approve' ? 'Duyệt sáng kiến' : 'Xác nhận không duyệt'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
