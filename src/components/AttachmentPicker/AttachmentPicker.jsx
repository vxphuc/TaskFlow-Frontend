import { App, Button, Upload } from 'antd'
import { useEffect, useRef } from 'react'
import { FiPaperclip } from 'react-icons/fi'
import styles from './AttachmentPicker.module.css'

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'png',
  'jpg',
  'jpeg',
  'txt',
  'zip',
])

const ACCEPTED_FILES = [...ALLOWED_EXTENSIONS]
  .map((extension) => `.${extension}`)
  .join(',')

const getExtension = (fileName = '') =>
  fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''

export default function AttachmentPicker({ files, onChange, disabled = false }) {
  const { message } = App.useApp()
  const filesRef = useRef(files)

  useEffect(() => {
    filesRef.current = files
  }, [files])

  const selectFile = (file) => {
    const currentFiles = filesRef.current

    if (currentFiles.length >= MAX_FILES) {
      message.warning(`Chỉ được chọn tối đa ${MAX_FILES} file cho một công việc.`)
      return Upload.LIST_IGNORE
    }

    if (!ALLOWED_EXTENSIONS.has(getExtension(file.name))) {
      message.error(`File "${file.name}" không thuộc định dạng được hỗ trợ.`)
      return Upload.LIST_IGNORE
    }

    if (!file.size) {
      message.error(`File "${file.name}" đang rỗng.`)
      return Upload.LIST_IGNORE
    }

    if (file.size > MAX_FILE_SIZE) {
      message.error(`File "${file.name}" vượt quá 10 MB.`)
      return Upload.LIST_IGNORE
    }

    const isDuplicate = currentFiles.some(
      (item) => item.name === file.name && item.size === file.size,
    )
    if (isDuplicate) {
      message.warning(`File "${file.name}" đã được chọn.`)
      return Upload.LIST_IGNORE
    }

    file.status = 'done'
    const nextFiles = [...currentFiles, file]
    filesRef.current = nextFiles
    onChange(nextFiles)
    return false
  }

  const removeFile = (file) => {
    const nextFiles = filesRef.current.filter((item) => item.uid !== file.uid)
    filesRef.current = nextFiles
    onChange(nextFiles)
  }

  return (
    <div className={styles.picker}>
      <Upload
        accept={ACCEPTED_FILES}
        beforeUpload={selectFile}
        disabled={disabled}
        fileList={files}
        multiple
        onRemove={removeFile}
      >
        <Button icon={<FiPaperclip />} disabled={disabled}>
          Chọn file hoặc hình ảnh
        </Button>
      </Upload>
      <span className={styles.hint}>
        PDF, Word, Excel, PNG/JPG, TXT hoặc ZIP · tối đa 10 MB/file · tối đa 5 file
      </span>
    </div>
  )
}
