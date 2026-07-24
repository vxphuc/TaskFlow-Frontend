import { Button } from 'antd'
import { useEffect } from 'react'
import {
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCheckCircle,
  FiClipboard,
  FiFileText,
  FiMessageSquare,
  FiRepeat,
  FiSend,
  FiUserPlus,
} from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './UserGuidePage.module.css'

const guides = [
  {
    id: 'create-task',
    icon: FiSend,
    title: 'Giao một task mới',
    audience: 'Dành cho người quản lý và cấp trên',
    summary: 'Tạo yêu cầu rõ ràng, chọn đúng người thực hiện và theo dõi toàn bộ quá trình.',
    href: '/app/created',
    action: 'Đến Việc tôi giao',
    steps: [
      ['Mở màn hình giao việc', 'Chọn Việc tôi giao, sau đó bấm Giao công việc.'],
      ['Nhập yêu cầu', 'Điền tiêu đề, mô tả kết quả mong đợi, người thực hiện, mức ưu tiên và deadline.'],
      ['Kiểm tra người nhận', 'Danh sách chỉ hiển thị nhân sự phù hợp với quan hệ cấp bậc trong phòng ban.'],
      ['Theo dõi task', 'Sau khi tạo, mở chi tiết để trao đổi, tải tài liệu, xem kết quả và các subtask.'],
      ['Điều chỉnh khi cần', 'Khi task còn mở, người giao có thể đổi deadline hoặc hủy task và ghi rõ lý do.'],
    ],
    note: 'Mô tả nên nêu rõ đầu ra cần bàn giao và tiêu chí hoàn thành, không chỉ ghi tên công việc.',
  },
  {
    id: 'create-user',
    icon: FiUserPlus,
    title: 'Tạo nhân sự cấp dưới',
    audience: 'Dành cho cấp trên có phòng ban và cấp bậc hợp lệ',
    summary: 'Tạo tài khoản cho cấp dưới trực tiếp mà không cần chuyển sang khu vực quản trị hệ thống.',
    href: '/app/team',
    action: 'Đến Nhân sự cấp dưới',
    steps: [
      ['Mở danh sách nhân sự', 'Chọn Nhân sự cấp dưới để xem đội ngũ trực tiếp và gián tiếp trong phòng ban.'],
      ['Bắt đầu tạo tài khoản', 'Bấm Thêm nhân sự; nút chỉ khả dụng khi tài khoản của bạn đã có phòng ban và cấp bậc.'],
      ['Nhập thông tin đăng nhập', 'Điền họ tên, số điện thoại chưa được sử dụng và mật khẩu ban đầu tối thiểu 6 ký tự.'],
      ['Chọn cấp bậc', 'Chỉ các cấp bậc đang hoạt động và thấp hơn cấp bậc của bạn được phép lựa chọn.'],
      ['Bàn giao tài khoản', 'Sau khi tạo thành công, cung cấp thông tin đăng nhập và yêu cầu nhân sự đổi mật khẩu ngay.'],
    ],
    note: 'Nhân sự mới tự động thuộc phòng ban hiện tại và báo cáo trực tiếp cho người tạo tài khoản.',
  },
  {
    id: 'assigned-task',
    icon: FiClipboard,
    title: 'Nhận và thực hiện công việc',
    audience: 'Dành cho người được giao task hoặc subtask',
    summary: 'Xác nhận công việc, phối hợp với người giao và bàn giao kết quả đúng quy trình.',
    href: '/app/assigned',
    action: 'Đến Việc được giao',
    steps: [
      ['Tìm công việc', 'Mở Việc được giao và dùng bộ lọc Task chính, Subtask, trạng thái hoặc ưu tiên.'],
      ['Đọc đầy đủ yêu cầu', 'Kiểm tra mô tả, người giao, deadline, tài liệu và lịch sử trước khi bắt đầu.'],
      ['Nhận thực hiện', 'Bấm Bắt đầu để chuyển công việc từ Chờ tiếp nhận sang Đang thực hiện.'],
      ['Trao đổi nếu chưa rõ', 'Dùng tab Trao đổi để hỏi lại yêu cầu hoặc đề nghị điều chỉnh deadline.'],
      ['Gửi kết quả', 'Bấm Gửi kết quả, mô tả nội dung đã hoàn thành và chọn file cần đính kèm.'],
    ],
    note: 'Nếu kết quả bị yêu cầu làm lại, mở task và bấm Nhận làm lại trước khi gửi lần tiếp theo.',
  },
  {
    id: 'subtask',
    icon: FiCheckCircle,
    title: 'Tạo và theo dõi subtask',
    audience: 'Dành cho người đang thực hiện task chính',
    summary: 'Chia task chính thành các phần nhỏ và giao cho nhân sự phù hợp để phối hợp.',
    href: '/app/assigned',
    action: 'Mở danh sách công việc',
    steps: [
      ['Mở task chính', 'Chọn task chính đang mở mà bạn là người thực hiện.'],
      ['Tạo công việc con', 'Bấm Tạo subtask và nhập tiêu đề, mô tả, người thực hiện, ưu tiên, deadline.'],
      ['Theo dõi tiến độ', 'Xem danh sách tại tab Công việc con hoặc trong phần subtask đã giao.'],
      ['Xử lý kết quả', 'Subtask có quy trình bắt đầu, gửi kết quả, duyệt và yêu cầu làm lại như task chính.'],
    ],
    note: 'Deadline subtask nên sớm hơn deadline task chính để còn thời gian tổng hợp kết quả.',
  },
  {
    id: 'submission-review',
    icon: FiFileText,
    title: 'Gửi, thu hồi và duyệt kết quả',
    audience: 'Dành cho cả người thực hiện và người giao việc',
    summary: 'Quản lý từng lần bàn giao, file minh chứng và phản hồi khi kết quả chưa đạt.',
    href: '/app/assigned',
    action: 'Xem công việc cần xử lý',
    steps: [
      ['Người thực hiện gửi kết quả', 'Nhập nội dung bàn giao và đính kèm tối đa 5 file cho lần gửi.'],
      ['Thu hồi khi gửi nhầm', 'Khi kết quả chưa được duyệt, bấm Thu hồi kết quả và nhập lý do.'],
      ['Người giao bắt đầu duyệt', 'Mở task ở trạng thái Đã gửi và bấm Bắt đầu duyệt.'],
      ['Ra quyết định', 'Chọn Duyệt hoàn thành hoặc Yêu cầu làm lại kèm lý do cụ thể.'],
      ['Gửi lại sau phản hồi', 'Người thực hiện bấm Nhận làm lại, cập nhật kết quả và gửi một lần mới.'],
    ],
    note: 'File của một lần gửi chỉ được xóa bởi người tải lên và trước khi kết quả được review.',
  },
  {
    id: 'collaboration',
    icon: FiMessageSquare,
    title: 'Trao đổi và quản lý tài liệu',
    audience: 'Dành cho các bên tham gia công việc',
    summary: 'Trao đổi ngay trong task để thông tin, file và quyết định không bị thất lạc.',
    href: '/app/assigned',
    action: 'Mở công việc',
    steps: [
      ['Mở tab Trao đổi', 'Tin nhắn mới được cập nhật theo thời gian thực cho người giao và người thực hiện.'],
      ['Gửi nhanh', 'Nhập nội dung rồi nhấn Enter hoặc bấm Gửi trao đổi.'],
      ['Dùng đúng khu vực file', 'Tài liệu chung đặt tại Tệp đính kèm; file bàn giao gắn vào lần gửi kết quả.'],
      ['Theo dõi thay đổi', 'Tab Lịch sử lưu các mốc bắt đầu, gửi, duyệt, đổi deadline và hủy task.'],
    ],
    note: 'Biểu tượng kết nối cạnh chuông phải có màu xanh để nhận trao đổi và thông báo tức thời.',
  },
  {
    id: 'recurring',
    icon: FiRepeat,
    title: 'Thiết lập task định kỳ',
    audience: 'Dành cho công việc lặp lại',
    summary: 'Tạo mẫu một lần cho công việc phát sinh hằng ngày, hằng tuần hoặc hằng tháng.',
    href: '/app/recurring',
    action: 'Đến Task định kỳ',
    steps: [
      ['Tạo mẫu', 'Chọn Tạo mẫu và nhập yêu cầu, người thực hiện, ưu tiên.'],
      ['Chọn chu kỳ', 'Chọn Hằng ngày, Hằng tuần hoặc Hằng tháng và ngày sinh task tương ứng.'],
      ['Thiết lập hạn xử lý', 'Nhập số ngày hoàn thành tính từ ngày task được sinh.'],
      ['Quản lý mẫu', 'Có thể chỉnh sửa, tạm ngưng, kích hoạt và xem các task đã được tạo.'],
      ['Sinh thử có kiểm soát', 'Dùng thao tác sinh task cho kỳ khi cần kiểm tra một chu kỳ cụ thể.'],
    ],
    note: 'Tạm ngưng mẫu khi quy trình không còn sử dụng để tránh sinh thêm công việc không cần thiết.',
  },
  {
    id: 'reports-notifications',
    icon: FiBarChart2,
    title: 'Theo dõi báo cáo và thông báo',
    audience: 'Dành cho mọi người dùng',
    summary: 'Nắm việc cần xử lý, kết quả theo tháng và các thay đổi liên quan đến mình.',
    href: '/app/reports',
    action: 'Đến Báo cáo',
    steps: [
      ['Theo dõi chuông thông báo', 'Badge hiển thị số thông báo chưa đọc; bấm vào từng mục để mở task liên quan.'],
      ['Đọc tất cả', 'Dùng Đọc tất cả khi đã kiểm tra xong các cập nhật trong danh sách.'],
      ['Xem báo cáo tháng', 'Chọn tháng và năm để xem tổng task, subtask, tỷ lệ hoàn thành và quá hạn.'],
      ['Lọc chi tiết', 'Phân biệt Task chính và Subtask khi đối chiếu khối lượng hoặc tiến độ.'],
    ],
    note: 'Tổng quan dùng cho việc cần xử lý ngay; Báo cáo dùng để đánh giá kết quả theo kỳ.',
  },
]

