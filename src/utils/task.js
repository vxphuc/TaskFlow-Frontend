import dayjs from 'dayjs'

export const taskStatuses = [
  { value: 'TODO', label: 'Chờ thực hiện' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'SUBMITTED', label: 'Chờ tiếp nhận' },
  { value: 'REVIEWING', label: 'Đang duyệt' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'REJECTED', label: 'Cần làm lại' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

export const priorityOptions = [
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'URGENT', label: 'Khẩn cấp' },
]

const statusMap = Object.fromEntries(taskStatuses.map((item) => [item.value, item.label]))
const priorityMap = Object.fromEntries(priorityOptions.map((item) => [item.value, item.label]))

export const getStatusLabel = (status) => statusMap[status] || status
export const getPriorityLabel = (priority) => priorityMap[priority] || priority

export const formatDateTime = (value) =>
  value ? dayjs(value).format('DD/MM/YYYY HH:mm') : 'Chưa thiết lập'

export const formatRelativeDeadline = (value) => {
  if (!value) return 'Không có deadline'
  const hours = dayjs(value).diff(dayjs(), 'hour')
  if (hours < 0) return `Quá hạn ${Math.abs(hours)} giờ`
  if (hours < 24) return `Còn ${hours} giờ`
  return `Còn ${Math.ceil(hours / 24)} ngày`
}

export const isTaskOpen = (status) =>
  !['COMPLETED', 'CANCELLED'].includes(status)
