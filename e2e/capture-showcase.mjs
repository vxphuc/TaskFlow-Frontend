import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'


const e2eDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(e2eDirectory, '..')
const workspaceDirectory = path.resolve(frontendDirectory, '..')
const backendDirectory = path.join(workspaceDirectory, 'backend')
const outputDirectory = path.join(
  workspaceDirectory,
  'md file',
  'images',
  'handover',
)
const webBaseUrl = 'http://127.0.0.1:5173'
const apiBaseUrl = 'http://127.0.0.1:5000/api'
const password = 'TaskFlow@123'
const processes = []

function start(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.output = ''
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      child.output = `${child.output}${chunk}`.slice(-8000)
    })
  }
  processes.push(child)
  return child
}

async function waitForUrl(url, child) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server stopped before ${url} was ready.\n${child.output}`)
    }
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}.\n${child.output}`)
}

function stopProcessTree(child) {
  if (!child?.pid || child.exitCode !== null) return
  child.kill('SIGTERM')
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
  }
  child.stdout?.destroy()
  child.stderr?.destroy()
}

async function api(pathname, { method = 'GET', token, data } = {}) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`${method} ${pathname}: ${response.status} ${JSON.stringify(body)}`)
  }
  return body
}

async function signIn(phone) {
  return api('/auth/login', {
    method: 'POST',
    data: { phone, password },
  })
}

async function loginInBrowser(page, phone) {
  await page.goto(webBaseUrl)
  await page.getByLabel('Số điện thoại').fill(phone)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.waitForURL(/\/(admin|app)$/)
}

function isoAfterDays(days, hour = 17) {
  const value = new Date()
  value.setDate(value.getDate() + days)
  value.setHours(hour, 0, 0, 0)
  return value.toISOString()
}

async function createShowcaseData() {
  const managerLogin = await signIn('0900000001')
  const staffLogin = await signIn('0900000002')
  const managerToken = managerLogin.access_token
  const staffToken = staffLogin.access_token
  const users = await api('/users', { token: managerToken })
  const staff = users.users.find((item) => item.phone === '0900000002')
  if (!staff) throw new Error('Showcase staff account was not found')

  const parentResponse = await api('/tasks', {
    method: 'POST',
    token: managerToken,
    data: {
      title: 'Ra mắt chiến dịch thương hiệu quý III',
      description: 'Hoàn thiện nội dung, thiết kế và kế hoạch truyền thông cho chiến dịch ra mắt sản phẩm mới.',
      assigned_to: staff.id,
      reviewer_id: managerLogin.user.id,
      priority: 'HIGH',
      due_date: isoAfterDays(10),
      require_subtasks_completed: true,
    },
  })
  const parent = parentResponse.task

  const checklistContents = [
    'Chốt thông điệp truyền thông',
    'Duyệt bộ nhận diện hình ảnh',
    'Hoàn thiện kế hoạch phân phối nội dung',
  ]
  const checklistItems = []
  for (const content of checklistContents) {
    const response = await api(`/tasks/${parent.id}/checklist`, {
      method: 'POST',
      token: managerToken,
      data: { content },
    })
    checklistItems.push(response.item)
  }

  await api(`/tasks/${parent.id}/start`, {
    method: 'PATCH',
    token: staffToken,
  })
  for (const item of checklistItems.slice(0, 2)) {
    await api(`/tasks/${parent.id}/checklist/${item.id}/toggle`, {
      method: 'PATCH',
      token: staffToken,
      data: { is_completed: true },
    })
  }

  const subtaskDefinitions = [
    ['Thiết kế key visual và bộ banner', 'HIGH', 5],
    ['Viết nội dung landing page', 'MEDIUM', 6],
    ['Lập kế hoạch truyền thông đa kênh', 'MEDIUM', 8],
  ]
  const subtasks = []
  for (const [title, priority, days] of subtaskDefinitions) {
    const response = await api(`/tasks/${parent.id}/subtasks`, {
      method: 'POST',
      token: managerToken,
      data: {
        title,
        description: `Hạng mục thuộc chiến dịch: ${title}.`,
        assigned_to: staff.id,
        reviewer_id: managerLogin.user.id,
        priority,
        due_date: isoAfterDays(days),
      },
    })
    subtasks.push(response.subtask)
  }

  for (const subtask of subtasks) {
    await api(`/tasks/${subtask.id}/checklist`, {
      method: 'POST',
      token: managerToken,
      data: { content: `Hoàn thành bản nháp ${subtask.title.toLowerCase()}` },
    })
    await api(`/tasks/${subtask.id}/checklist`, {
      method: 'POST',
      token: managerToken,
      data: { content: 'Kiểm tra và bàn giao bản cuối' },
    })
  }

  await api(`/tasks/${subtasks[0].id}/start`, {
    method: 'PATCH',
    token: staffToken,
  })
  const firstSubtaskChecklist = await api(`/tasks/${subtasks[0].id}/checklist`, {
    token: staffToken,
  })
  await api(
    `/tasks/${subtasks[0].id}/checklist/${firstSubtaskChecklist.items[0].id}/toggle`,
    {
      method: 'PATCH',
      token: staffToken,
      data: { is_completed: true },
    },
  )

  await api(`/tasks/${parent.id}/comments`, {
    method: 'POST',
    token: managerToken,
    data: { content: 'Ưu tiên hoàn thiện key visual trước để kịp lịch duyệt nội bộ.' },
  })
  await api(`/tasks/${parent.id}/comments`, {
    method: 'POST',
    token: staffToken,
    data: { content: 'Em đã cập nhật tiến độ và sẽ gửi bản xem trước trong hôm nay.' },
  })

  const extraTasks = [
    ['Tổng hợp báo cáo hiệu suất tháng', 'URGENT', 3],
    ['Chuẩn hóa tài liệu quy trình nội bộ', 'MEDIUM', 12],
    ['Kiểm tra dữ liệu khách hàng tiềm năng', 'LOW', 7],
  ]
  for (const [title, priority, days] of extraTasks) {
    await api('/tasks', {
      method: 'POST',
      token: managerToken,
      data: {
        title,
        description: 'Công việc mẫu dùng trong bộ ảnh giới thiệu TaskFlow.',
        assigned_to: staff.id,
        reviewer_id: managerLogin.user.id,
        priority,
        due_date: isoAfterDays(days),
      },
    })
  }

  await api('/tasks/personal', {
    method: 'POST',
    token: managerToken,
    data: {
      title: 'Lập kế hoạch công việc tuần mới',
      description: 'Rà soát ưu tiên và phân bổ nguồn lực cho đội nhóm.',
      priority: 'MEDIUM',
      due_date: isoAfterDays(2),
    },
  })

  return parent
}

