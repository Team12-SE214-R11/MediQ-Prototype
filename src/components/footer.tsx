import { Phone, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { cn } from '../lib/utils'
import { Modal } from './ui'

type Doc = 'terms' | 'privacy' | 'disclaimer'

const DISCLAIMER =
  'Thông tin tư vấn trên MediQ chỉ mang tính chất tham khảo, không thay thế cho việc thăm khám, chẩn đoán và phác đồ điều trị trực tiếp tại các cơ sở y tế chuyên khoa. Trong tình huống cấp cứu khẩn cấp, vui lòng gọi 115 hoặc đến ngay bệnh viện gần nhất.'

const DOCS: Record<Doc, { title: string; body: string }> = {
  disclaimer: { title: 'Miễn trừ trách nhiệm y tế', body: DISCLAIMER },
  terms: {
    title: 'Điều khoản dịch vụ',
    body: 'Điều khoản dịch vụ của MediQ đang ở dạng bản nháp, chưa qua rà soát pháp lý (xem tài liệu pháp lý trong kho tài liệu dự án). Nội dung chính thức sẽ hiển thị tại đây khi được phê duyệt.',
  },
  privacy: {
    title: 'Chính sách quyền riêng tư',
    body: 'Chính sách quyền riêng tư của MediQ đang ở dạng bản nháp, chưa qua rà soát pháp lý (xem tài liệu pháp lý trong kho tài liệu dự án). Nội dung chính thức sẽ hiển thị tại đây khi được phê duyệt.',
  },
}

const LEGAL: Array<[Doc, string]> = [
  ['terms', 'Điều khoản dịch vụ'],
  ['privacy', 'Chính sách quyền riêng tư'],
  ['disclaimer', 'Miễn trừ trách nhiệm y tế'],
]

/** Ba liên kết pháp lý mở modal; dùng chung cho footer của trang người dùng và trang xác thực. */
function LegalLinks({ className, linkClass }: { className?: string; linkClass: string }) {
  const [open, setOpen] = useState<Doc | null>(null)
  return (
    <>
      <ul className={className}>
        {LEGAL.map(([key, label]) => (
          <li key={key}>
            <button type="button" onClick={() => setOpen(key)} aria-haspopup="dialog" className={cn('inline-flex min-h-11 items-center text-left underline-offset-4 hover:underline', linkClass)}>
              {label}
            </button>
          </li>
        ))}
      </ul>
      <Modal open={open !== null} onClose={() => setOpen(null)} title={open ? DOCS[open].title : ''} size="sm">
        {open && <p className="text-body-lg text-neutral-700">{DOCS[open].body}</p>}
      </Modal>
    </>
  )
}

const YEAR = new Date().getFullYear()

/** variant="auth": thanh chân trang nhẹ cho các màn xác thực. variant="app": chân trang đầy đủ cho khu vực đã đăng nhập. */
export function Footer({ variant, admin, clearBottomNav }: { variant: 'auth' | 'app'; admin?: boolean; clearBottomNav?: boolean }) {
  if (variant === 'auth') {
    return (
      <footer className="border-t border-neutral-200 bg-white px-4 py-4 text-body-md text-neutral-700">
        <LegalLinks className="flex flex-wrap justify-center gap-x-6" linkClass="text-neutral-700" />
        <p className="mt-1 text-center text-caption">© {YEAR} MediQ · Nội dung chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa trực tiếp.</p>
      </footer>
    )
  }

  const heading = 'text-body-md font-semibold text-white'
  const link = 'inline-flex min-h-11 items-center text-primary-300 underline-offset-4 hover:text-white hover:underline'
  return (
    <footer className={cn('bg-primary-950 px-4 pt-10 text-body-md text-primary-300 md:px-8 2xl:px-20', clearBottomNav ? 'pb-24 md:pb-8' : 'pb-8')}>
      <div className="mx-auto max-w-[1280px]">
        <div className={cn('grid grid-cols-1 gap-8 md:grid-cols-2', admin ? 'lg:grid-cols-2' : 'lg:grid-cols-4')}>
          <div>
            <span className="inline-flex items-center gap-2 text-h3 font-bold text-white"><Stethoscope className="size-7" aria-hidden />MediQ</span>
            <p className="mt-3 max-w-xs">Mạng xã hội Hỏi & Đáp Y tế: người dùng đặt câu hỏi sức khoẻ, bác sĩ đã xác minh chia sẻ kiến thức.</p>
          </div>
          {!admin && (
            <>
              <nav aria-label="Khám phá">
                <h2 className={heading}>Khám phá</h2>
                <ul className="mt-2">
                  <li><Link to="/" className={link}>Câu hỏi</Link></li>
                  <li><Link to="/articles" className={link}>Bài viết chuyên môn</Link></li>
                  <li><Link to="/tags" className={link}>Chủ đề & chuyên khoa</Link></li>
                </ul>
              </nav>
              <nav aria-label="Tài khoản">
                <h2 className={heading}>Tài khoản</h2>
                <ul className="mt-2">
                  <li><Link to="/profile" className={link}>Hồ sơ của tôi</Link></li>
                  <li><Link to="/profile/saved" className={link}>Đã lưu</Link></li>
                  <li><Link to="/settings/security" className={link}>Cài đặt & Bảo mật</Link></li>
                </ul>
              </nav>
            </>
          )}
          <nav aria-label="Pháp lý">
            <h2 className={heading}>Pháp lý</h2>
            <LegalLinks className="mt-2" linkClass="text-primary-300 hover:text-white" />
          </nav>
        </div>

        <div className="mt-8 rounded-md border border-primary-800 p-4">
          <p className="flex items-start gap-3">
            <Phone className="mt-0.5 size-5 shrink-0 text-white" aria-hidden />
            <span><span className="font-semibold text-white">Trường hợp cấp cứu, gọi 115.</span> {DISCLAIMER.split('. ')[0]}.</span>
          </p>
        </div>

        <p className="mt-6 border-t border-primary-800 pt-4 text-caption">
          © {YEAR} MediQ · SE214 · Bản prototype, dữ liệu hiển thị là dữ liệu giả lập.
        </p>
      </div>
    </footer>
  )
}
