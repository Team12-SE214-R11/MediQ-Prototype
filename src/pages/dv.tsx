import { AlertTriangle, Check, ChevronDown, ClipboardCheck, Clock, Lock, ShieldCheck, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ImageGrid, ImageUploader, StatusBadge } from '../components/domain'
import { Breadcrumb, Button, Card, EmptyState, ErrorBanner, InfoBox, TextInput, toast, useAction } from '../components/ui'
import { LIMITS, cn, formatDate, formatDateTime } from '../lib/utils'
import { api, call, latestVerification, useCurrentUser, useDb } from '../mock/store'

const GUIDE = [
  'Ảnh rõ nét, không mất góc, không chụp màn hình mờ.',
  'Định dạng: JPG, PNG, WEBP, GIF tĩnh.',
  `Tối đa ${LIMITS.verificationFiles} tệp, mỗi tệp không quá ${LIMITS.fileSizeMB} MB.`,
  'Thời gian duyệt: 1–3 ngày làm việc.',
]

// ---------- WF-DV-01 ----------
export function ApplyVerificationPage() {
  const db = useDb()
  const me = useCurrentUser()!
  const navigate = useNavigate()
  const last = latestVerification(db, me.id)
  const type = me.role === 'VERIFIED_DOCTOR' ? 'UPDATE' : last ? 'RESUBMISSION' : 'NEW'
  const [f, setF] = useState({ license: last?.license ?? '', specialty: last?.specialty ?? '', title: last?.title ?? '', workplace: last?.workplace ?? '', startYear: last ? String(last.startYear) : '' })
  const [files, setFiles] = useState<string[]>([])
  const [consent, setConsent] = useState(false)
  const [touched, setTouched] = useState(false)
  const [guide, setGuide] = useState(false)
  const { run, loading, error } = useAction()
  const year = new Date().getFullYear()
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const req = (v: string) => (v.trim() ? null : 'Trường này là bắt buộc.')
  const errs = {
    license: req(f.license), specialty: req(f.specialty), title: req(f.title), workplace: req(f.workplace),
    startYear: /^\d{4}$/.test(f.startYear) && +f.startYear >= 1900 && +f.startYear <= year ? null : `Nhập năm từ 1900 đến ${year}.`,
    files: files.length >= 1 ? null : 'Cần ít nhất 1 ảnh minh chứng.',
    consent: consent ? null : 'Bạn cần đồng ý công khai thông tin chuyên môn.',
  }
  const show = (k: keyof typeof errs) => (touched ? errs[k] : null)

  if (last?.status === 'PENDING') {
    return <EmptyState icon={<Clock />} title="Bạn đang có một hồ sơ chờ thẩm định" description="Vui lòng chờ kết quả trước khi nộp hồ sơ mới." action={<Button onClick={() => navigate('/doctor-verification/status')}>Xem trạng thái hồ sơ</Button>} />
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.values(errs).some(Boolean)) {
      toast.error('Vui lòng kiểm tra các trường được đánh dấu.')
      return
    }
    const ok = await run(() => call(() => { api.submitVerification({ ...f, startYear: +f.startYear, files }); return true }, 700), { silent: true })
    if (ok) {
      toast.success('Gửi hồ sơ thẩm định bác sĩ thành công')
      navigate('/doctor-verification/status')
    }
  }
  const guideList = <ul className="list-disc space-y-2 pl-5 text-body-md text-neutral-700">{GUIDE.map((g) => <li key={g}>{g}</li>)}</ul>
  return (
    <form onSubmit={submit} noValidate>
      <Breadcrumb items={['Trang chủ', 'Xác minh Bác sĩ', 'Nộp hồ sơ']} />
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2 text-primary-900 md:text-h1">Nộp hồ sơ xác minh bác sĩ</h1>
          <StatusBadge status={type} />
        </div>
        <div className="mt-4"><InfoBox icon={<Lock />}>Tài liệu chứng chỉ hành nghề được lưu trữ riêng tư, chỉ Quản trị viên thẩm định được xem và tự động xoá sau 30 ngày kể từ khi có kết quả.</InfoBox></div>
      </Card>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="space-y-6 lg:col-span-8">
          {error && <ErrorBanner message={error.message} />}
          <h2 className="text-h3">1. Thông tin hành nghề y khoa</h2>
          <TextInput label="Số giấy phép hành nghề (CCHN)" required value={f.license} onChange={set('license')} max={LIMITS.license} error={show('license')} placeholder="012345/HCM-CCHN" />
          <TextInput label="Chuyên khoa chính" required value={f.specialty} onChange={set('specialty')} max={LIMITS.specialty} error={show('specialty')} placeholder="Nội Tim Mạch" />
          <TextInput label="Chức danh chuyên môn" required value={f.title} onChange={set('title')} max={LIMITS.specialty} error={show('title')} placeholder="Bác sĩ Chuyên khoa I" />
          <TextInput label="Nơi công tác (Bệnh viện / Phòng khám)" required value={f.workplace} onChange={set('workplace')} max={LIMITS.workplace} error={show('workplace')} placeholder="Bệnh viện Chợ Rẫy" />
          <TextInput label="Năm bắt đầu hành nghề" required inputMode="numeric" maxLength={4} value={f.startYear} onChange={(e) => setF({ ...f, startYear: e.target.value.replace(/\D/g, '') })} error={show('startYear')} hint={`Từ 1900 đến ${year}.`} className="md:max-w-40" />
          <h2 className="text-h3">2. Minh chứng bằng cấp & CCHN <span className="text-danger-600">*</span></h2>
          <div>
            <ImageUploader images={files} onChange={setFiles} max={LIMITS.verificationFiles} label="Ảnh chứng chỉ hành nghề" />
            {show('files') && <p role="alert" className="mt-2 text-caption text-danger-700">{errs.files}</p>}
          </div>
          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-body-md">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-[18px] shrink-0 accent-primary-700" />
              <span>Tôi đồng ý công khai thông tin chuyên môn (chuyên khoa, chức danh, nơi công tác, số năm kinh nghiệm) trên Doctor Profile sau khi được duyệt. <span className="text-danger-600">*</span></span>
            </label>
            {show('consent') && <p role="alert" className="mt-1 text-caption text-danger-700">{errs.consent}</p>}
          </div>
          {/* Mobile: phần hướng dẫn từ right rail thành accordion */}
          <div className="rounded-md border border-neutral-200 lg:hidden">
            <button type="button" aria-expanded={guide} onClick={() => setGuide((g) => !g)} className="flex h-12 w-full items-center justify-between px-3 text-body-md font-semibold">
              Hướng dẫn & quy định hợp lệ<ChevronDown className={cn('size-5 transition-transform duration-200', guide && 'rotate-180')} />
            </button>
            {guide && <div className="px-3 pb-3">{guideList}</div>}
          </div>
        </Card>
        <aside className="hidden lg:col-span-4 lg:block">
          <Card className="sticky top-28">
            <h2 className="text-h4 font-semibold">Hướng dẫn & quy định hợp lệ</h2>
            <div className="mt-3">{guideList}</div>
            <Link to="/doctor-verification/status" className="mt-4 inline-block text-body-md font-semibold text-primary-500 underline">Xem trạng thái hồ sơ hiện tại</Link>
          </Card>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-[100] flex gap-3 border-t border-neutral-200 bg-white p-3 md:static md:mt-6 md:justify-end md:border-0 md:bg-transparent md:p-0">
        <Button variant="outline" className="hidden md:inline-flex" onClick={() => navigate(-1)}>Huỷ bỏ</Button>
        <Button type="submit" size="lg" loading={loading} className="flex-1 md:h-10 md:flex-none md:px-4 md:text-body-md">Gửi hồ sơ thẩm định</Button>
      </div>
      <div className="h-20 md:hidden" />
    </form>
  )
}

