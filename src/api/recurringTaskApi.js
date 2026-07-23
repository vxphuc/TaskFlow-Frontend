import axiosClient from './axiosClient'

export const getRecurringTemplatesApi = (params) =>
  axiosClient.get('/api/recurring-tasks', { params })

export const getRecurringTemplateTasksApi = (templateId, params) =>
  axiosClient.get(`/api/recurring-tasks/${templateId}/tasks`, { params })
