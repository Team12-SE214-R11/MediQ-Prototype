import {
  Bell,
  BookOpen,
  Bookmark,
  ChevronDown,
  ClipboardList,
  FileSearch,
  FlaskConical,
  Flag,
  Hash,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleQuestion,
  PenLine,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Stethoscope,
  Tags,
  User,
  Users,
  ArrowLeft,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { DoctorBadge } from './components/domain'
import { Avatar, Button, Drawer, IconButton, Modal } from './components/ui'
import { NotificationItem } from './pages/notifications'
import { cn, formatDate } from './lib/utils'
import { api, unreadCount, useCurrentUser, useDb, useStore } from './mock/store'
import type { Role } from './types'

export function Logo({ dark }: { dark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-h3 font-bold', dark ? 'text-white' : 'text-primary-700')}>
      <Stethoscope className="size-7" aria-hidden />
      MediQ
    </span>
  )
}

// ---------- Guards ----------
/** Guest không xem công khai: mọi màn nội dung chuyển về /login?redirect=… (quyết định 17/11/2026, theo SRS). */
export function RequireAuth({ children, roles, memberOnly }: { children: ReactNode; roles?: Role[]; memberOnly?: boolean }) {
  const me = useCurrentUser()
  const loc = useLocation()
  if (!me) return <Navigate to={`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (me.status === 'SUSPENDED') return <Navigate to="/suspended" replace />
  // BR-03: Admin không duyệt feed / tìm kiếm, chỉ mở chi tiết qua liên kết kiểm duyệt.
  if (memberOnly && me.role === 'ADMIN') return <Navigate to="/admin" replace />
  if (roles && !roles.includes(me.role)) return <Navigate to="/403" replace state={{ from: loc.pathname }} />
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const me = useCurrentUser()
  const [params] = useSearchParams()
  if (me && me.status !== 'SUSPENDED') return <Navigate to={params.get('redirect') ?? (me.role === 'ADMIN' ? '/admin' : '/')} replace />
  return children
}

// ---------- Auth layout (khuôn A) ----------
export function AuthLayout() {
  const { pathname } = useLocation()
  const onLogin = pathname.startsWith('/login')
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50">
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 md:h-16 md:px-20">
        <Link to="/login" aria-label="MediQ"><Logo /></Link>
        <p className="text-body-md text-neutral-700">
          <span className="hidden md:inline">{onLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}</span>
          <Link to={onLogin ? '/register' : '/login'} className="font-semibold text-primary-500 underline">{onLogin ? 'Đăng ký' : 'Đăng nhập'}</Link>
        </p>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-6 md:items-center md:py-12">
        <div className="w-full max-w-[628px] md:rounded-lg md:border md:border-neutral-200 md:bg-white md:p-12 md:shadow-sm">
          <Outlet />
        </div>
      </main>
      <footer className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-neutral-200 bg-white px-4 py-4 text-body-md text-neutral-700">
        <span>Điều khoản</span><span>Chính sách quyền riêng tư</span><span>Miễn trừ trách nhiệm y tế</span>
      </footer>
    </div>
  )
}

// ---------- App layout ----------
const NAV = [
  { to: '/', label: 'Câu hỏi', icon: MessageCircleQuestion, end: true },
  { to: '/articles', label: 'Bài viết', icon: BookOpen },
  { to: '/tags', label: 'Chủ đề', icon: Hash },
  { to: '/profile/saved', label: 'Đã lưu', icon: Bookmark },
]

export function SideNav() {
  return (
    <nav aria-label="Chuyên mục" className="sticky top-28 hidden lg:block">
      <ul className="space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-md border-l-4 px-3 text-body-md font-semibold transition-colors duration-150', isActive ? 'border-primary-700 bg-primary-50 text-primary-700' : 'border-transparent text-neutral-700 hover:bg-neutral-100')}>
              <Icon className="size-5" aria-hidden />{label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Khuôn B: SideNav 2 cột + Main + Rail 3 cột (Desktop-Visual-Specs mục III). Trên mobile rail chuyển xuống dưới. */
export function BrowseLayout({ children, rail }: { children: ReactNode; rail?: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-2"><SideNav /></div>
      <div className={cn('min-w-0', rail ? 'lg:col-span-7' : 'lg:col-span-10')}>{children}</div>
      {rail && <aside className="space-y-4 lg:col-span-3">{rail}</aside>}
    </div>
  )
}

function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }
  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-neutral-500" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocus} type="search" aria-label="Tìm thông tin sức khoẻ" placeholder="Tìm câu hỏi, bài viết, bác sĩ…"
        className="h-11 w-full rounded-md border border-neutral-500 bg-white pr-3 pl-10 text-body-lg placeholder:text-neutral-500 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/15 focus:outline-none md:text-body-md" />
    </form>
  )
}

function BellButton({ popover }: { popover: boolean }) {
  const db = useDb()
  const me = useCurrentUser()
  const navigate = useNavigate()
  const count = unreadCount(db, me)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const items = db.notifications.filter((n) => n.accountId === me?.id).slice(0, 5)
  return (
    <div className="relative" ref={ref}>
      <IconButton label={`Thông báo${count ? `, ${count} chưa đọc` : ''}`} aria-expanded={popover ? open : undefined} onClick={() => (popover ? setOpen((o) => !o) : navigate('/notifications'))}>
        <Bell className="size-6" />
        {count > 0 && <span aria-hidden className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-micro text-white">{count > 9 ? '9+' : count}</span>}
      </IconButton>
      {popover && open && (
        <div className="absolute right-0 z-[500] mt-2 w-[400px] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <p className="text-body-md font-semibold">Thông báo ({count} chưa đọc)</p>
            <button type="button" className="text-body-md font-semibold text-primary-500 underline disabled:text-neutral-500 disabled:no-underline" disabled={count === 0} onClick={() => api.markAllRead()}>Đánh dấu tất cả</button>
          </div>
          <ul className="max-h-[380px] divide-y divide-neutral-200 overflow-y-auto">
            {items.length === 0 && <li className="p-6 text-center text-body-md text-neutral-700">Bạn chưa có thông báo nào.</li>}
            {items.map((n) => <NotificationItem key={n.id} n={n} onNavigate={() => setOpen(false)} />)}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-neutral-200 py-3 text-center text-body-md font-semibold text-primary-500 underline">Xem tất cả thông báo</Link>
        </div>
      )}
    </div>
  )
}

function useLogout() {
  const navigate = useNavigate()
  return () => {
    api.logout()
    navigate('/login')
  }
}

function UserMenuItems({ onPick }: { onPick: () => void }) {
  const me = useCurrentUser()!
  const logout = useLogout()
  const item = 'flex h-12 w-full items-center gap-3 px-4 text-left text-body-md text-neutral-900 hover:bg-neutral-100'
  return (
    <ul onClick={onPick}>
      <li><Link to="/profile" className={item}><User className="size-5" />Hồ sơ cá nhân</Link></li>
      <li><Link to="/profile/saved" className={item}><Bookmark className="size-5" />Đã lưu</Link></li>
      {me.role === 'VERIFIED_DOCTOR'
        ? <li><Link to={`/doctor/${me.username}`} className={item}><ShieldCheck className="size-5" />Hồ sơ bác sĩ</Link></li>
        : <li><Link to="/doctor-verification/status" className={item}><ShieldCheck className="size-5" />Xác minh bác sĩ</Link></li>}
      <li><Link to="/settings/security" className={item}><Settings className="size-5" />Cài đặt & Bảo mật</Link></li>
      <li className="border-t border-neutral-200"><button type="button" className={item} onClick={logout}><LogOut className="size-5" />Đăng xuất</button></li>
    </ul>
  )
}

function UserMenu() {
  const me = useCurrentUser()!
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label="Menu tài khoản" onClick={() => setOpen((o) => !o)} className="flex h-11 items-center gap-1 rounded-md px-1 hover:bg-neutral-100">
        <Avatar name={me.displayName} src={me.avatar} size={36} ring={me.role === 'VERIFIED_DOCTOR'} />
        <ChevronDown className="size-4 text-neutral-700" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 z-[500] mt-2 w-60 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-md">
          <div className="border-b border-neutral-200 px-4 py-3">
            <p className="truncate text-body-md font-semibold">{me.displayName}</p>
            <p className="truncate text-caption text-neutral-500">@{me.username}</p>
          </div>
          <UserMenuItems onPick={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

function BottomNav() {
  const me = useCurrentUser()!
  const navigate = useNavigate()
  const [sheet, setSheet] = useState(false)
  const item = ({ isActive }: { isActive: boolean }) => cn('flex h-14 flex-1 flex-col items-center justify-center gap-1 border-t-2 text-caption', isActive ? 'border-primary-700 text-primary-700' : 'border-transparent text-neutral-500')
  const create = () => (me.role === 'VERIFIED_DOCTOR' ? setSheet(true) : navigate('/questions/new'))
  return (
    <>
      <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-[100] flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavLink to="/" end className={item}><Home className="size-6" aria-hidden />Trang chủ</NavLink>
        <NavLink to="/search" className={item}><Search className="size-6" aria-hidden />Khám phá</NavLink>
        <div className="flex flex-1 items-start justify-center">
          <button type="button" aria-label="Tạo mới" onClick={create} className="-mt-2 flex size-12 items-center justify-center rounded-full bg-primary-700 text-white shadow-xl">
            <Plus className="size-6" />
          </button>
        </div>
        <NavLink to="/profile/saved" className={item}><Bookmark className="size-6" aria-hidden />Đã lưu</NavLink>
        <NavLink to="/profile" end className={item}><User className="size-6" aria-hidden />Cá nhân</NavLink>
      </nav>
      <Drawer open={sheet} onClose={() => setSheet(false)} title="Tạo mới" side="bottom">
        <ul onClick={() => setSheet(false)}>
          <li><Link to="/questions/new" className="flex h-14 items-center gap-3 text-body-lg"><MessageCircleQuestion className="size-6 text-primary-700" />Đặt câu hỏi y tế</Link></li>
          <li><Link to="/articles/new" className="flex h-14 items-center gap-3 text-body-lg"><PenLine className="size-6 text-teal-700" />Viết bài chuyên môn</Link></li>
        </ul>
      </Drawer>
    </>
  )
}

export function AppLayout() {
  const me = useCurrentUser()
  const { pathname } = useLocation()
  const [drawer, setDrawer] = useState(false)
  const navigate = useNavigate()
  if (!me) return <Outlet />
  const admin = me.role === 'ADMIN'
  // Màn form có thanh hành động dính đáy riêng nên ẩn BottomNav (Mobile-Responsive-Specs mục IV.2).
  const hideBottomNav = admin || /\/(new|edit|apply)$/.test(pathname) || /^\/(questions|articles)\/[^/]+$/.test(pathname)
  const topLevel = ['/', '/articles', '/tags', '/search', '/profile', '/profile/saved', '/notifications'].includes(pathname)

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[1300] focus:rounded-md focus:bg-white focus:p-3">Bỏ qua đến nội dung chính</a>
      {/* Desktop: GlobalHeader 64px */}
      <header className="sticky top-0 z-[100] hidden h-16 border-b border-neutral-200 bg-white shadow-sm md:block">
        <div className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-8 2xl:px-20">
          <Link to={admin ? '/admin' : '/'} aria-label="MediQ — Trang chủ" className="mr-4"><Logo /></Link>
          {admin ? (
            <>
              <span className="flex-1 text-body-md text-neutral-700">Chế độ chỉ đọc dành cho kiểm duyệt</span>
              <Button variant="outline" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/admin/reports')}>Về cổng quản trị</Button>
            </>
          ) : (
            <>
              <SearchBox className="w-[420px] max-w-full" />
              <span className="flex-1" />
              <Button icon={<Plus className="size-4" />} onClick={() => navigate('/questions/new')}>Đặt câu hỏi</Button>
              {me.role === 'VERIFIED_DOCTOR' && <Button variant="secondary" icon={<PenLine className="size-4" />} onClick={() => navigate('/articles/new')}>Viết bài</Button>}
              <BellButton popover />
              <UserMenu />
            </>
          )}
        </div>
      </header>
      {/* Mobile: thanh trên 56px có chuông thông báo */}
      <header className="sticky top-0 z-[100] flex h-14 items-center gap-1 border-b border-neutral-200 bg-white px-1 md:hidden">
        {topLevel && !admin
          ? <IconButton label="Mở menu" onClick={() => setDrawer(true)}><Menu className="size-6" /></IconButton>
          : <IconButton label="Quay lại" onClick={() => navigate(-1)}><ArrowLeft className="size-6" /></IconButton>}
        <Link to={admin ? '/admin' : '/'} className="flex-1" aria-label="MediQ"><Logo /></Link>
        {!admin && <IconButton label="Tìm kiếm" onClick={() => navigate('/search')}><Search className="size-6" /></IconButton>}
        {!admin && <BellButton popover={false} />}
      </header>

      <main id="main" className={cn('mx-auto w-full max-w-[1440px] flex-1 px-4 pt-6 md:px-8 md:pt-12 2xl:px-20', hideBottomNav ? 'pb-16' : 'pb-28 md:pb-16')}>
        <Outlet />
      </main>

      <footer className="hidden bg-primary-950 px-8 py-8 text-body-md text-primary-300 md:block 2xl:px-20">
        <p className="mx-auto max-w-[1280px]">MediQ — Mạng xã hội Hỏi & Đáp Y tế. Nội dung chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa trực tiếp.</p>
      </footer>

      {!hideBottomNav && <BottomNav />}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Menu" side="left">
        <div className="-m-4">
          <div className="flex items-center gap-3 border-b border-neutral-200 p-4">
            <Avatar name={me.displayName} src={me.avatar} size={48} ring={me.role === 'VERIFIED_DOCTOR'} />
            <div className="min-w-0">
              <p className="truncate text-body-md font-semibold">{me.displayName}</p>
              <DoctorBadge account={me} />
            </div>
          </div>
          <ul onClick={() => setDrawer(false)} className="border-b border-neutral-200">
            {NAV.slice(0, 3).map(({ to, label, icon: Icon }) => (
              <li key={to}><Link to={to} className="flex h-12 items-center gap-3 px-4 text-body-md"><Icon className="size-5" />{label}</Link></li>
            ))}
          </ul>
          <UserMenuItems onPick={() => setDrawer(false)} />
        </div>
      </Drawer>
    </div>
  )
}

// ---------- Admin layout (khuôn F) ----------
const ADMIN_NAV = [
  [{ to: '/admin', label: 'Tổng quan KPI', icon: LayoutDashboard, end: true }, { to: '/admin/verifications', label: 'Thẩm định BS', icon: ClipboardList, queue: 'dv' }, { to: '/admin/reports', label: 'Báo cáo VP', icon: Flag, queue: 'rp' }],
  [{ to: '/admin/accounts', label: 'Tài khoản', icon: Users }, { to: '/admin/tags', label: 'Danh mục Thẻ', icon: Tags }],
  [{ to: '/admin/audit-logs', label: 'Audit Log', icon: FileSearch }],
] as const

export function AdminLayout() {
  const me = useCurrentUser()!
  const db = useDb()
  const logout = useLogout()
  const { pathname } = useLocation()
  const queues = {
    dv: db.verifications.filter((v) => v.status === 'PENDING').length,
    rp: db.reports.filter((r) => r.status === 'PENDING' || r.status === 'REVIEWING').length,
  }
  const current = ADMIN_NAV.flat().filter((n) => pathname === n.to || pathname.startsWith(`${n.to}/`)).pop()
  return (
    <div className="flex min-h-dvh bg-neutral-50">
      <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col bg-primary-950 text-white">
        <div className="flex h-16 items-center gap-2 px-4"><Logo dark /><span className="text-caption text-primary-300">Admin Portal</span></div>
        <nav aria-label="Quản trị" className="flex-1 overflow-y-auto">
          {ADMIN_NAV.map((group, i) => (
            <ul key={i} className={cn('py-2', i > 0 && 'border-t border-primary-800')}>
              {group.map((n) => {
                const count = 'queue' in n ? queues[n.queue] : 0
                return (
                  <li key={n.to}>
                    <NavLink to={n.to} end={'end' in n} className={({ isActive }) => cn('flex h-11 items-center gap-3 border-l-4 px-4 text-body-md font-semibold', isActive ? 'border-primary-400 bg-primary-800 text-white' : 'border-transparent text-primary-300 hover:bg-primary-900')}>
                      <n.icon className="size-5" aria-hidden />
                      <span className="flex-1">{n.label}</span>
                      {count > 0 && <span className="rounded-full bg-warning-100 px-2 text-caption text-warning-700">{count}</span>}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          ))}
        </nav>
        <div className="border-t border-primary-800 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={me.displayName} size={32} />
            <div className="min-w-0"><p className="truncate text-body-md font-semibold">{me.displayName}</p><p className="truncate text-caption text-primary-300">@{me.username}</p></div>
          </div>
          <button type="button" onClick={logout} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-primary-300 text-body-md font-semibold text-white hover:bg-primary-900"><LogOut className="size-4" />Thoát</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-[100] flex h-16 items-center border-b border-neutral-200 bg-white px-8 text-body-md text-neutral-700">
          Admin <span className="mx-2 text-neutral-500" aria-hidden>›</span> <span className="font-semibold text-neutral-900">{current?.label ?? 'Tổng quan KPI'}</span>
        </header>
        <main id="main" className="p-8"><Outlet /></main>
      </div>
    </div>
  )
}

// ---------- Trang ngoại lệ ----------
function Centered({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <span className="text-neutral-400 [&>svg]:size-16">{icon}</span>
      <h1 className="mt-4 text-h2 text-primary-900">{title}</h1>
      <div className="mt-3 space-y-4 text-body-md text-neutral-700">{children}</div>
    </div>
  )
}

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Centered icon={<FileSearch />} title="Không tìm thấy nội dung">
      <p>Nội dung có thể đã bị xoá hoặc đường dẫn không chính xác.</p>
      <Button onClick={() => navigate('/')}>Về trang chủ</Button>
    </Centered>
  )
}

export function ForbiddenPage() {
  const me = useCurrentUser()
  const navigate = useNavigate()
  return (
    <Centered icon={<ShieldAlert />} title="Bạn không có quyền truy cập">
      <p>Tính năng này chỉ dành cho nhóm người dùng được cấp quyền, ví dụ viết bài chuyên môn chỉ dành cho bác sĩ đã được xác minh danh tính.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={() => navigate(me?.role === 'ADMIN' ? '/admin' : '/')}>Về trang chủ</Button>
        {me?.role === 'NORMAL_USER' && <Button variant="secondary" onClick={() => navigate('/doctor-verification/apply')}>Nộp hồ sơ xác minh bác sĩ</Button>}
      </div>
    </Centered>
  )
}

export function SuspendedPage() {
  const me = useCurrentUser()
  const logout = useLogout()
  if (!me || me.status !== 'SUSPENDED') return <Navigate to="/login" replace />
  return (
    <div className="min-h-dvh bg-neutral-50 py-12">
      <Centered icon={<ShieldAlert />} title="Tài khoản đang bị tạm khoá">
        <div className="rounded-md bg-danger-100 p-4 text-left text-danger-700">
          <p><span className="font-semibold">Lý do:</span> {me.suspendReason}</p>
          <p className="mt-1"><span className="font-semibold">Thời hạn:</span> {me.suspendedUntil ? `đến hết ngày ${formatDate(me.suspendedUntil)}` : 'vô thời hạn'}</p>
        </div>
        <p>Trong thời gian này bạn không thể đọc hay đăng nội dung. Nếu cho rằng có nhầm lẫn, hãy gửi khiếu nại tới <span className="font-semibold">support@mediq.example</span>.</p>
        <Button variant="outline" onClick={logout}>Đăng xuất</Button>
      </Centered>
    </div>
  )
}

// ---------- Thanh demo: đổi nhanh vai trò ----------
const DEMO_ACCOUNTS = [
  { id: 'u-lan', note: 'Normal User' },
  { id: 'u-tuan', note: 'Verified Doctor' },
  { id: 'u-ha', note: 'User — hồ sơ bác sĩ bị từ chối' },
  { id: 'u-admin', note: 'Admin' },
  { id: 'u-spam', note: 'Tài khoản bị tạm khoá' },
]

export function DemoBar() {
  const db = useDb()
  const sessionId = useStore((s) => s.sessionUserId)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const pick = (id: string | null) => {
    api.switchTo(id)
    setOpen(false)
    const acc = db.accounts.find((a) => a.id === id)
    navigate(!acc ? '/login' : acc.status === 'SUSPENDED' ? '/suspended' : acc.role === 'ADMIN' ? '/admin' : '/')
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-20 left-3 z-[1100] flex h-11 items-center gap-2 rounded-full bg-neutral-900 px-4 text-body-md font-semibold text-white shadow-xl md:bottom-4 md:left-4" aria-label="Mở bảng điều khiển demo">
        <FlaskConical className="size-4" aria-hidden />Demo
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Bảng điều khiển demo" size="sm">
        <p className="text-body-md text-neutral-700">Đổi nhanh vai trò để xem giao diện theo từng nhóm người dùng. Dữ liệu là giả lập, lưu trong trình duyệt.</p>
        <ul className="mt-4 space-y-2">
          <li><button type="button" onClick={() => pick(null)} className={cn('flex min-h-12 w-full items-center justify-between rounded-md border px-3 text-left text-body-md', sessionId === null ? 'border-primary-700 bg-primary-50' : 'border-neutral-300 hover:bg-neutral-100')}><span className="font-semibold">Guest</span><span className="text-neutral-700">Chưa đăng nhập</span></button></li>
          {DEMO_ACCOUNTS.map(({ id, note }) => {
            const acc = db.accounts.find((a) => a.id === id)
            if (!acc) return null
            return (
              <li key={id}>
                <button type="button" onClick={() => pick(id)} className={cn('flex min-h-12 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-body-md', sessionId === id ? 'border-primary-700 bg-primary-50' : 'border-neutral-300 hover:bg-neutral-100')}>
                  <span className="font-semibold">{acc.displayName}</span><span className="text-right text-neutral-700">{note}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-6 border-t border-neutral-200 pt-4">
          <Button variant="danger" full onClick={() => { api.resetDemo(); setOpen(false); navigate('/login') }}>Reset dữ liệu demo</Button>
        </div>
      </Modal>
    </>
  )
}
