import axiosClient from './axiosClient'

export const getMyAssignedTasksApi = (params) =>
  axiosClient.get('/api/tasks/my-assigned', { params })

export const getMyCreatedTasksApi = (params) =>
  axiosClient.get('/api/tasks/my-created', { params })

export const createTaskApi = (data) =>
  axiosClient.post('/api/tasks', data)

export const getTaskDetailApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}`)

export const startTaskApi = (taskId) =>
  axiosClient.patch(`/api/tasks/${taskId}/start`)

export const getTaskSubtasksApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/subtasks`)

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

export const getTaskHistoryApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/history`)

export const updateTaskDeadlineApi = (taskId, data) =>
  axiosClient.patch(`/api/tasks/${taskId}/deadline`, data)

export const cancelTaskApi = (taskId, data) =>
  axiosClient.patch(`/api/tasks/${taskId}/cancel`, data)
