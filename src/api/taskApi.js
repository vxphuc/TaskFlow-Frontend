import axiosClient from './axiosClient'

export const getMyAssignedTasksApi = (params) =>
  axiosClient.get('/api/tasks/my-assigned', { params })

export const getMyAssignedSubtasksApi = (params) =>
  axiosClient.get('/api/subtasks/my-assigned', { params })

export const getMyCreatedTasksApi = (params) =>
  axiosClient.get('/api/tasks/my-created', { params })

export const getPersonalTasksApi = (params) =>
  axiosClient.get('/api/tasks/personal', { params })

export const getPersonalReviewQueueApi = () =>
  axiosClient.get('/api/tasks/review-queue')

export const createPersonalTaskApi = (data) =>
  axiosClient.post('/api/tasks/personal', data)

export const createTaskApi = (data) =>
  axiosClient.post('/api/tasks', data)

export const getTaskAssigneeCandidatesApi = (params) =>
  axiosClient.get('/api/tasks/assignee-candidates', { params })

export const getTaskReviewerCandidatesApi = (assignedTo) =>
  axiosClient.get('/api/tasks/reviewer-candidates', {
    params: { assigned_to: assignedTo },
  })

export const getTaskDetailApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}`)

export const startTaskApi = (taskId) =>
  axiosClient.patch(`/api/tasks/${taskId}/start`)

export const getTaskSubtasksApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/subtasks`)

export const createSubtaskApi = (taskId, data) =>
  axiosClient.post(`/api/tasks/${taskId}/subtasks`, data)

export const getSubtaskAssigneesApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/subtask-assignees`)

export const updateTaskSubtaskPolicyApi = (taskId, data) =>
  axiosClient.patch(`/api/tasks/${taskId}/subtask-policy`, data)

export const submitTaskApi = (taskId, data) =>
  axiosClient.post(`/api/tasks/${taskId}/submissions`, data)

export const getTaskSubmissionsApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/submissions`)

export const withdrawSubmissionApi = (submissionId, data) =>
  axiosClient.patch(`/api/submissions/${submissionId}/withdraw`, data)

export const startSubmissionReviewApi = (submissionId) =>
  axiosClient.patch(`/api/submissions/${submissionId}/review/start`)

export const approveSubmissionApi = (submissionId, data) =>
  axiosClient.post(`/api/submissions/${submissionId}/approve`, data)

export const rejectSubmissionApi = (submissionId, data) =>
  axiosClient.post(`/api/submissions/${submissionId}/reject`, data)

export const getTaskCommentsApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/comments`)

export const createTaskCommentApi = (taskId, data) =>
  axiosClient.post(`/api/tasks/${taskId}/comments`, data)

export const getTaskChecklistApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/checklist`)

export const createTaskChecklistItemApi = (taskId, data) =>
  axiosClient.post(`/api/tasks/${taskId}/checklist`, data)

export const updateTaskChecklistItemApi = (taskId, itemId, data) =>
  axiosClient.patch(`/api/tasks/${taskId}/checklist/${itemId}`, data)

export const toggleTaskChecklistItemApi = (taskId, itemId, data) =>
  axiosClient.patch(`/api/tasks/${taskId}/checklist/${itemId}/toggle`, data)

export const deleteTaskChecklistItemApi = (taskId, itemId) =>
  axiosClient.delete(`/api/tasks/${taskId}/checklist/${itemId}`)

export const getTaskHistoryApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/history`)

export const updateTaskDeadlineApi = (taskId, data) =>
  axiosClient.patch(`/api/tasks/${taskId}/deadline`, data)

export const cancelTaskApi = (taskId, data) =>
  axiosClient.patch(`/api/tasks/${taskId}/cancel`, data)

export const getTaskAttachmentsApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/attachments`)

export const uploadTaskAttachmentApi = (taskId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axiosClient.post(`/api/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const uploadSubmissionAttachmentApi = (submissionId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return axiosClient.post(`/api/submissions/${submissionId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const downloadAttachmentApi = (attachmentId) =>
  axiosClient.get(`/api/attachments/${attachmentId}/download`, {
    responseType: 'blob',
  })

export const deleteAttachmentApi = (attachmentId) =>
  axiosClient.delete(`/api/attachments/${attachmentId}`)
