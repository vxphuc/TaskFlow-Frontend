import axiosClient from './axiosClient'

export const getAIStatusApi = () => axiosClient.get('/api/ai/status')
export const getAIConversationsApi = () => axiosClient.get('/api/ai/conversations')
export const createAIConversationApi = (data = {}) =>
  axiosClient.post('/api/ai/conversations', data)
export const getAIConversationApi = (conversationId) =>
  axiosClient.get(`/api/ai/conversations/${conversationId}`)
export const deleteAIConversationApi = (conversationId) =>
  axiosClient.delete(`/api/ai/conversations/${conversationId}`)
export const sendAIMessageApi = (conversationId, content) =>
  axiosClient.post(`/api/ai/conversations/${conversationId}/messages`, { content })
export const sendAIMessageFeedbackApi = (messageId, rating) =>
  axiosClient.post(`/api/ai/messages/${messageId}/feedback`, { rating })
