import axiosClient from './axiosClient'

export const getUsersApi = (params) => axiosClient.get('/api/users', { params })

export const createUserApi = (data) => axiosClient.post('/api/users', data)

export const updateUserApi = (userId, data) =>
  axiosClient.put(`/api/users/${userId}`, data)

export const setUserActiveApi = (userId, isActive) =>
  axiosClient.patch(`/api/users/${userId}/${isActive ? 'enable' : 'disable'}`)

export const changeUserPasswordApi = (userId, password) =>
  axiosClient.patch(`/api/users/${userId}/change-password`, { password })
