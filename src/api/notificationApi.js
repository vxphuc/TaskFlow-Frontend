import axiosClient from './axiosClient'

export const getNotificationsApi = () =>
  axiosClient.get('/api/notifications')

export const getUnreadNotificationsApi = () =>
  axiosClient.get('/api/notifications/unread')

export const markNotificationReadApi = (notificationId) =>
  axiosClient.patch(`/api/notifications/${notificationId}/read`)

export const markAllNotificationsReadApi = () =>
  axiosClient.patch('/api/notifications/read-all')
