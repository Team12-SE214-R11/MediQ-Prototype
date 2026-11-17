import { AtSign, Check, Eye, EyeOff, Fingerprint, Info, MailCheck, ShieldCheck, X } from 'lucide-react'
import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, ErrorBanner, IconButton, InfoBox, TextInput, toast, useAction } from '../components/ui'
import { LIMITS, cn, maskEmail, passwordChecks } from '../lib/utils'
import { DEMO_PASSWORD } from '../mock/seed'
import { api, call, useStore } from '../mock/store'

function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-h2 text-primary-900 md:text-h1">{title}</h1>
      {children && <p className="mt-2 text-body-md text-neutral-700">{children}</p>}
    </div>
  )
}

function PasswordInput({ value, onChange, label, error, autoComplete }: { value: string; onChange: (v: string) => void; label: string; error?: string | null; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <TextInput label={label} required type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} error={error} autoComplete={autoComplete}
      suffix={<IconButton label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="size-10" onClick={() => setShow((s) => !s)}>{show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</IconButton>} />
  )
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cn('flex items-center gap-1', ok ? 'text-success-700' : 'text-neutral-700')}>
      {ok ? <Check className="size-4" aria-label="Đạt" /> : <X className="size-4" aria-label="Chưa đạt" />}{children}
    </li>
  )
}

/** Thước độ mạnh luôn kèm nhãn chữ, không chỉ dựa vào màu. */
function PasswordStrength({ password }: { password: string }) {
  const c = passwordChecks(password)
  const level = !password ? null : c.score <= 2 ? { label: 'Yếu', color: 'bg-danger-600', n: 3 } : c.score <= 3 ? { label: 'Trung bình', color: 'bg-warning-600', n: 6 } : { label: 'Mạnh', color: 'bg-success-600', n: 10 }
  return (
    <div className="mt-2 text-caption">
      <div className="flex items-center gap-2">
        <span className="text-neutral-700">Độ mạnh:</span>
        <span className="flex flex-1 gap-0.5" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', level && i < level.n ? level.color : 'bg-neutral-200')} />)}
        </span>
        <span className="w-20 font-semibold text-neutral-900">{level?.label ?? '—'}</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Rule ok={c.length}>{LIMITS.passwordMin}–{LIMITS.passwordMax} ký tự</Rule>
        <Rule ok={c.letter}>Có chữ cái</Rule>
        <Rule ok={c.digit}>Có chữ số</Rule>
      </ul>
    </div>
  )
}

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return { left, label: `${mm}:${ss}`, restart: () => setLeft(seconds) }
}