async function screenshot(page, filename, options = {}) {
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    type: 'jpeg',
    quality: 88,
    ...options,
  })
}

async function capture(browser, parentTask) {
  const desktop = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const page = await desktop.newPage()

  await page.goto(webBaseUrl)
  await page.getByRole('heading', { name: 'Đăng nhập hệ thống' }).waitFor()
  await screenshot(page, '01-login.jpg')

  await loginInBrowser(page, '0900000001')
  await page.getByRole('heading', { name: /Chào/ }).waitFor()
  await page.getByText('Cần thực hiện', { exact: true }).waitFor()
  await screenshot(page, '02-user-dashboard.jpg')

  await page.goto(`${webBaseUrl}/app/created`)
  await page.getByRole('heading', { name: 'Việc tôi giao' }).waitFor()
  await page.getByText(parentTask.title).first().waitFor()
  await screenshot(page, '03-created-tasks.jpg', { fullPage: true })

  await page.goto(`${webBaseUrl}/app/tasks/${parentTask.id}`)
  await page.getByRole('heading', { name: parentTask.title }).waitFor()
  await page.getByRole('tab', { name: /Tiến độ tổng quan/ }).click()
  await page.getByText('Tiến độ toàn bộ công việc').waitFor()
  await screenshot(page, '04-task-progress.jpg', { fullPage: true })

  await page.goto(`${webBaseUrl}/app/reports`)
  await page.getByRole('heading', { name: 'Hiệu suất theo tháng' }).waitFor()
  await screenshot(page, '05-user-reports.jpg', { fullPage: true })
  await desktop.close()

  const adminContext = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const adminPage = await adminContext.newPage()
  await loginInBrowser(adminPage, '0900000000')
  await adminPage.getByRole('heading', { name: 'Hoạt động hệ thống' }).waitFor()
  await screenshot(adminPage, '06-admin-dashboard.jpg')
  await adminContext.close()

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await loginInBrowser(mobilePage, '0900000002')
  await mobilePage.getByRole('heading', { name: /Chào/ }).waitFor()
  await mobilePage.getByText('Cần thực hiện', { exact: true }).waitFor()
  await screenshot(mobilePage, '07-mobile-dashboard.jpg', { fullPage: true })
  await mobileContext.close()
}

let exitCode = 1
let browser
try {
  await fs.mkdir(outputDirectory, { recursive: true })
  const backend = start(
    path.join(backendDirectory, 'venv', 'Scripts', 'python.exe'),
    [path.join(backendDirectory, 'tests', 'e2e_server.py')],
    backendDirectory,
  )
  const frontend = start(
    process.execPath,
    [
      path.join(frontendDirectory, 'node_modules', 'vite', 'bin', 'vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '5173',
    ],
    frontendDirectory,
  )
  await Promise.all([
    waitForUrl(`${apiBaseUrl}/health`, backend),
    waitForUrl(webBaseUrl, frontend),
  ])

  const parentTask = await createShowcaseData()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  await capture(browser, parentTask)
  exitCode = 0
  console.log(`Showcase images saved to ${outputDirectory}`)
} catch (error) {
  console.error(error)
} finally {
  await browser?.close()
  processes.reverse().forEach(stopProcessTree)
}

process.exit(exitCode)
