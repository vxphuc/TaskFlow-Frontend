import { Alert, Button, Input, Modal, Spin, Tooltip } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiArrowUp,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiFileText,
  FiMessageSquare,
  FiPlus,
  FiThumbsDown,
  FiThumbsUp,
  FiTrash2,
} from 'react-icons/fi'
import { useNavigate } from 'react-router'
import {
  createAIConversationApi,
  deleteAIConversationApi,
  getAIConversationApi,
  getAIConversationsApi,
  getAIStatusApi,
  sendAIMessageApi,
  sendAIMessageFeedbackApi,
} from '../../api/aiApi'
import { formatDateTime } from '../../utils/task'
import styles from './AIAssistantPage.module.css'

const suggestions = [
  { icon: FiClock, label: 'Task nào của tôi sắp quá hạn?' },
  { icon: FiCheckCircle, label: 'Tôi còn kết quả nào đang chờ duyệt?' },
  { icon: FiFileText, label: 'Tóm tắt hiệu suất tháng này của tôi.' },
  { icon: FiMessageSquare, label: 'Hướng dẫn tôi cách gửi và thu hồi kết quả.' },
]

export default function AIAssistantPage() {
  const navigate = useNavigate()
  const bottomRef = useRef(null)
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [conversationLoading, setConversationLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const loadConversation = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([])
      return
    }
    setConversationLoading(true)
    setError('')
    try {
      const response = await getAIConversationApi(conversationId)
      setMessages(response.data.conversation?.messages || [])
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Không thể tải cuộc hội thoại.')
    } finally {
      setConversationLoading(false)
    }
  }, [])

  const loadConversations = useCallback(async (preferredId = null) => {
    const response = await getAIConversationsApi()
    const items = response.data.conversations || []
    setConversations(items)
    const nextId = preferredId || activeId || items[0]?.id || null
    setActiveId(nextId)
    return nextId
  }, [activeId])

  useEffect(() => {
    let cancelled = false
    const initialize = async () => {
      setLoading(true)
      setError('')
      try {
        const [statusResponse, conversationsResponse] = await Promise.all([
          getAIStatusApi(),
          getAIConversationsApi(),
        ])
        if (cancelled) return
        const items = conversationsResponse.data.conversations || []
        const firstId = items[0]?.id || null
        setStatus(statusResponse.data)
        setConversations(items)
        setActiveId(firstId)
        if (firstId) {
          const detailResponse = await getAIConversationApi(firstId)
          if (!cancelled) setMessages(detailResponse.data.conversation?.messages || [])
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.response?.data?.message || 'Không thể khởi tạo trợ lý AI.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    initialize()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const selectConversation = async (conversationId) => {
    if (conversationId === activeId) return
    setActiveId(conversationId)
    await loadConversation(conversationId)
  }

  const createConversation = async () => {
    setError('')
    try {
      const response = await createAIConversationApi()
      const conversation = response.data.conversation
      setConversations((items) => [conversation, ...items])
      setActiveId(conversation.id)
      setMessages([])
      setInput('')
      return conversation.id
    } catch (createError) {
      setError(createError.response?.data?.message || 'Không thể tạo cuộc hội thoại.')
      return null
    }
  }

  const removeConversation = (event, conversationId) => {
    event.stopPropagation()
    Modal.confirm({
      title: 'Xóa cuộc hội thoại?',
      content: 'Lịch sử hỏi đáp trong cuộc hội thoại này sẽ bị xóa.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Giữ lại',
      onOk: async () => {
        await deleteAIConversationApi(conversationId)
        const remaining = conversations.filter((item) => item.id !== conversationId)
        setConversations(remaining)
        if (activeId === conversationId) {
          const nextId = remaining[0]?.id || null
          setActiveId(nextId)
          await loadConversation(nextId)
        }
      },
    })
  }

  const sendMessage = async (suggestedContent = null) => {
    const content = String(suggestedContent || input).trim()
    if (!content || sending) return
    let conversationId = activeId
    if (!conversationId) {
      conversationId = await createConversation()
      if (!conversationId) return
    }

    setSending(true)
    setError('')
    setInput('')
    setMessages((items) => [...items, {
      id: `pending-${Date.now()}`,
      role: 'USER',
      content,
      sources: [],
      created_at: new Date().toISOString(),
    }])

    try {
      const response = await sendAIMessageApi(conversationId, content)
      setMessages((items) => [...items, response.data.message])
      setStatus((current) => current ? {
        ...current,
        used_today: current.used_today + 1,
        remaining_today: response.data.usage?.remaining_today ?? current.remaining_today,
      } : current)
      await loadConversations(conversationId)
    } catch (sendError) {
      setError(sendError.response?.data?.message || 'Trợ lý AI chưa thể trả lời. Vui lòng thử lại.')
      await loadConversation(conversationId)
    } finally {
      setSending(false)
    }
  }

  const sendFeedback = async (messageId, rating) => {
    try {
      const response = await sendAIMessageFeedbackApi(messageId, rating)
      setMessages((items) => items.map((item) => (
        item.id === messageId ? { ...item, feedback: response.data.feedback } : item
      )))
    } catch (feedbackError) {
      setError(feedbackError.response?.data?.message || 'Không thể lưu đánh giá.')
    }
  }

  if (loading) return <div className={styles.pageLoading}><Spin size="large" /></div>

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>TRỢ LÝ CÔNG VIỆC</span>
          <h1>TaskFlow AI</h1>
          <p>Tra cứu công việc và hướng dẫn sử dụng trong đúng phạm vi của bạn.</p>
        </div>
        <div className={styles.quota}>
          <span>Lượt hỏi hôm nay</span>
          <strong>{status?.remaining_today ?? 0}/{status?.daily_limit ?? 0}</strong>
        </div>
      </header>

      {error && (
        <Alert className={styles.alert} type="error" showIcon closable message={error} onClose={() => setError('')} />
      )}
      {!status?.enabled && (
        <Alert className={styles.alert} type="warning" showIcon message="Trợ lý AI đang tạm tắt." />
      )}

      <div className={styles.workspace}>
        <aside className={styles.history}>
          <Button type="primary" block icon={<FiPlus />} onClick={createConversation} disabled={!status?.enabled}>
            Cuộc hội thoại mới
          </Button>
          <div className={styles.historyHeading}>Gần đây</div>
          <div className={styles.conversationList}>
            {conversations.length === 0 ? (
              <span className={styles.historyEmpty}>Chưa có lịch sử hỏi đáp</span>
            ) : conversations.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`${styles.conversationItem} ${activeId === item.id ? styles.active : ''}`}
                onClick={() => selectConversation(item.id)}
              >
                <FiMessageSquare />
                <span><strong>{item.title}</strong><small>{formatDateTime(item.updated_at)}</small></span>
                <Tooltip title="Xóa hội thoại">
                  <span
                    role="button"
                    tabIndex={0}
                    className={styles.deleteConversation}
                    onClick={(event) => removeConversation(event, item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') removeConversation(event, item.id)
                    }}
                  ><FiTrash2 /></span>
                </Tooltip>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.chat}>
          <div className={styles.chatHeader}>
            <span className={styles.aiMark}><FiCpu /></span>
            <div><strong>Trợ lý TaskFlow</strong><small>Chỉ đọc dữ liệu bạn được phép xem</small></div>
          </div>

          <div className={styles.messageArea}>
            {conversationLoading ? (
              <div className={styles.center}><Spin /></div>
            ) : messages.length === 0 ? (
              <div className={styles.welcome}>
                <span className={styles.welcomeIcon}><FiCpu /></span>
                <h2>Bạn muốn xem công việc nào?</h2>
                <p>Hỏi về task, deadline, kết quả chờ duyệt, báo cáo hoặc cách sử dụng TaskFlow.</p>
                <div className={styles.suggestions}>
                  {suggestions.map(({ icon: Icon, label }) => (
                    <button type="button" key={label} onClick={() => sendMessage(label)}>
                      <Icon /><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.messages}>
                {messages.map((item) => (
                  <article key={item.id} className={`${styles.message} ${item.role === 'USER' ? styles.userMessage : styles.aiMessage}`}>
                    <div className={styles.messageLabel}>{item.role === 'USER' ? 'Bạn' : 'TaskFlow AI'}</div>
                    <p>{item.content}</p>
                    {item.sources?.length > 0 && (
                      <div className={styles.sources}>
                        <span>Nguồn công việc</span>
                        {item.sources.map((source) => (
                          <button type="button" key={`${source.type}-${source.id}`} onClick={() => navigate(`/app/tasks/${source.id}`)}>
                            <FiFileText /> {source.title}
                          </button>
                        ))}
                      </div>
                    )}
                    {item.role === 'ASSISTANT' && !String(item.id).startsWith('pending-') && (
                      <div className={styles.feedback}>
                        <span>Câu trả lời này hữu ích?</span>
                        <Tooltip title="Hữu ích">
                          <button type="button" className={item.feedback?.rating === 'HELPFUL' ? styles.feedbackActive : ''} onClick={() => sendFeedback(item.id, 'HELPFUL')}><FiThumbsUp /></button>
                        </Tooltip>
                        <Tooltip title="Chưa hữu ích">
                          <button type="button" className={item.feedback?.rating === 'NOT_HELPFUL' ? styles.feedbackActive : ''} onClick={() => sendFeedback(item.id, 'NOT_HELPFUL')}><FiThumbsDown /></button>
                        </Tooltip>
                      </div>
                    )}
                  </article>
                ))}
                {sending && (
                  <article className={`${styles.message} ${styles.aiMessage}`}>
                    <div className={styles.messageLabel}>TaskFlow AI</div>
                    <div className={styles.typing}><span /><span /><span /></div>
                  </article>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className={styles.composer}>
            <Input.TextArea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              autoSize={{ minRows: 1, maxRows: 5 }}
              maxLength={4000}
              placeholder="Hỏi về công việc hoặc cách sử dụng TaskFlow..."
              disabled={!status?.enabled || sending}
            />
            <Tooltip title="Gửi câu hỏi">
              <Button type="primary" icon={<FiArrowUp />} onClick={() => sendMessage()} loading={sending} disabled={!input.trim() || !status?.enabled} aria-label="Gửi câu hỏi" />
            </Tooltip>
          </div>
          <div className={styles.disclaimer}>AI có thể trả lời chưa chính xác. Hãy mở nguồn công việc để kiểm tra trước khi quyết định.</div>
        </section>
      </div>
    </div>
  )
}