// ---------- WF-AUTH-01 ----------
export function RegisterPage() {
  const navigate = useNavigate()
  const [f, setF] = useState({ email: '', username: '', displayName: '', password: '' })
  const [agree, setAgree] = useState(false)
  const [touched, setTouched] = useState(false)
  const { run, loading, error } = useAction()
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const errs = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) ? null : 'Email không hợp lệ.',
    username: /^[a-z0-9._-]{3,50}$/i.test(f.username) ? null : '3–50 ký tự: chữ không dấu, số, dấu . _ -',
    displayName: f.displayName.trim().length >= LIMITS.displayNameMin && f.displayName.length <= LIMITS.displayName ? null : `Tên hiển thị từ ${LIMITS.displayNameMin} đến ${LIMITS.displayName} ký tự.`,
    password: passwordChecks(f.password).valid ? null : 'Mật khẩu chưa đạt chính sách bên dưới.',
    agree: agree ? null : 'Bạn cần đồng ý điều khoản để tiếp tục.',
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.values(errs).some(Boolean)) return
    const email = await run(() => call(() => api.register(f)), { silent: true })
    if (email) navigate(`/verify-email-pending?email=${encodeURIComponent(email)}`)
  }
  const show = (k: keyof typeof errs) => (touched ? errs[k] : null)
  return (
    <form onSubmit={submit} noValidate className="pb-24 md:pb-0">
      <Heading title="Tạo tài khoản MediQ">Cộng đồng hỏi đáp y tế an toàn, có bác sĩ xác minh.</Heading>
      <div className="space-y-6">
        {error && <ErrorBanner message={error.message} />}
        <TextInput label="Email" required type="email" inputMode="email" autoComplete="email" placeholder="ten@example.com" value={f.email} onChange={set('email')} error={show('email') ?? (error?.code === 'EMAIL_TAKEN' ? error.message : null)} hint="Email không thể thay đổi sau khi đăng ký." />
        <TextInput label="Tên đăng nhập (Username)" required autoComplete="username" prefix={<AtSign className="size-4" />} value={f.username} onChange={set('username')} error={show('username') ?? (error?.code === 'USERNAME_TAKEN' ? error.message : null)} hint="3–50 ký tự: chữ không dấu, số, . _ -  Không thể thay đổi sau khi đăng ký." />
        <TextInput label="Tên hiển thị" required autoComplete="name" value={f.displayName} onChange={set('displayName')} max={LIMITS.displayName} error={show('displayName')} />
        <div>
          <PasswordInput label="Mật khẩu" value={f.password} onChange={(v) => setF({ ...f, password: v })} error={show('password')} autoComplete="new-password" />
          <PasswordStrength password={f.password} />
        </div>
        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-body-md text-neutral-900">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-[18px] shrink-0 accent-primary-700" />
            <span>Tôi đã đọc và đồng ý Điều khoản sử dụng và Miễn trừ trách nhiệm y tế <span className="text-danger-600">*</span><span className="block text-neutral-700">Nội dung chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa trực tiếp.</span></span>
          </label>
          {show('agree') && <p role="alert" className="mt-1 text-caption text-danger-700">{errs.agree}</p>}
        </div>
      </div>
      {/* Mobile: nút dính đáy (WF-AUTH-01 mục 2.2) */}
      <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-neutral-200 bg-white p-3 md:static md:mt-8 md:border-0 md:p-0">
        <Button type="submit" size="lg" full loading={loading}>Đăng ký tài khoản</Button>
      </div>
      <p className="mt-6 text-center text-body-md text-neutral-700">Đã có tài khoản? <Link to="/login" className="font-semibold text-primary-500 underline">Đăng nhập</Link></p>
    </form>
  )
}

// ---------- WF-AUTH-02 ----------
export function VerifyPendingPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const navigate = useNavigate()
  const cd = useCountdown(45)
  const { run, loading } = useAction()
  const verify = async () => {
    const ok = await run(() => call(() => { api.verifyEmail(email); return true }), { silent: true })
    navigate(ok ? '/verify-email-success' : '/verify-email-success?error=1')
  }
  return (
    <div className="text-center">
      <MailCheck className="mx-auto size-16 text-primary-500" aria-hidden />
      <h1 className="mt-4 text-h2 text-primary-900">Kiểm tra hộp thư của bạn</h1>
      <p className="mt-2 text-body-md text-neutral-700">Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản. Email đã được gửi tới:</p>
      <p className="mt-1 text-body-lg font-semibold">{email ? maskEmail(email) : '—'}</p>
      <ol className="mx-auto mt-6 max-w-sm list-decimal space-y-1 pl-5 text-left text-body-md text-neutral-700">
        <li>Mở email từ MediQ (kiểm tra cả mục Spam/Quảng cáo)</li>
        <li>Bấm liên kết "Xác minh email"</li>
        <li>Liên kết có hiệu lực trong 24 giờ</li>
      </ol>
      <div className="mt-6"><InfoBox icon={<Info />}>Prototype không gửi email thật. Bấm nút dưới đây để giả lập thao tác mở liên kết trong email.</InfoBox></div>
      <div className="mt-4 space-y-3">
        <Button size="lg" full loading={loading} onClick={verify}>Giả lập: mở liên kết xác minh</Button>
        <Button size="lg" variant="outline" full disabled={cd.left > 0} onClick={() => { cd.restart(); toast.success('Đã gửi lại email xác minh') }}>
          {cd.left > 0 ? `Gửi lại email xác minh (${cd.label})` : 'Gửi lại email xác minh'}
        </Button>
      </div>
      <p className="mt-6 text-body-md text-neutral-700">Nhập sai email? <Link to="/register" className="font-semibold text-primary-500 underline">Đăng ký lại bằng email khác</Link></p>
      <p className="mt-2 text-body-md"><Link to="/login" className="font-semibold text-primary-500 underline">Quay lại Đăng nhập</Link></p>
    </div>
  )
}

