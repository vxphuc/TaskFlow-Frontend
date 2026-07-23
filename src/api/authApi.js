import axiosClient from './axiosClient'

export const loginApi = (data) => {
  return axiosClient.post('/api/auth/login', data)
}

export const getMeApi = () => {
  return axiosClient.get('/api/auth/me')
}