export default function UserGuidePage() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!location.hash) return

    const target = document.getElementById(location.hash.slice(1))
    if (target) {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [location.hash])

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.titleIcon}><FiBookOpen /></div>
        <div>
          <span>TRUNG TÂM HƯỚNG DẪN</span>
          <h1>Sử dụng TaskFlow từ A đến Z</h1>
          <p>Chọn đúng quy trình bạn cần và thực hiện lần lượt theo từng bước.</p>
        </div>
      </header>

      <section className={styles.quickStart} aria-label="Quy trình tổng quát">
        <div><strong>1</strong><span>Đọc yêu cầu</span></div>
        <FiArrowRight />
        <div><strong>2</strong><span>Nhận hoặc giao việc</span></div>
        <FiArrowRight />
        <div><strong>3</strong><span>Trao đổi và thực hiện</span></div>
        <FiArrowRight />
        <div><strong>4</strong><span>Gửi và duyệt kết quả</span></div>
      </section>

      <div className={styles.guideLayout}>
        <aside className={styles.guideIndex}>
          <strong>Nội dung hướng dẫn</strong>
          <nav>
            {guides.map((guide) => {
              const Icon = guide.icon
              return (
                <a key={guide.id} href={`#${guide.id}`}>
                  <Icon />
                  <span>{guide.title}</span>
                </a>
              )
            })}
          </nav>
          <div className={styles.connectionHint}>
            <FiBell />
            <span>Kiểm tra chuông thông báo thường xuyên để không bỏ lỡ phản hồi.</span>
          </div>
        </aside>

        <main className={styles.guideList}>
          {guides.map((guide) => {
            const Icon = guide.icon
            return (
              <article id={guide.id} key={guide.id} className={styles.guideSection}>
                <header>
                  <span className={styles.sectionIcon}><Icon /></span>
                  <div>
                    <small>{guide.audience}</small>
                    <h2>{guide.title}</h2>
                    <p>{guide.summary}</p>
                  </div>
                </header>

                <ol className={styles.steps}>
                  {guide.steps.map(([title, detail], index) => (
                    <li key={title}>
                      <span>{index + 1}</span>
                      <div><strong>{title}</strong><p>{detail}</p></div>
                    </li>
                  ))}
                </ol>

                <footer>
                  <p><strong>Lưu ý:</strong> {guide.note}</p>
                  <Button type="primary" onClick={() => navigate(guide.href)}>
                    {guide.action}
                    <FiArrowRight />
                  </Button>
                </footer>
              </article>
            )
          })}
        </main>
      </div>
    </div>
  )
}