// ---------- WF-AUTH-03 ----------
export function VerifySuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  if (params.get('error')) {
    return (
      <div className="text-center">
        <Info className="mx-auto size-16 text-neutral-500" aria-hidden />
        <h1 className="mt-4 text-h2 text-primary-900">Không thể xác minh email</h1>
        <p className="mt-2 text-body-md text-neutral-700">Liên kết đã hết hạn hoặc không còn hợp lệ.</p>
        <div className="mt-6 space-y-3">
          <Button size="lg" full variant="outline" onClick={() => toast.success('Đã gửi lại email xác minh')}>Gửi lại email xác minh</Button>
          <Link to="/login" className="block font-semibold text-primary-500 underline">Quay lại Đăng nhập</Link>
        </div>
      </div>
    )
  }
  return (
    <div className="text-center">
      <ShieldCheck className="mx-auto size-16 text-success-600" aria-hidden />
      <h1 className="mt-4 text-h2 text-primary-900">Email đã được xác minh. Bạn có thể đăng nhập.</h1>
      <p className="mt-2 text-body-md text-neutral-700">Chào mừng bạn đến với MediQ — nơi người dùng đặt câu hỏi sức khoẻ và bác sĩ đã xác minh chia sẻ kiến thức.</p>
      <div className="mt-6 text-left"><InfoBox icon={<Info />}>Lưu ý: Nội dung trên MediQ chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa trực tiếp.</InfoBox></div>
      <div className="mt-6"><Button size="lg" full onClick={() => navigate('/login')}>Đăng nhập ngay</Button></div>
    </div>
  )
}

