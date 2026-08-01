import { Alert, Button, Modal, Spin, Tooltip } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiArrowUp,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiFileText,
  FiMessageCircle,
  FiMessageSquare,
  FiPlus,
  FiThumbsDown,
  FiThumbsUp,
  FiTrash2,
  FiX,
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
import styles from './AIAssistantWidget.module.css'

const suggestions = [
  { icon: FiClock, label: 'Task nào của tôi sắp quá hạn?' },
  { icon: FiCheckCircle, label: 'Tôi còn kết quả nào đang chờ duyệt?' },
  { icon: FiFileText, label: 'Tóm tắt hiệu suất tháng này của tôi.' },
  { icon: FiMessageSquare, label: 'Hướng dẫn tôi cách gửi kết quả.' },
]

export default function AIAssistantWidget() {
  const navigate = useNavigate()
  const bottomRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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

  const initialize = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statusResponse, conversationsResponse] = await Promise.all([
        getAIStatusApi(),
        getAIConversationsApi(),
      ])
      const items = conversationsResponse.data.conversations || []
      const firstId = items[0]?.id || null
      setStatus(statusResponse.data)
      setConversations(items)
      setActiveId(firstId)
      if (firstId) await loadConversation(firstId)
      setInitialized(true)
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Không thể khởi tạo trợ lý AI.')
    } finally {
      setLoading(false)
    }
  }, [loadConversation])

  const openWidget = useCallback(() => {
    setOpen(true)
    if (!initialized && !loading) initialize()
  }, [initialize, initialized, loading])

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setHistoryOpen(false)
        setOpen(false)
      }
    }
    window.addEventListener('taskflow:open-ai', openWidget)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('taskflow:open-ai', openWidget)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [openWidget])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, sending])

  const refreshConversations = async () => {
    const response = await getAIConversationsApi()
    setConversations(response.data.conversations || [])
  }

  const selectConversation = async (conversationId) => {
    if (conversationId === activeId) {
      setHistoryOpen(false)
      return
    }
    setActiveId(conversationId)
    setHistoryOpen(false)
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
      setHistoryOpen(false)
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
        try {
          await deleteAIConversationApi(conversationId)
          const remaining = conversations.filter((item) => item.id !== conversationId)
          setConversations(remaining)
          if (activeId === conversationId) {
            const nextId = remaining[0]?.id || null
            setActiveId(nextId)
            await loadConversation(nextId)
          }
        } catch (deleteError) {
          setError(deleteError.response?.data?.message || 'Không thể xóa cuộc hội thoại.')
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
      await refreshConversations()
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

  const openTaskSource = (taskId) => {
    setOpen(false)
    navigate(`/app/tasks/${taskId}`)
  }

  return (
    <>
      {!open && (
        <Tooltip title="Trợ lý TaskFlow AI" placement="left">
          <button
            type="button"
            className={styles.launcher}
            onClick={openWidget}
            aria-label="Mở trợ lý TaskFlow AI"
            aria-expanded="false"
          >
            <FiMessageCircle />
            <span className={styles.launcherStatus} />
          </button>
        </Tooltip>
      )}

      {open && (
        <section className={styles.panel} role="dialog" aria-modal="false" aria-label="Trợ lý TaskFlow AI">
          <header className={styles.header}>
            <button type="button" className={styles.headerIcon} onClick={() => setHistoryOpen((value) => !value)} aria-label="Lịch sử hội thoại">
              <FiClock />
            </button>
            <span className={styles.aiMark}><FiCpu /></span>
            <div className={styles.headerText}>
              <strong>TaskFlow AI</strong>
              <small>{status ? `Còn ${status.remaining_today}/${status.daily_limit} lượt hôm nay` : 'Trợ lý công việc'}</small>
            </div>
            <button type="button" className={styles.headerIcon} onClick={createConversation} disabled={!status?.enabled} aria-label="Cuộc hội thoại mới">
              <FiPlus />
            </button>
            <button type="button" className={styles.headerIcon} onClick={() => setOpen(false)} aria-label="Đóng trợ lý AI">
              <FiX />
            </button>
          </header>

          {historyOpen && (
            <div className={styles.historyPanel}>
              <div className={styles.historyTitle}>
                <div><strong>Lịch sử hội thoại</strong><small>Tối đa 50 cuộc trò chuyện gần đây</small></div>
                <Button type="primary" size="small" icon={<FiPlus />} onClick={createConversation}>Tạo mới</Button>
              </div>
              <div className={styles.conversationList}>
                {conversations.length === 0 ? (
                  <span className={styles.emptyHistory}>Chưa có lịch sử hỏi đáp</span>
                ) : conversations.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`${styles.conversationItem} ${activeId === item.id ? styles.active : ''}`}
                    onClick={() => selectConversation(item.id)}
                  >
                    <FiMessageSquare />
                    <span><strong>{item.title}</strong><small>{formatDateTime(item.updated_at)}</small></span>
                    <span
                      role="button"
                      tabIndex={0}
                      className={styles.deleteConversation}
                      onClick={(event) => removeConversation(event, item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') removeConversation(event, item.id)
                      }}
                    ><FiTrash2 /></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.content}>
            {error && <Alert className={styles.alert} type="error" showIcon closable message={error} onClose={() => setError('')} />}
            {status && !status.enabled && <Alert className={styles.alert} type="warning" showIcon message="Trợ lý AI đang tạm tắt." />}

            {loading || conversationLoading ? (
              <div className={styles.center}><Spin /></div>
            ) : messages.length === 0 ? (
              <div className={styles.welcome}>
                <span className={styles.welcomeIcon}><FiCpu /></span>
                <h2>Tôi có thể hỗ trợ gì?</h2>
                <p>Hỏi về công việc, deadline, kết quả chờ duyệt hoặc cách sử dụng TaskFlow.</p>
                <div className={styles.suggestions}>
                  {suggestions.map(({ icon: Icon, label }) => (
                    <button type="button" key={label} onClick={() => sendMessage(label)} disabled={!status?.enabled || sending}>
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
                          <button type="button" key={`${source.type}-${source.id}`} onClick={() => openTaskSource(source.id)}>
                            <FiFileText /> {source.title}
                          </button>
                        ))}
                      </div>
                    )}
                    {item.role === 'ASSISTANT' && !String(item.id).startsWith('pending-') && (
                      <div className={styles.feedback}>
                        <span>Hữu ích?</span>
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

          <footer className={styles.composerWrap}>
            <div className={styles.composer}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder="Hỏi TaskFlow AI..."
                disabled={!status?.enabled || sending}
              />
              <Tooltip title="Gửi câu hỏi">
                <button type="button" className={styles.sendButton} onClick={() => sendMessage()} disabled={!input.trim() || !status?.enabled || sending} aria-label="Gửi câu hỏi">
                  {sending ? <Spin size="small" /> : <FiArrowUp />}
                </button>
              </Tooltip>
            </div>
            <small>AI có thể trả lời chưa chính xác. Hãy kiểm tra nguồn trước khi quyết định.</small>
          </footer>
        </section>
      )}
    </>
  )
}
