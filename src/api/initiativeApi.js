import axiosClient from './axiosClient'

export const getInitiativesApi = () =>
  axiosClient.get('/api/initiatives')

export const getInitiativeDetailApi = (initiativeId) =>
  axiosClient.get(`/api/initiatives/${initiativeId}`)

export const createInitiativeApi = (data) =>
  axiosClient.post('/api/initiatives', data)

export const approveInitiativeApi = (initiativeId, data) =>
  axiosClient.post(`/api/initiatives/${initiativeId}/approve`, data)

export const rejectInitiativeApi = (initiativeId, data) =>
  axiosClient.post(`/api/initiatives/${initiativeId}/reject`, data)