// ---------- WF-AUTH-04 ----------
export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { run, loading, error } = useAction()
  const pk = useAction()
  const after = (result: 'ok' | '2fa' | undefined) => {
    const s = useStore.getState()
    const me = s.db.accounts.find((a) => a.id === s.sessionUserId)
    if (result === '2fa') navigate(`/login/2fa${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`)
    else if (result === 'ok') navigate(me?.role === 'ADMIN' ? '/admin' : (redirect ?? '/'), { replace: true })
    // Tài khoản SUSPENDED: store đã ghi nhận phiên để màn "Tạm khoá" hiển thị lý do và thời hạn.
    else if (me?.status === 'SUSPENDED') navigate('/suspended')
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    after(await run(() => call(() => api.login(email, password)), { silent: true }))
  }
  const passkey = async () => {
    after(await pk.run(() => call(() => api.loginWithPasskey(email), 700), { silent: true }))
  }
  const err = error ?? pk.error
  return (
    <form onSubmit={submit} noValidate>
      <Heading title="Đăng nhập vào MediQ">{redirect ? 'Vui lòng đăng nhập để tiếp tục. MediQ yêu cầu tài khoản để đọc và trao đổi nội dung y tế.' : 'Hỏi đáp y tế cùng bác sĩ đã được xác minh danh tính.'}</Heading>
      <div className="space-y-6">
        {err && err.code !== 'ACCOUNT_SUSPENDED' && <ErrorBanner message={err.message} />}
        <TextInput label="Email" type="email" inputMode="email" autoComplete="username webauthn" placeholder="ten@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <PasswordInput label="Mật khẩu" value={password} onChange={setPassword} autoComplete="current-password" />
          <p className="mt-2 text-right"><Link to="/forgot-password" className="text-body-md font-semibold text-primary-500 underline">Quên mật khẩu?</Link></p>
        </div>
        <Button type="submit" size="lg" full loading={loading} disabled={!email || !password}>Đăng nhập</Button>
        <div className="flex items-center gap-3 text-body-md text-neutral-700"><span className="h-px flex-1 bg-neutral-300" />hoặc<span className="h-px flex-1 bg-neutral-300" /></div>
        <div>
          <Button variant="outline" size="lg" full icon={<Fingerprint className="size-5" />} loading={pk.loading} disabled={!email} onClick={passkey}>Đăng nhập bằng Passkey</Button>
          <p className="mt-2 text-center text-caption text-neutral-700">Dùng vân tay, khuôn mặt hoặc mã PIN của thiết bị. Nhập email trước để chọn tài khoản.</p>
        </div>
        <InfoBox icon={<Info />}>
          Tài khoản demo (mật khẩu <code className="font-mono font-semibold">{DEMO_PASSWORD}</code>): <code className="font-mono">lan.nguyen@example.com</code>, <code className="font-mono">bs.tranminhtuan@example.com</code> (có Passkey), <code className="font-mono">admin_01@example.com</code> (có 2FA). Hoặc dùng nút <strong>Demo</strong> ở góc dưới trái.
        </InfoBox>
      </div>
      <p className="mt-6 text-center text-body-md text-neutral-700">Chưa có tài khoản? <Link to="/register" className="font-semibold text-primary-500 underline">Đăng ký</Link></p>
    </form>
  )
}

// ---------- WF-AUTH-05 ----------
export function TwoFactorPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pending = useStore((s) => s.pending2FA)
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const cd = useCountdown(300)
  const { run, loading, error } = useAction()
  useEffect(() => {
    if (!pending) navigate('/login', { replace: true })
  }, [pending, navigate])
  const setAt = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    if (d) refs.current[i + 1]?.focus()
  }
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i]) refs.current[i - 1]?.focus()
  }
  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    setDigits(Array.from({ length: 6 }, (_, i) => text[i] ?? ''))
    refs.current[Math.min(text.length, 5)]?.focus()
  }
  const code = digits.join('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await run(() => call(() => { api.verify2FA(code); return true }), { silent: true })
    if (ok) {
      const s = useStore.getState()
      const me = s.db.accounts.find((a) => a.id === s.sessionUserId)
      navigate(me?.role === 'ADMIN' ? '/admin' : (params.get('redirect') ?? '/'), { replace: true })
    } else {
      setDigits(Array(6).fill(''))
      refs.current[0]?.focus()
    }
  }
  return (
    <form onSubmit={submit} className="text-center">
      <ShieldCheck className="mx-auto size-16 text-primary-500" aria-hidden />
      <h1 className="mt-4 text-h2 text-primary-900">Xác thực hai yếu tố</h1>
      <p className="mt-2 text-body-md text-neutral-700">Mở ứng dụng Authenticator trên điện thoại và nhập mã 6 chữ số hiện tại của MediQ.</p>
      {error && <div className="mt-4 text-left"><ErrorBanner message={error.message} /></div>}
      {cd.left === 0 && <div className="mt-4 text-left"><ErrorBanner message="Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại." /></div>}
      <div className="mt-6 flex justify-center gap-2" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input key={i} ref={(el) => { refs.current[i] = el }} value={d} onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1} aria-label={`Chữ số thứ ${i + 1}`} autoFocus={i === 0}
            className={cn('h-14 w-12 rounded-md border border-neutral-500 text-center text-h2 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/15 focus:outline-none', i === 3 && 'ml-4')} />
        ))}
      </div>
      <p className="mt-4 text-caption text-neutral-700">Phiên xác thực còn hiệu lực: <span className="font-semibold tabular-nums">{cd.label}</span></p>
      <p className="mt-1 text-caption text-neutral-700">Prototype chấp nhận mọi mã 6 chữ số, trừ 000000.</p>
      <div className="mt-6"><Button type="submit" size="lg" full loading={loading} disabled={code.length !== 6 || cd.left === 0}>Xác nhận</Button></div>
      <p className="mt-6"><Link to="/login" onClick={() => api.logout()} className="text-body-md font-semibold text-primary-500 underline">← Quay lại đăng nhập</Link></p>
    </form>
  )
}