// ---------- WF-DV-02 ----------
function Step({ state, label, sub }: { state: 'done' | 'wait' | 'fail' | 'todo'; label: string; sub?: string }) {
  const style = { done: 'bg-success-600 text-white', wait: 'bg-warning-600 text-white', fail: 'bg-danger-600 text-white', todo: 'bg-neutral-200 text-neutral-700' }[state]
  const Icon = { done: Check, wait: Clock, fail: X, todo: ClipboardCheck }[state]
  return (
    <li className="flex flex-1 items-center gap-3 md:flex-col md:text-center">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', style)}><Icon className="size-5" aria-hidden /></span>
      <span><span className="block text-body-md font-semibold text-neutral-900">{label}</span>{sub && <span className="block text-caption text-neutral-700">{sub}</span>}</span>
    </li>
  )
}

export function VerificationStatusPage() {
  const db = useDb()
  const me = useCurrentUser()!
  const navigate = useNavigate()
  const all = db.verifications.filter((v) => v.accountId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const v = all[0]
  if (!v) {
    return (
      <div className="mx-auto max-w-[845px]">
        <Breadcrumb items={['Trang chủ', 'Xác minh Bác sĩ']} />
        <Card className="text-center">
          <ShieldCheck className="mx-auto size-16 text-badge-cyan" aria-hidden />
          <h1 className="mt-4 text-h2 text-primary-900">Trở thành Bác sĩ xác minh trên MediQ</h1>
          <p className="mx-auto mt-2 max-w-lg text-body-md text-neutral-700">Xác minh chứng chỉ hành nghề để nhận huy hiệu Bác sĩ xác minh, câu trả lời của bạn được làm nổi bật và bạn có thể đăng bài viết chuyên môn.</p>
          <div className="mt-6"><Button size="lg" variant="secondary" onClick={() => navigate('/doctor-verification/apply')}>Nộp hồ sơ xác minh</Button></div>
        </Card>
      </div>
    )
  }
  const decided = v.status !== 'PENDING'
  const rows: Array<[string, string]> = [['Số CCHN', v.license], ['Chuyên khoa', v.specialty], ['Chức danh', v.title], ['Nơi công tác', v.workplace], ['Năm hành nghề', String(v.startYear)], ['Minh chứng', `${v.files.length} tệp đã tải lên`]]
  return (
    <div className="mx-auto max-w-[1063px] space-y-6">
      <Breadcrumb items={['Trang chủ', 'Xác minh Bác sĩ', 'Trạng thái hồ sơ']} />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h3 text-primary-900 md:text-h2">Hồ sơ thẩm định hiện tại <span className="font-mono text-neutral-700">#{v.id}</span></h1>
          <div className="flex gap-2"><StatusBadge status={v.type} /><StatusBadge status={v.status} /></div>
        </div>
        <ol className="mt-6 flex flex-col gap-4 md:flex-row md:items-start">
          <Step state="done" label="Đã nộp hồ sơ" sub={formatDate(v.createdAt)} />
          <Step state={decided ? 'done' : 'wait'} label="Admin thẩm định" sub={decided ? 'Đã có kết quả' : 'Đang chờ duyệt'} />
          <Step state={v.status === 'APPROVED' ? 'done' : v.status === 'PENDING' ? 'todo' : 'fail'} label={v.status === 'APPROVED' ? 'Đã phê duyệt' : v.status === 'REJECTED' ? 'Bị từ chối' : v.status === 'REVOKED' ? 'Đã thu hồi' : 'Kết quả'} sub={v.decidedAt ? formatDate(v.decidedAt) : undefined} />
        </ol>
        {v.reason && (
          <div className="mt-6">
            <InfoBox tone="danger" icon={<AlertTriangle />}>
              <p className="font-semibold">{v.status === 'REVOKED' ? 'Lý do thu hồi từ Ban Quản trị:' : 'Lý do từ chối từ Ban Quản trị:'}</p>
              <p className="mt-1">{v.reason}</p>
            </InfoBox>
          </div>
        )}
        {v.status === 'APPROVED' && <div className="mt-6"><InfoBox icon={<ShieldCheck />}>Tài khoản của bạn đã có huy hiệu Bác sĩ xác minh. <Link to={`/doctor/${me.username}`} className="font-semibold text-primary-500 underline">Xem hồ sơ bác sĩ</Link></InfoBox></div>}
        <h2 className="mt-6 text-h4 font-semibold">Thông tin đã khai báo</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          {rows.map(([k, val]) => <div key={k}><dt className="text-body-md text-neutral-500">{k}</dt><dd className="text-body-md font-semibold break-words">{val}</dd></div>)}
        </dl>
        <div className="mt-4"><ImageGrid images={v.files} label="Tệp minh chứng đã nộp" /></div>
        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          {(v.status === 'REJECTED' || v.status === 'REVOKED') && <Button size="lg" className="md:h-10" onClick={() => navigate('/doctor-verification/apply')}>Nộp lại hồ sơ</Button>}
          {v.status === 'APPROVED' && <Button variant="outline" onClick={() => navigate('/doctor-verification/apply')}>Nộp hồ sơ cập nhật</Button>}
        </div>
      </Card>

      <Card>
        <h2 className="text-h4 font-semibold">Lịch sử thẩm định</h2>
        {/* Desktop: bảng. Mobile: danh sách cặp nhãn / giá trị. */}
        <ul className="mt-3 divide-y divide-neutral-200">
          {all.flatMap((x) => [...x.history].reverse().map((h, i) => (
            <li key={`${x.id}-${i}`} className="grid grid-cols-1 gap-1 py-3 text-body-md md:grid-cols-[160px_110px_120px_130px_1fr] md:items-center md:gap-4">
              <span className="tabular-nums text-neutral-700">{formatDateTime(h.at)}</span>
              <span className="font-mono">{x.id}</span>
              <span className="font-semibold">{h.action}</span>
              <span><StatusBadge status={h.status} /></span>
              <span className="break-words text-neutral-700">{h.note || '—'}</span>
            </li>
          )))}
        </ul>
      </Card>
    </div>
  )
}
