import axiosClient from './axiosClient'

export const getTaskDetailApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}`)

export const getTaskSubtasksApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/subtasks`)

export const getTaskSubmissionsApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/submissions`)

export const getTaskCommentsApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/comments`)

export const getTaskHistoryApi = (taskId) =>
  axiosClient.get(`/api/tasks/${taskId}/history`)
