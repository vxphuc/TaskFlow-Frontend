import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { FiArrowRight, FiBriefcase, FiCheckCircle, FiLock, FiPhone } from 'react-icons/fi'
import { useAuth } from '../../contexts/useAuth'
import styles from './LoginPage.module.css'

const IDENTITY_COLORS = [
  { value: '#174d29', label: 'Xanh lá' },
  { value: '#0C1C4D', label: 'Xanh navy' },
  { value: '#F6903C', label: 'Cam' },
]
const IDENTITY_COLOR_STORAGE_KEY = 'taskflow_login_identity_color'

const getInitialIdentityColor = () => {
  try {
    const storedColor = localStorage.getItem(IDENTITY_COLOR_STORAGE_KEY)
    return IDENTITY_COLORS.some(({ value }) => value === storedColor)
      ? storedColor
      : IDENTITY_COLORS[0].value
  } catch {
    return IDENTITY_COLORS[0].value
  }
}

export default function LoginPage() {
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [identityColor, setIdentityColor] = useState(getInitialIdentityColor)
  const identityContrastColor = identityColor === '#F6903C' ? '#17211a' : '#fff'

  const selectIdentityColor = (color) => {
    setIdentityColor(color)
    try {
      localStorage.setItem(IDENTITY_COLOR_STORAGE_KEY, color)
    } catch {
      // The selected color still applies for this session when storage is unavailable.
    }
  }

  const onFinish = async (values) => {
    setError('')
    setSubmitting(true)
    try {
      await login(values.company_code, values.phone, values.password)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đăng nhập. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main
      className={styles.page}
      style={{
        '--identity-color': identityColor,
        '--identity-contrast-color': identityContrastColor,
      }}
    >
      <div
        className={styles.colorPicker}
        role="group"
        aria-label="Chọn màu nền trang đăng nhập"
      >
        {IDENTITY_COLORS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`${styles.colorSwatch} ${identityColor === value ? styles.colorSwatchActive : ''}`}
            style={{ backgroundColor: value }}
            title={label}
            aria-label={`Chọn màu ${label}`}
            aria-pressed={identityColor === value}
            onClick={() => selectIdentityColor(value)}
          />
        ))}
      </div>
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
          {error && <Alert className={styles.alert} type="error" title={error} showIcon closable onClose={() => setError('')} />}
          <Form
            layout="vertical"
            size="large"
            onFinish={onFinish}
            requiredMark={false}
            initialValues={{
              company_code: localStorage.getItem('taskflow_company_code') || '',
            }}
          >
            <Form.Item
              label="Mã công ty"
              name="company_code"
              normalize={(value) => value?.trimStart().toUpperCase()}
              rules={[{ required: true, message: 'Vui lòng nhập mã công ty.' }]}
            >
              <Input
                prefix={<FiBriefcase />}
                placeholder="Ví dụ: TASKFLOW"
                autoComplete="organization"
                maxLength={50}
              />
            </Form.Item>
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