// ---------- WF-AUTH-06 ----------
export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'request' | 'sent' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const cd = useCountdown(45)
  const { run, loading } = useAction()
  const match = pw.length > 0 && pw === pw2
  if (step === 'request') {
    return (
      <form onSubmit={async (e) => { e.preventDefault(); await run(() => call(() => true)); cd.restart(); setStep('sent') }}>
        <Heading title="Quên mật khẩu?">Nhập email đã đăng ký. Nếu hợp lệ, chúng tôi sẽ gửi liên kết đặt lại mật khẩu (hiệu lực 10 phút).</Heading>
        <TextInput label="Email" type="email" inputMode="email" autoComplete="email" placeholder="ten@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="mt-6"><Button type="submit" size="lg" full loading={loading} disabled={!email}>Gửi hướng dẫn đặt lại</Button></div>
        <p className="mt-6 text-center"><Link to="/login" className="text-body-md font-semibold text-primary-500 underline">← Quay lại đăng nhập</Link></p>
      </form>
    )
  }
  if (step === 'sent') {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-16 text-primary-500" aria-hidden />
        <h1 className="mt-4 text-h2 text-primary-900">Kiểm tra hộp thư của bạn</h1>
        {/* Thông báo trung lập: không tiết lộ email có tồn tại hay không. */}
        <p className="mt-2 text-body-md text-neutral-700">Nếu email này đã đăng ký và đủ điều kiện, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong ít phút. Liên kết có hiệu lực 10 phút và chỉ dùng được một lần.</p>
        <div className="mt-6 space-y-3">
          <Button size="lg" full onClick={() => setStep('reset')}>Giả lập: mở liên kết đặt lại</Button>
          <Button size="lg" full variant="outline" disabled={cd.left > 0} onClick={() => { cd.restart(); toast.success('Đã gửi lại hướng dẫn') }}>{cd.left > 0 ? `Gửi lại (${cd.label})` : 'Gửi lại'}</Button>
        </div>
        <p className="mt-6"><Link to="/login" className="text-body-md font-semibold text-primary-500 underline">Quay lại đăng nhập</Link></p>
      </div>
    )
  }
  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      const ok = await run(() => call(() => { api.resetPassword(email, pw); return true }))
      if (ok) { toast.success('Đã đặt lại mật khẩu. Vui lòng đăng nhập.'); navigate('/login') }
    }}>
      <Heading title="Tạo mật khẩu mới" />
      <div className="space-y-6">
        <div><PasswordInput label="Mật khẩu mới" value={pw} onChange={setPw} autoComplete="new-password" /><PasswordStrength password={pw} /></div>
        <div>
          <PasswordInput label="Nhập lại mật khẩu mới" value={pw2} onChange={setPw2} autoComplete="new-password" error={pw2 && !match ? 'Hai mật khẩu chưa khớp nhau.' : null} />
          {match && <p className="mt-1 flex items-center gap-1 text-caption text-success-700"><Check className="size-4" aria-hidden />Hai mật khẩu khớp nhau</p>}
        </div>
        <Button type="submit" size="lg" full loading={loading} disabled={!match || !passwordChecks(pw).valid}>Đặt lại mật khẩu</Button>
      </div>
    </form>
  )
}
