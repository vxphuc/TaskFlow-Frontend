import { App, Button, Form, Input, Modal } from 'antd'
import { useState } from 'react'
import { changeOwnPasswordApi } from '../../api/authApi'
import styles from './ChangePasswordModal.module.css'

export default function ChangePasswordModal({ open, onClose }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const changePassword = async (values) => {
    setSubmitting(true)
    try {
      await changeOwnPasswordApi({
        current_password: values.current_password,
        new_password: values.new_password,
      })
      message.success('Đã đổi mật khẩu.')
      form.resetFields()
      onClose()
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể đổi mật khẩu.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Đổi mật khẩu"
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={changePassword}>
        <Form.Item
          name="current_password"
          label="Mật khẩu hiện tại"
          rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="Mật khẩu mới"
          rules={[
            { required: true, message: 'Nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="Nhập lại mật khẩu mới"
          dependencies={['new_password']}
          rules={[
            { required: true, message: 'Nhập lại mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('Mật khẩu nhập lại không khớp'))
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <div className={styles.actions}>
          <Button onClick={onClose}>Đóng</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Đổi mật khẩu
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
