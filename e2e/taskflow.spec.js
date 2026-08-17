import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'


const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const resultFile = path.join(currentDirectory, 'fixtures', 'result.txt')
const password = 'TaskFlow@123'

async function login(page, phone) {
  await page.goto('/')
  await page.getByLabel('Mã công ty').fill('TASKFLOW')
  await page.getByLabel('Số điện thoại').fill(phone)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/\/(admin|app)$/)
}

function watchRuntimeErrors(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

async function expectHealthyPage(page, heading) {
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  await expect(page.getByText('Không thể tải màn hình này')).toHaveCount(0)
}

test.describe.serial('TaskFlow end-to-end', () => {
  test('admin can sign in and open every administration screen', async ({ page }) => {
    const runtimeErrors = watchRuntimeErrors(page)
    await login(page, '0900000000')
    await expect(page).toHaveURL(/\/admin$/)

    const screens = [
      ['/admin', 'Hoạt động hệ thống'],
      ['/admin/departments', 'Phòng ban'],
      ['/admin/positions', 'Cấp bậc phòng ban'],
      ['/admin/users', 'Nhân sự'],
      ['/admin/reports', 'Hiệu suất công việc'],
      ['/admin/recurring', 'Task định kỳ'],
    ]

    for (const [url, heading] of screens) {
      await page.goto(url)
      await expectHealthyPage(page, heading)
    }

    await page.goto('/admin/reports')
    const collapsedReportPanels = [
      'Hiệu suất theo cấp bậc',
      'Hiệu suất nhân viên',
      'Danh sách công việc',
    ]
    for (const panelName of collapsedReportPanels) {
      const panelToggle = page.getByRole('button', { name: `Mở ${panelName}` })
      await expect(panelToggle).toHaveAttribute('aria-expanded', 'false')
      await panelToggle.click()
      await expect(page.getByRole('button', { name: `Thu gọn ${panelName}` }))
        .toHaveAttribute('aria-expanded', 'true')
    }

    await page.goto('/admin')
    const positionSummary = page.getByRole('button', { name: 'Mở Cấp bậc' })
    await expect(positionSummary.getByText('2', { exact: true })).toBeVisible()
    await expect(positionSummary.getByText(/có nhiều cấp bậc nhất$/)).toBeVisible()
    await positionSummary.click()
    await expect(page).toHaveURL(/\/admin\/positions\?department_id=/)

    await page.goto('/admin')
    await page.getByRole('button', { name: 'Mở Phòng ban' }).click()
    await expect(page).toHaveURL(/\/admin\/departments$/)

    await page.getByLabel('Mở phòng ban Phong E2E').click()
    await expect(page).toHaveURL(/\/admin\/positions\?department_id=/)
    await expect(page.getByText('Quan ly E2E', { exact: true })).toBeVisible()

    await page.getByLabel('Xem nhân sự thuộc cấp bậc Nhan vien E2E').click()
    await expect(page).toHaveURL(/\/admin\/users\?department_id=.+&position_id=.+/)
    await expect(page.getByText('0900000002', { exact: true })).toBeVisible()
    await expect(page.getByText('0900000001', { exact: true })).toHaveCount(0)

    await page.goto('/admin/users')
    await expect(page.getByText('Tất cả cấp bậc')).toBeVisible()
    await page.getByLabel('Xem công việc của Nhan vien E2E').click()
    await expect(page).toHaveURL(/\/admin\/reports\?mode=user&user_id=/)
    await expect(page.getByText('Theo nhân viên')).toBeVisible()

    expect(runtimeErrors).toEqual([])
  })

  test('manager screens work on desktop and the dashboard works on mobile', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const runtimeErrors = watchRuntimeErrors(page)
    await login(page, '0900000001')
    await expect(page).toHaveURL(/\/app$/)

    const screens = [
      ['/app', 'Chào Quan ly E2E'],
      ['/app/assigned', 'Việc được giao'],
      ['/app/created', 'Việc tôi giao'],
      ['/app/personal', 'Việc cá nhân'],
      ['/app/team', 'Nhân sự cấp dưới'],
      ['/app/recurring', 'Task định kỳ'],
      ['/app/initiatives', 'Sáng kiến và ý tưởng mới'],
      ['/app/reports', 'Hiệu suất theo tháng'],
      ['/app/guide', 'Sử dụng TaskFlow từ A đến Z'],
    ]

    for (const [url, heading] of screens) {
      await page.goto(url)
      await expectHealthyPage(page, heading)
    }

    await page.goto('/app/recurring')
    await page.getByRole('button', { name: 'Tạo mẫu' }).click()
    await expect(page.getByLabel('Cần duyệt kết quả')).not.toBeChecked()
    await expect(page.getByLabel('Deadline sau')).toHaveValue('0')
    await expect(page.getByLabel('Giờ hết hạn')).toHaveValue('23:59')
    await page.getByRole('button', { name: 'Đóng' }).click()

    await page.goto('/app')
    await expect(page.getByLabel('Lọc theo tên nhân viên')).toBeVisible()
    await expect(page.getByLabel('Lọc theo tháng giao việc')).toBeVisible()

    await page.goto('/app/team')
    await page
      .getByRole('button', { name: /Xem công việc đang thực hiện của Nhan vien E2E/ })
      .click()
    await expect(page.getByText('Công việc đang xử lý')).toBeVisible()
    await expect(page.getByText('Task và Subtask chưa hoàn tất')).toBeVisible()

    expect(runtimeErrors).toEqual([])
    await context.close()

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    })
    const mobilePage = await mobileContext.newPage()
    await login(mobilePage, '0900000001')
    await expectHealthyPage(mobilePage, 'Chào Quan ly E2E')
    await expect(mobilePage.getByRole('button', { name: 'Mở menu' })).toBeVisible()
    await mobileContext.close()
  })

  test('task lifecycle, attachment and realtime synchronization work', async ({ browser }) => {
    const managerContext = await browser.newContext()
    const staffContext = await browser.newContext()
    const managerPage = await managerContext.newPage()
    const staffPage = await staffContext.newPage()
    const managerErrors = watchRuntimeErrors(managerPage)
    const staffErrors = watchRuntimeErrors(staffPage)

    await Promise.all([
      login(managerPage, '0900000001'),
      login(staffPage, '0900000002'),
    ])
    await staffPage.goto('/app/assigned')
    await expectHealthyPage(staffPage, 'Việc được giao')

    await managerPage.goto('/app/created')
    await managerPage.getByRole('button', { name: 'Giao công việc' }).click()
    await managerPage.getByLabel('Tiêu đề').fill('Task E2E realtime')
    await managerPage.getByLabel('Mô tả').fill('Kiểm tra vòng đời task qua trình duyệt.')
    await managerPage.getByLabel('Người thực hiện').click()
    await managerPage.getByText(/Nhan vien E2E/).last().click()
    await managerPage.getByRole('button', { name: 'Giao task' }).click()

    await expect(managerPage.getByRole('heading', { name: 'Task E2E realtime' })).toBeVisible()
    await expect(staffPage.getByText('Task E2E realtime')).toBeVisible()

    const managerToken = await managerPage.evaluate(
      () => localStorage.getItem('access_token'),
    )
    const authorization = { Authorization: `Bearer ${managerToken}` }
    const usersResponse = await managerContext.request.get(
      'http://127.0.0.1:5173/api/users',
      { headers: authorization },
    )
    expect(usersResponse.ok()).toBeTruthy()
    const usersPayload = await usersResponse.json()
    const staffUser = usersPayload.users.find((user) => user.phone === '0900000002')
    const parentTaskId = new URL(managerPage.url()).pathname.split('/').at(-1)
    const subtaskResponse = await managerContext.request.post(
      `http://127.0.0.1:5173/api/tasks/${parentTaskId}/subtasks`,
      {
        headers: authorization,
        data: {
          title: 'Subtask checklist E2E',
          description: 'Kiểm tra checklist công việc con trong Task chính.',
          assigned_to: staffUser.id,
          priority: 'MEDIUM',
        },
      },
    )
    expect(subtaskResponse.ok()).toBeTruthy()
    const subtaskPayload = await subtaskResponse.json()
    const checklistResponse = await managerContext.request.post(
      `http://127.0.0.1:5173/api/tasks/${subtaskPayload.subtask.id}/checklist`,
      {
        headers: authorization,
        data: { content: 'Hoàn thiện checklist Subtask E2E' },
      },
    )
    expect(checklistResponse.ok()).toBeTruthy()

    for (let itemNumber = 1; itemNumber <= 7; itemNumber += 1) {
      const taskChecklistResponse = await managerContext.request.post(
        `http://127.0.0.1:5173/api/tasks/${parentTaskId}/checklist`,
        {
          headers: authorization,
          data: { content: `Checklist chính E2E ${itemNumber}` },
        },
      )
      expect(taskChecklistResponse.ok()).toBeTruthy()
    }

    await managerPage.reload()
    await managerPage.getByRole('tab', { name: /Tiến độ tổng quan/ }).click()
    await expect(managerPage.getByText('Checklist chính E2E 6', { exact: true })).toHaveCount(0)
    await managerPage.getByRole('button', {
      name: /Xem thêm 2 hạng mục của Task E2E realtime/,
    }).click()
    await expect(managerPage.getByText('Checklist chính E2E 6', { exact: true })).toBeVisible()
    await expect(managerPage.getByText('Checklist chính E2E 7', { exact: true })).toBeVisible()
    await managerPage.getByRole('button', {
      name: /Thu gọn checklist Task E2E realtime/,
    }).click()
    await expect(managerPage.getByText('Checklist chính E2E 6', { exact: true })).toHaveCount(0)

    await managerPage.getByRole('tab', { name: /Checklist/ }).click()
    const activeChecklistPanel = managerPage.getByRole('tabpanel', {
      name: /Checklist/,
    })
    await expect(activeChecklistPanel.getByText('Tiến độ checklist của các Subtask')).toBeVisible()
    await expect(activeChecklistPanel.getByText('Subtask checklist E2E')).toBeVisible()
    await expect(activeChecklistPanel.getByText('Hoàn thiện checklist Subtask E2E')).toBeVisible()

    await staffPage.getByRole('button', { name: 'Task E2E realtime Task chính' }).click()
    await staffPage.getByRole('button', { name: 'Bắt đầu' }).click()
    await expect(staffPage.getByRole('button', { name: 'Gửi kết quả' })).toBeVisible()

    await managerPage.getByRole('tab', { name: /Trao đổi/ }).click()
    await staffPage.getByRole('tab', { name: /Trao đổi/ }).click()
    const commentInput = staffPage.getByPlaceholder(/Trao đổi về yêu cầu/)
    await commentInput.fill('Trao đổi realtime từ nhân viên E2E')
    await commentInput.press('Enter')
    await expect(managerPage.getByText('Trao đổi realtime từ nhân viên E2E')).toBeVisible()

    await staffPage.getByRole('button', { name: 'Gửi kết quả' }).click()
    const submitDialog = staffPage.getByRole('dialog', { name: 'Gửi kết quả công việc' })
    await submitDialog.locator('textarea').fill('Kết quả hoàn thành qua E2E.')
    await submitDialog.locator('input[type="file"]').setInputFiles(resultFile)
    await submitDialog.getByRole('button', { name: 'Xác nhận' }).click()

    await expect(managerPage.getByRole('button', { name: 'Bắt đầu duyệt' })).toBeVisible()
    await managerPage.getByRole('button', { name: 'Bắt đầu duyệt' }).click()
    await expect(managerPage.getByRole('button', { name: 'Duyệt hoàn thành' })).toBeVisible()
    await managerPage.getByRole('button', { name: 'Duyệt hoàn thành' }).click()
    const approveDialog = managerPage.getByRole('dialog', { name: 'Duyệt hoàn thành' })
    await approveDialog.locator('textarea').fill('Kết quả E2E đạt yêu cầu.')
    await approveDialog.getByRole('button', { name: 'Xác nhận' }).click()

    await expect(staffPage.getByText('Hoàn thành', { exact: true }).first()).toBeVisible()
    await staffPage.getByRole('tab', { name: /Kết quả/ }).click()
    await expect(staffPage.getByText('result.txt')).toBeVisible()

    await managerPage.goto('/app/reports')
    const downloadPromise = managerPage.waitForEvent('download')
    await managerPage.getByRole('button', { name: /Xuất Excel/ }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)

    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const adminErrors = watchRuntimeErrors(adminPage)
    await login(adminPage, '0900000000')
    await adminPage.goto('/admin/users')
    await adminPage.getByLabel('Xem công việc của Nhan vien E2E').click()
    await adminPage.getByRole('button', { name: 'Xem đã hoàn thành' }).click()
    const statusFilter = adminPage.locator('.ant-select').filter({
      has: adminPage.getByLabel('Lọc trạng thái công việc'),
    })
    await expect(statusFilter).toContainText('Đã hoàn thành')
    await adminPage.getByRole('button', { name: 'Xem chi tiết task' }).first().click()
    await adminPage.getByRole('tab', { name: 'Cây tiến độ' }).click()
    await expect(adminPage.getByRole('heading', {
      name: 'Tổng quan Task và các nhánh thực hiện',
    })).toBeVisible()

    expect(managerErrors).toEqual([])
    expect(staffErrors).toEqual([])
    expect(adminErrors).toEqual([])
    await adminContext.close()
    await managerContext.close()
    await staffContext.close()
  })
})
