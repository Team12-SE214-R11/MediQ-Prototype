import { BookmarkX, Copy, Fingerprint, Lock, Pencil, Plus, Settings, ShieldCheck, Trash2 } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ArticleCard, Disclaimer, DoctorBadge, QuestionCard, ReportButton } from '../components/domain'
import { Avatar, Badge, Breadcrumb, Button, Card, EmptyState, ErrorBanner, InfoBox, Modal, SkeletonList, TextInput, Textarea, toast, useAction, useFakeLoading } from '../components/ui'
import { NotFoundPage } from '../layouts'
import { PasswordInput, PasswordStrength } from './auth'
import { LIMITS, cn, formatDate, maskEmail, maskLicense, passwordChecks, readImageFile, timeAgo } from '../lib/utils'
import { api, call, doctorProfileOf, isVerifiedDoctor, scoreOf, useCurrentUser, useDb } from '../mock/store'

const NARROW = 'mx-auto max-w-[845px]'

// ---------- WF-USR-01 ----------
export function UserProfilePage() {
  const { username } = useParams()
  const db = useDb()
  const me = useCurrentUser()!
  const navigate = useNavigate()
  const account = username ? db.accounts.find((a) => a.username === username && a.status !== 'DELETED') : me
  if (!account || account.role === 'ADMIN') return <NotFoundPage />
  const mine = account.id === me.id
  const profile = doctorProfileOf(db, account.id)
  const doctor = isVerifiedDoctor(account)
  return (
    <div className={NARROW}>
      <Breadcrumb items={['Trang chủ', mine ? 'Hồ sơ của tôi' : 'Hồ sơ']} />
      <Card>
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
          <Avatar name={account.displayName} src={account.avatar} size={96} ring={doctor} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <h1 className="text-h3 break-words text-neutral-950 md:text-h2">{account.displayName}</h1>
              <DoctorBadge account={account} size="md" />
              {account.status === 'SUSPENDED' && <Badge tone="danger">Tạm khoá</Badge>}
            </div>
            <p className="mt-1 text-body-md break-all text-neutral-700">@{account.username}</p>
            {mine && <p className="mt-1 text-caption text-neutral-700">Email ({maskEmail(account.email)}) không hiển thị công khai.</p>}
          </div>
          {!mine && <ReportButton targetType="account" targetId={account.id} />}
        </div>
        {mine && (
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <Button variant="outline" icon={<Pencil className="size-4" />} onClick={() => navigate('/profile/edit')}>Chỉnh sửa hồ sơ</Button>
            <Button variant="outline" onClick={() => navigate('/profile/saved')}>Đã lưu</Button>
            <Button variant="outline" icon={<Settings className="size-4" />} onClick={() => navigate('/settings/security')}>Cài đặt & Bảo mật</Button>
          </div>
        )}
        <h2 className="mt-6 text-h4 font-semibold">Giới thiệu</h2>
        <p className="mt-2 text-body-lg break-words whitespace-pre-line text-neutral-700">{account.bio || 'Chưa có giới thiệu.'}</p>
        {profile && (doctor || mine) && (profile.visible || mine) && (
          <Link to={`/doctor/${account.username}`} className="mt-4 inline-block text-body-md font-semibold text-primary-500 underline">Xem hồ sơ chuyên môn của bác sĩ →</Link>
        )}
        {mine && !doctor && (
          <div className="mt-6">
            <InfoBox icon={<ShieldCheck />}>
              <p className="font-semibold text-neutral-900">Bạn là bác sĩ?</p>
              <p className="mt-1">Xác minh chứng chỉ hành nghề để nhận huy hiệu Bác sĩ xác minh và đăng bài viết chuyên môn.</p>
              <Link to="/doctor-verification/status" className="mt-2 inline-block font-semibold text-primary-500 underline">Xác minh bác sĩ</Link>
            </InfoBox>
          </div>
        )}
      </Card>
      <div className="mt-4"><Disclaimer /></div>
    </div>
  )
}

