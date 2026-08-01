import { Button } from 'antd'
import { useEffect } from 'react'
import {
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCheckCircle,
  FiClipboard,
  FiCpu,
  FiFileText,
  FiMessageSquare,
  FiRepeat,
  FiSend,
  FiUserCheck,
  FiUserPlus,
  FiZap,
} from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router'
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
    id: 'personal-task',
    icon: FiUserCheck,
    title: 'Tự giao việc cho bản thân',
    audience: 'Dành cho công việc cá nhân hoặc công việc mặc định',
    summary: 'Tự lập task, theo dõi kết quả và tùy chọn nhờ cấp trên duyệt khi cần xác nhận.',
    href: '/app/personal',
    action: 'Đến Việc cá nhân',
    steps: [
      ['Mở Việc cá nhân', 'Chọn Việc cá nhân trong menu và bấm Tạo việc cá nhân.'],
      ['Nhập nội dung', 'Điền tiêu đề, yêu cầu, mức ưu tiên, deadline và file đầu vào nếu có.'],
      ['Chọn cách hoàn thành', 'Để trống Người duyệt nếu task tự hoàn thành sau khi gửi kết quả, hoặc chọn một cấp trên cùng phòng ban.'],
      ['Thực hiện công việc', 'Mở task, bấm Bắt đầu, trao đổi khi cần và gửi kết quả như một task thông thường.'],
      ['Theo dõi việc cần duyệt', 'Tab Tôi duyệt hiển thị các việc cá nhân mà cấp dưới nhờ bạn xác nhận kết quả.'],
    ],
    note: 'Với việc lặp lại như đăng bài Facebook hằng ngày, hãy tạo mẫu tại Task định kỳ và chọn Bản thân là người thực hiện.',
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
      ['Cập nhật checklist', 'Mở tab Checklist, tự thêm hạng mục khi cần và đánh dấu từng phần đã hoàn thành để người giao theo dõi tiến độ.'],
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
      ['Tạo công việc con', 'Người giao hoặc người thực hiện task chính bấm Tạo subtask, sau đó chọn người thực hiện, người duyệt, ưu tiên và deadline.'],
      ['Quy tắc hoàn thành', 'Trong tab Công việc con, người giao có thể yêu cầu hoàn tất mọi subtask trước khi task chính được gửi kết quả.'],
      ['Lập checklist', 'Người giao và người thực hiện cùng thêm các hạng mục tại tab Checklist; người thực hiện đánh dấu sau khi bắt đầu công việc.'],
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
      ['Dùng đúng khu vực file', 'Tệp giao việc nằm ngay dưới yêu cầu; tệp bàn giao nằm trong đúng lần gửi kết quả.'],
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
      ['Tạo mẫu', 'Chọn Tạo mẫu và nhập yêu cầu, người thực hiện, ưu tiên. Có thể chọn Bản thân cho việc cá nhân lặp lại.'],
      ['Chọn chu kỳ', 'Chọn Hằng ngày, Hằng tuần hoặc Hằng tháng và ngày sinh task tương ứng.'],
      ['Chọn người duyệt', 'Khi tự thực hiện, có thể để trống để tự hoàn thành hoặc chọn cấp trên duyệt kết quả.'],
      ['Thiết lập hạn xử lý', 'Nhập số ngày hoàn thành tính từ ngày task được sinh.'],
      ['Quản lý mẫu', 'Có thể chỉnh sửa, tạm ngưng, kích hoạt và xem các task đã được tạo.'],
      ['Sinh thử có kiểm soát', 'Dùng thao tác sinh task cho kỳ khi cần kiểm tra một chu kỳ cụ thể.'],
    ],
    note: 'Tạm ngưng mẫu khi quy trình không còn sử dụng để tránh sinh thêm công việc không cần thiết.',
  },
  {
    id: 'initiatives',
    icon: FiZap,
    title: 'Gửi và duyệt sáng kiến',
    audience: 'Dành cho nhân viên và quản lý trực tiếp',
    summary: 'Đề xuất cải tiến lên cấp trên và chuyển ý tưởng được duyệt thành công việc thực tế.',
    href: '/app/initiatives',
    action: 'Đến Sáng kiến',
    steps: [
      ['Gửi đề xuất', 'Mở Sáng kiến, bấm Gửi sáng kiến và mô tả vấn đề, cách cải tiến, lợi ích dự kiến.'],
      ['Quản lý tiếp nhận', 'Sáng kiến được gửi đúng quản lý trực tiếp và xuất hiện trong tab Cần tôi duyệt.'],
      ['Ra quyết định', 'Quản lý đọc chi tiết, nhập phản hồi rồi chọn Không duyệt hoặc Duyệt và tạo task.'],
      ['Thiết lập công việc', 'Khi duyệt, quản lý chọn mức ưu tiên, deadline và có thể thêm lưu ý triển khai.'],
      ['Thực hiện bình thường', 'Task mới được giao lại cho người đề xuất để nhận việc, gửi kết quả và chờ duyệt như các task khác.'],
    ],
    note: 'Tài khoản phải có quản lý trực tiếp hợp lệ. Sáng kiến đã xử lý không thể duyệt hoặc từ chối lần thứ hai.',
  },
  {
    id: 'ai-assistant',
    icon: FiCpu,
    title: 'Hỏi trợ lý TaskFlow AI',
    audience: 'Dành cho người dùng cần tra cứu công việc hoặc hướng dẫn nhanh',
    summary: 'Hỏi về task, deadline, kết quả chờ duyệt, báo cáo và quy trình sử dụng trong đúng phạm vi tài khoản.',
    href: '/app/assistant',
    action: 'Mở Trợ lý AI',
    steps: [
      ['Mở Trợ lý AI', 'Chọn Trợ lý AI trong menu và tạo một cuộc hội thoại mới.'],
      ['Đặt câu hỏi cụ thể', 'Nêu rõ task, khoảng thời gian hoặc thao tác cần hướng dẫn để nhận câu trả lời sát hơn.'],
      ['Kiểm tra nguồn', 'Khi câu trả lời nhắc đến công việc, bấm nguồn task bên dưới để mở dữ liệu gốc.'],
      ['Tiếp tục cùng ngữ cảnh', 'Hỏi tiếp trong cùng cuộc hội thoại hoặc tạo hội thoại mới cho một chủ đề khác.'],
      ['Đánh giá câu trả lời', 'Dùng nút hữu ích hoặc chưa hữu ích để ghi nhận chất lượng câu trả lời.'],
    ],
    note: 'AI chỉ đọc dữ liệu bạn được phép xem và không tự giao việc, đổi deadline, duyệt hay hủy task. Luôn kiểm tra nguồn trước khi ra quyết định.',
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
