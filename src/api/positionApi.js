import axiosClient from './axiosClient'

export const getPositionsApi = (departmentId, params) =>
  axiosClient.get(`/api/departments/${departmentId}/positions`, { params })

export const createPositionApi = (departmentId, data) =>
  axiosClient.post(`/api/departments/${departmentId}/positions`, data)

export const updatePositionApi = (positionId, data) =>
  axiosClient.put(`/api/positions/${positionId}`, data)

export const setPositionActiveApi = (positionId, isActive) =>
  axiosClient.patch(
    `/api/positions/${positionId}/${isActive ? 'enable' : 'disable'}`,
  )