// ---------- WF-USR-02 ----------
export function EditProfilePage() {
  const me = useCurrentUser()!
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(me.displayName)
  const [bio, setBio] = useState(me.bio)
  const [avatar, setAvatar] = useState(me.avatar)
  const file = useRef<HTMLInputElement>(null)
  const { run, loading, error } = useAction()
  const pick = async (f?: File) => {
    if (!f) return
    try {
      setAvatar(await readImageFile(f))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không tải được ảnh.')
    }
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await run(() => call(() => { api.updateProfile({ displayName, bio, avatar }); return true }), { silent: true })
    if (ok) {
      toast.success('Đã lưu hồ sơ')
      navigate('/profile')
    }
  }
  return (
    <form onSubmit={submit} className={cn(NARROW, 'space-y-4')}>
      <Breadcrumb items={['Hồ sơ của tôi', 'Chỉnh sửa hồ sơ']} />
      {error && <ErrorBanner message={error.message} />}
      <Card>
        <h2 className="text-h4 font-semibold">Ảnh đại diện</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Avatar name={displayName || me.displayName} src={avatar} size={96} />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => void pick(e.target.files?.[0])} aria-label="Tải ảnh đại diện mới" />
              <Button variant="outline" onClick={() => file.current?.click()}>Tải ảnh mới</Button>
              <Button variant="ghost" disabled={!avatar} onClick={() => setAvatar(null)}>Xoá ảnh</Button>
            </div>
            <p className="text-caption text-neutral-700">JPEG, PNG, WEBP hoặc GIF tĩnh, tối đa {LIMITS.fileSizeMB} MB.</p>
          </div>
        </div>
      </Card>
      <Card className="space-y-6">
        <h2 className="text-h4 font-semibold">Thông tin công khai</h2>
        <TextInput label="Tên hiển thị" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} max={LIMITS.displayName} />
        <Textarea label="Giới thiệu (Bio)" value={bio} onChange={(e) => setBio(e.target.value)} max={LIMITS.bio} />
        <TextInput label="Email" value={maskEmail(me.email)} disabled readOnly prefix={<Lock className="size-4" />} hint="Không thể đổi sau khi đăng ký." />
        <TextInput label="Username" value={`@${me.username}`} disabled readOnly prefix={<Lock className="size-4" />} hint="Không thể đổi sau khi đăng ký." />
      </Card>
      {me.role === 'VERIFIED_DOCTOR' && (
        <InfoBox icon={<ShieldCheck />}>
          Thông tin chuyên môn (chức danh, chuyên khoa, nơi công tác) đã được xác minh. Để thay đổi, hãy nộp hồ sơ cập nhật.{' '}
          <Link to="/doctor-verification/apply" className="font-semibold text-primary-500 underline">Nộp hồ sơ cập nhật thông tin chuyên môn →</Link>
        </InfoBox>
      )}
      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Button variant="outline" size="lg" className="md:h-10" onClick={() => navigate('/profile')}>Huỷ</Button>
        <Button type="submit" size="lg" className="md:h-10" loading={loading}>Lưu thay đổi</Button>
      </div>
    </form>
  )
}

