import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './contexts/AuthContext.jsx'
import AppErrorBoundary from './components/AppErrorBoundary/AppErrorBoundary.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#206a37',
          colorInfo: '#206a37',
          borderRadius: 6,
          fontFamily: "Inter, 'Segoe UI', Arial, sans-serif",
        },
      }}
    >
      <BrowserRouter>
        <AppErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppErrorBoundary>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
)
