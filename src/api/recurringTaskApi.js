import axiosClient from './axiosClient'

export const getRecurringTemplatesApi = (params) =>
  axiosClient.get('/api/recurring-tasks', { params })

export const getRecurringTemplateTasksApi = (templateId, params) =>
  axiosClient.get(`/api/recurring-tasks/${templateId}/tasks`, { params })

export const createRecurringTemplateApi = (data) =>
  axiosClient.post('/api/recurring-tasks', data)

export const updateRecurringTemplateApi = (templateId, data) =>
  axiosClient.put(`/api/recurring-tasks/${templateId}`, data)

export const setRecurringTemplateActiveApi = (templateId, isActive) =>
  axiosClient.patch(
    `/api/recurring-tasks/${templateId}/${isActive ? 'enable' : 'disable'}`,
  )

export const generateRecurringTaskApi = (data) =>
  axiosClient.post('/api/recurring-tasks/generate', data)
