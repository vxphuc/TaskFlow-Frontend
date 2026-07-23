import axiosClient from './axiosClient'

export const getDepartmentsApi = (params) =>
  axiosClient.get('/api/departments', { params })

export const createDepartmentApi = (data) =>
  axiosClient.post('/api/departments', data)

export const updateDepartmentApi = (departmentId, data) =>
  axiosClient.put(`/api/departments/${departmentId}`, data)

export const setDepartmentActiveApi = (departmentId, isActive) =>
  axiosClient.patch(
    `/api/departments/${departmentId}/${isActive ? 'enable' : 'disable'}`,
  )
