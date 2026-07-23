import axiosClient from './axiosClient'

export const getMyMonthlyReportApi = (year, month) =>
  axiosClient.get('/api/reports/me/monthly', {
    params: { year, month },
  })

export const getMyAssignerMonthlyReportApi = (year, month) =>
  axiosClient.get('/api/reports/assigners/me/monthly', {
    params: { year, month },
  })

export const getDepartmentMonthlyReportApi = (departmentId, year, month) =>
  axiosClient.get(`/api/reports/departments/${departmentId}/monthly`, {
    params: { year, month },
  })

export const getUserMonthlyReportApi = (userId, year, month) =>
  axiosClient.get(`/api/reports/users/${userId}/monthly`, {
    params: { year, month },
  })