// ---------- WF-USR-03 ----------
export function SavedPage() {
  const db = useDb()
  const me = useCurrentUser()!
  const loading = useFakeLoading('saved')
  const [shown, setShown] = useState<number>(LIMITS.feedPage)
  const bookmarks = db.bookmarks.filter((b) => b.accountId === me.id)
  return (
    <div className={NARROW}>
      <Breadcrumb items={['Hồ sơ của tôi', 'Đã lưu']} />
      <h1 className="text-h2 text-primary-900 md:text-h1">Đã lưu ({bookmarks.length})</h1>
      <p className="mt-1 mb-4 text-body-md text-neutral-700">Sắp xếp: mới lưu nhất trước</p>
      {loading ? <SkeletonList /> : bookmarks.length === 0 ? (
        <EmptyState icon={<BookmarkX />} title="Chưa lưu nội dung nào" description="Bấm Lưu trên câu hỏi hoặc bài viết để xem lại tại đây." action={<Link to="/" className="font-semibold text-primary-500 underline">Khám phá câu hỏi</Link>} />
      ) : (
        <div className="space-y-3 md:space-y-4">
          {bookmarks.slice(0, shown).map((b) => {
            const post = db.posts.find((p) => p.id === b.postId)
            return (
              <div key={b.postId}>
                <p className="mb-1 text-caption text-neutral-700">Đã lưu {timeAgo(b.createdAt).toLowerCase()}</p>
                {post && post.status === 'ACTIVE' ? (post.kind === 'question' ? <QuestionCard post={post} compact /> : <ArticleCard post={post} row />) : (
                  <Card className="flex items-center justify-between gap-3 text-neutral-500">
                    <p className="text-body-md">[Nội dung đã bị xoá] — Nội dung này không còn khả dụng.</p>
                    <Button variant="outline" size="sm" onClick={() => api.toggleBookmark(b.postId)}>Bỏ lưu</Button>
                  </Card>
                )}
              </div>
            )
          })}
          {bookmarks.length > shown && <div className="text-center"><Button variant="outline" onClick={() => setShown((s) => s + LIMITS.feedPage)}>Xem thêm</Button></div>}
        </div>
      )}
    </div>
  )
}

