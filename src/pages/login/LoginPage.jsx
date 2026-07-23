import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { FiArrowRight, FiCheckCircle, FiLock, FiPhone } from 'react-icons/fi'
import { useAuth } from '../../contexts/useAuth'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onFinish = async (values) => {
    setError('')
    setSubmitting(true)
    try {
      await login(values.phone, values.password)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đăng nhập. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.identity}>
        <div className={styles.identityInner}>
          <div className={styles.brand}>
            <span className={styles.logoMark}><img src="/logo2.png" alt="" /></span>
            <strong>TaskFlow</strong>
          </div>
          <div className={styles.statement}>
            <span className={styles.kicker}>NỀN TẢNG QUẢN TRỊ CÔNG VIỆC</span>
            <h1>Vận hành rõ ràng.<br />Phối hợp hiệu quả.</h1>
            <p>Một không gian thống nhất để doanh nghiệp tổ chức nhân sự và theo dõi tiến độ công việc.</p>
          </div>
          <div className={styles.trust}><FiCheckCircle /><span>Dữ liệu được bảo vệ trong hệ thống nội bộ</span></div>
        </div>
        <div className={styles.pattern} aria-hidden="true"><i /><i /><i /><i /></div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.mobileBrand}>
          <span className={styles.logoMark}><img src="/logo2.png" alt="" /></span>
          <strong>TaskFlow</strong>
        </div>
        <div className={styles.formWrap}>
          <header><span>CHÀO MỪNG TRỞ LẠI</span><h2>Đăng nhập hệ thống</h2><p>Sử dụng tài khoản được doanh nghiệp cấp cho bạn.</p></header>
          {error && <Alert className={styles.alert} type="error" message={error} showIcon closable onClose={() => setError('')} />}
          <Form layout="vertical" size="large" onFinish={onFinish} requiredMark={false}>
            <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }]}>
              <Input prefix={<FiPhone />} placeholder="Nhập số điện thoại" autoComplete="tel" inputMode="tel" />
            </Form.Item>
            <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}>
              <Input.Password prefix={<FiLock />} placeholder="Nhập mật khẩu" autoComplete="current-password" />
            </Form.Item>
            <Button block type="primary" htmlType="submit" loading={submitting} className={styles.submit}>
              <span>Đăng nhập</span><FiArrowRight />
            </Button>
          </Form>
          <footer>© 2026 TaskFlow. Hệ thống quản trị nội bộ.</footer>
        </div>
      </section>
    </main>
  )
}