// ---------- WF-USR-04 ----------
export function DoctorProfilePage() {
  const { username } = useParams()
  const db = useDb()
  const me = useCurrentUser()!
  const navigate = useNavigate()
  const account = db.accounts.find((a) => a.username === username && a.status !== 'DELETED')
  const profile = account && doctorProfileOf(db, account.id)
  if (!account || !profile) return <NotFoundPage />
  const mine = account.id === me.id
  // Hồ sơ đang ẩn chỉ chủ sở hữu và Admin xem được.
  if (!profile.visible && !mine && me.role !== 'ADMIN') return <NotFoundPage />
  const verified = isVerifiedDoctor(account) && !profile.revoked
  const articles = db.posts.filter((p) => p.kind === 'article' && p.authorId === account.id && p.status === 'ACTIVE')
  const years = new Date().getFullYear() - profile.startYear
  const rows: Array<[string, string]> = [
    ['Chức danh', profile.title], ['Chuyên khoa', profile.specialty], ['Nơi công tác', profile.workplace],
    ['Kinh nghiệm', `${years} năm (hành nghề từ ${profile.startYear})`], ['Số giấy phép', maskLicense(profile.license)], ['Bài viết', `${articles.length} bài chuyên môn`],
  ]
  return (
    <div className={NARROW}>
      <Breadcrumb items={['Trang chủ', 'Bác sĩ', account.displayName]} />
      <Card>
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
          <Avatar name={account.displayName} src={account.avatar} size={120} ring={verified} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <h1 className="text-h3 break-words text-neutral-950 md:text-h2">{account.displayName}</h1>
              {verified ? <DoctorBadge account={account} size="lg" /> : <Badge>Không còn được xác minh</Badge>}
            </div>
            <p className="mt-1 text-body-md text-neutral-700">@{account.username}</p>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-left md:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k}><dt className="text-body-md text-neutral-500">{k}</dt><dd className={cn('text-body-md font-semibold text-neutral-900', k === 'Số giấy phép' && 'font-mono')}>{v}</dd></div>
              ))}
            </dl>
          </div>
          {!mine && <ReportButton targetType="account" targetId={account.id} />}
        </div>
        {!verified && <div className="mt-4"><InfoBox>Hồ sơ chuyên môn được giữ lại để tham khảo; bác sĩ này hiện không còn được MediQ xác minh. Các bài viết đã đăng trước đây vẫn được giữ nguyên.</InfoBox></div>}
      </Card>

      {mine && (
        <Card className="mt-4 border-primary-200">
          <h2 className="text-h4 font-semibold">Quản lý hồ sơ bác sĩ <span className="text-body-md font-normal text-neutral-700">(chỉ bạn thấy)</span></h2>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-between gap-4 text-body-md">
            <span>Hiển thị công khai hồ sơ này</span>
            <input type="checkbox" role="switch" checked={profile.visible} onChange={(e) => { api.setDoctorProfileVisible(e.target.checked); toast.success(e.target.checked ? 'Hồ sơ bác sĩ đang hiển thị công khai' : 'Đã ẩn hồ sơ bác sĩ') }} className="size-6 accent-primary-700" />
          </label>
          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <Button variant="outline" onClick={() => navigate('/profile/edit')}>Sửa giới thiệu</Button>
            <Button variant="outline" onClick={() => navigate('/doctor-verification/apply')}>Nộp hồ sơ cập nhật thông tin chuyên môn</Button>
          </div>
        </Card>
      )}

      <section className="mt-6">
        <h2 className="text-h3">Giới thiệu</h2>
        <p className="mt-2 text-body-lg break-words whitespace-pre-line text-neutral-700">{account.bio || 'Chưa có giới thiệu.'}</p>
      </section>
      <section className="mt-6">
        <h2 className="text-h3">Bài viết chuyên môn ({articles.length})</h2>
        <ul className="mt-3 divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {articles.length === 0 && <li className="p-6 text-center text-body-md text-neutral-700">Chưa có bài viết nào.</li>}
          {articles.map((p) => {
            const s = scoreOf(db, 'article', p.id)
            return (
              <li key={p.id}>
                <Link to={`/articles/${p.id}`} className="block p-4 hover:bg-neutral-100">
                  <span className="flex items-start justify-between gap-3"><span className="text-body-lg font-semibold text-neutral-900">{p.title}</span><span className="shrink-0 text-body-md tabular-nums text-neutral-700">+{s.up} / -{s.down}</span></span>
                  <span className="mt-1 block text-caption text-neutral-700">Xuất bản {formatDate(p.createdAt)}{p.editedAt && ` · Cập nhật lần cuối ${formatDate(p.editedAt)}`}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
      <div className="mt-6"><Disclaimer /></div>
    </div>
  )
}

// ---------- WF-USR-05 ----------
const SECTIONS = [['password', 'Đổi mật khẩu'], ['2fa', 'Xác thực 2 yếu tố'], ['passkey', 'Passkey'], ['danger', 'Vùng nguy hiểm']] as const
const TOTP_SECRET = 'JBSW Y3DP EHPK 3PXP'

export function SecurityPage() {
  const me = useCurrentUser()
  const navigate = useNavigate()
  const [setup, setSetup] = useState(false)
  const [pw, setPw] = useState('')
  const [code, setCode] = useState('')
  const [del, setDel] = useState(false)
  const [delPw, setDelPw] = useState('')
  const twofa = useAction()
  const pwAction = useAction()
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const remove = useAction()
  if (!me) return <Navigate to="/login" replace />

  const toggle2FA = async () => {
    const ok = await twofa.run(() => call(() => { if (me.twoFA) api.disable2FA(pw); else api.enable2FA(pw, code); return true }), { silent: true })
    if (ok) {
      toast.success(me.twoFA ? 'Đã tắt xác thực hai yếu tố' : 'Đã bật xác thực hai yếu tố')
      setSetup(false)
      setPw('')
      setCode('')
    }
  }
  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await pwAction.run(() => call(() => { api.changePassword(curPw, newPw); return true }), { silent: true })
    if (ok) {
      toast.success('Đã đổi mật khẩu')
      setCurPw('')
      setNewPw('')
      setNewPw2('')
    }
  }
  const deleteAccount = async () => {
    const ok = await remove.run(() => call(() => { api.deleteAccount(delPw); return true }), { silent: true })
    if (ok) {
      toast.success('Tài khoản đã được xoá')
      navigate('/login')
    }
  }
  return (
    <div>
      <Breadcrumb items={['Hồ sơ của tôi', 'Cài đặt & Bảo mật']} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <nav aria-label="Mục cài đặt" className="hidden lg:col-span-3 lg:block">
          <ul className="sticky top-28 space-y-1">
            {SECTIONS.map(([id, label]) => <li key={id}><a href={`#${id}`} className="flex h-11 items-center rounded-md px-3 text-body-md font-semibold text-neutral-700 hover:bg-neutral-100">{label}</a></li>)}
          </ul>
        </nav>
        <div className="space-y-6 lg:col-span-8">
          <Card id="password">
            <h2 className="text-h4 font-semibold">1. Đổi mật khẩu</h2>
            <form onSubmit={changePassword} className="mt-4 space-y-6" noValidate>
              {pwAction.error && pwAction.error.code !== 'INVALID_PASSWORD' && <ErrorBanner message={pwAction.error.message} />}
              <PasswordInput label="Mật khẩu hiện tại" value={curPw} onChange={setCurPw} autoComplete="current-password" error={pwAction.error?.code === 'INVALID_PASSWORD' ? pwAction.error.message : null} />
              <div><PasswordInput label="Mật khẩu mới" value={newPw} onChange={setNewPw} autoComplete="new-password" /><PasswordStrength password={newPw} /></div>
              <div>
                <PasswordInput label="Nhập lại mật khẩu mới" value={newPw2} onChange={setNewPw2} autoComplete="new-password" error={newPw2 && newPw !== newPw2 ? 'Hai mật khẩu chưa khớp nhau.' : null} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={pwAction.loading} disabled={!curPw || !passwordChecks(newPw).valid || newPw !== newPw2}>Đổi mật khẩu</Button>
              </div>
            </form>
            <p className="mt-4 text-caption text-neutral-700">Quên mật khẩu hiện tại? Hãy đăng xuất và dùng "Quên mật khẩu" ở trang đăng nhập.</p>
          </Card>

          <Card id="2fa">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-h4 font-semibold">2. Xác thực hai yếu tố (2FA TOTP)</h2>
              <Badge tone={me.twoFA ? 'success' : 'neutral'}>{me.twoFA ? 'Đang bật' : 'Chưa bật'}</Badge>
            </div>
            {!setup ? (
              <div className="mt-4"><Button variant={me.twoFA ? 'outline' : 'primary'} onClick={() => setSetup(true)}>{me.twoFA ? 'Tắt 2FA' : 'Bật 2FA'}</Button></div>
            ) : (
              <div className="mt-4 space-y-4">
                {twofa.error && <ErrorBanner message={twofa.error.message} />}
                {!me.twoFA && (
                  <div>
                    <p className="text-body-md font-semibold">B1. Quét mã QR bằng ứng dụng Authenticator</p>
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <div className="grid size-40 grid-cols-8 gap-0.5 rounded-md border border-neutral-300 bg-white p-2" role="img" aria-label="Mã QR giả lập">
                        {Array.from({ length: 64 }, (_, i) => <span key={i} className={(i * 7 + (i % 5) * 3) % 3 === 0 ? 'bg-neutral-900' : 'bg-white'} />)}
                      </div>
                      <div>
                        <p className="text-body-md text-neutral-700">Hoặc nhập khoá thủ công:</p>
                        <p className="mt-1 font-mono text-body-lg font-medium">{TOTP_SECRET}</p>
                        <Button variant="ghost" size="sm" icon={<Copy className="size-4" />} onClick={() => { void navigator.clipboard?.writeText(TOTP_SECRET.replace(/ /g, '')); toast.success('Đã sao chép khoá') }}>Sao chép</Button>
                      </div>
                    </div>
                  </div>
                )}
                <TextInput label={me.twoFA ? 'Nhập mật khẩu hiện tại để tắt 2FA' : 'B2. Nhập mật khẩu hiện tại'} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
                {!me.twoFA && <TextInput label="B3. Nhập mã 6 chữ số từ ứng dụng" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-widest" hint="Prototype chấp nhận mọi mã 6 chữ số, trừ 000000." />}
                <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                  <Button variant="outline" onClick={() => { setSetup(false); twofa.clearError() }}>Huỷ</Button>
                  <Button variant={me.twoFA ? 'danger' : 'primary'} loading={twofa.loading} disabled={!pw || (!me.twoFA && code.length !== 6)} onClick={toggle2FA}>{me.twoFA ? 'Xác nhận tắt 2FA' : 'Xác nhận bật 2FA'}</Button>
                </div>
              </div>
            )}
          </Card>

          <Card id="passkey">
            <h2 className="text-h4 font-semibold">3. Passkey (đăng nhập không mật khẩu) <span className="font-normal text-neutral-700">({me.passkeys.length}/{LIMITS.passkeys})</span></h2>
            <ul className="mt-4 divide-y divide-neutral-200 rounded-md border border-neutral-200">
              {me.passkeys.length === 0 && <li className="p-4 text-body-md text-neutral-700">Chưa có Passkey nào.</li>}
              {me.passkeys.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="flex items-center gap-3 text-body-md"><Fingerprint className="size-5 text-primary-700" aria-hidden /><span><span className="font-semibold">{p.name}</span><span className="block text-caption text-neutral-700">Tạo {formatDate(p.createdAt)}</span></span></span>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { const name = window.prompt('Tên mới cho Passkey', p.name); if (name) api.renamePasskey(p.id, name) }}>Đổi tên</Button>
                    <Button variant="ghost" size="sm" className="text-danger-700" icon={<Trash2 className="size-4" />} onClick={() => { if (window.confirm(`Xoá Passkey "${p.name}"?`)) api.removePasskey(p.id) }}>Xoá</Button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Button variant="outline" icon={<Plus className="size-4" />} disabled={me.passkeys.length >= LIMITS.passkeys} onClick={() => { try { api.addPasskey(`Thiết bị ${me.passkeys.length + 1}`); toast.success('Đã thêm Passkey (giả lập)') } catch (e) { toast.error(e instanceof Error ? e.message : 'Lỗi') } }}>Thêm Passkey mới</Button>
            </div>
          </Card>

          <Card id="danger" className="border-danger-600">
            <h2 className="text-h4 font-semibold text-danger-700">4. Vùng nguy hiểm</h2>
            <p className="mt-2 text-body-md text-neutral-700">Xoá vĩnh viễn tài khoản. Không thể khôi phục.</p>
            <div className="mt-4"><Button variant="danger" onClick={() => setDel(true)}>Xoá tài khoản của tôi</Button></div>
          </Card>
        </div>
      </div>

      <Modal open={del} onClose={() => setDel(false)} title="Xoá vĩnh viễn tài khoản?" tone="danger"
        footer={<><Button variant="outline" onClick={() => setDel(false)}>Huỷ</Button><Button variant="danger" loading={remove.loading} disabled={!delPw} onClick={deleteAccount}>Tôi hiểu, xoá tài khoản</Button></>}>
        <p className="text-body-md font-semibold">Hành động này KHÔNG THỂ HOÀN TÁC và có hiệu lực ngay:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-body-md text-neutral-700">
          <li>Email, username, avatar và Bio của bạn bị xoá; tên hiển thị đổi thành "Deleted MediQ user".</li>
          <li>Câu hỏi, bài viết và bình luận của bạn được giữ lại, hiển thị dưới tên "Deleted MediQ user".</li>
          <li>Dấu trang (Bookmark) và thông báo của bạn bị xoá.</li>
          {me.role === 'VERIFIED_DOCTOR' && <li>Hồ sơ chuyên môn và ảnh giấy phép bị xoá vĩnh viễn.</li>}
          <li>Bạn bị đăng xuất khỏi mọi thiết bị.</li>
        </ul>
        <div className="mt-4"><TextInput label="Nhập mật khẩu hiện tại để xác nhận" type="password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} error={remove.error?.message} /></div>
      </Modal>
    </div>
  )
}
