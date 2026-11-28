import { AlertTriangle, ArrowLeft, Check, ExternalLink, Info, Maximize2, Plus, RefreshCw, RotateCw, Search, ShieldAlert, ShieldCheck, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Fragment, type ReactNode, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ImageGrid, Lightbox, StatusBadge, TagChip } from '../components/domain'
import { Badge, Button, Card, Drawer, EmptyState, ErrorBanner, IconButton, InfoBox, Modal, Pagination, Select, Tabs, TextInput, Textarea, toast, useAction } from '../components/ui'
import { NotFoundPage } from '../layouts'
import { LIMITS, cn, excerpt, formatDate, formatDateTime } from '../lib/utils'
import { accountById, api, call, cascadeImpact, displayNameOf, useDb } from '../mock/store'
import type { Account, Report, ReportStatus, VerificationStatus } from '../types'

// ---------- Thành phần dùng chung ----------
function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-h2 text-neutral-950">{children}</h1>{action}</div>
}

function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto border border-neutral-200 bg-white">
      <table className="w-full text-left text-body-md">
        <thead className="bg-neutral-100 text-body-md font-semibold text-neutral-900">
          <tr>{head.map((h) => <th key={h} scope="col" className="h-12 px-4 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {empty ? <tr><td colSpan={head.length} className="p-8 text-center text-neutral-700">Không có bản ghi nào.</td></tr> : children}
        </tbody>
      </table>
    </div>
  )
}
const TD = 'px-4 py-3 align-middle'

function usePaged<T>(items: T[], size: number = LIMITS.pageSize) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(page, pageCount)
  const slice = items.slice((current - 1) * size, current * size)
  const from = items.length === 0 ? 0 : (current - 1) * size + 1
  return { slice, node: <div className="mt-4"><Pagination page={current} pageCount={pageCount} onChange={setPage} summary={`Hiển thị ${from}–${from + slice.length - (slice.length ? 1 : 0)} / ${items.length}`} /></div> }
}

/** Modal tạm khoá dùng chung cho hàng đợi báo cáo và trang tài khoản (WF-ADM-06). */
function SuspendModal({ account, defaultReason = '', onClose }: { account: Account; defaultReason?: string; onClose: () => void }) {
  const [choice, setChoice] = useState('7')
  const [custom, setCustom] = useState('')
  const [reason, setReason] = useState(defaultReason)
  const { run, loading, error } = useAction()
  const days = choice === 'indefinite' ? null : choice === 'custom' ? Number(custom) : Number(choice)
  const submit = async () => {
    const ok = await run(() => call(() => { api.suspend(account.id, days, reason); return true }), { silent: true })
    if (ok) {
      toast.success(`Đã tạm khoá @${account.username} và ghi Audit Log`)
      onClose()
    }
  }
  return (
    <Modal open onClose={onClose} title={`Tạm khoá tài khoản: @${account.username}`} tone="danger"
      footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><Button variant="danger" loading={loading} onClick={submit}>Xác nhận tạm khoá</Button></>}>
      <InfoBox tone="warning" icon={<AlertTriangle />}>Hệ thống sẽ thu hồi tức thì toàn bộ Access & Refresh Token của tài khoản này.</InfoBox>
      <fieldset className="mt-4">
        <legend className="mb-2 text-body-md font-medium">Thời hạn tạm khoá <span className="text-danger-600">*</span></legend>
        <div className="grid grid-cols-2 gap-x-4 md:grid-cols-4">
          {[['1', '1 ngày'], ['3', '3 ngày'], ['7', '7 ngày'], ['30', '30 ngày'], ['180', '180 ngày'], ['365', '365 ngày'], ['custom', 'Tuỳ chỉnh'], ['indefinite', 'Vô thời hạn']].map(([v, l]) => (
            <label key={v} className="flex h-11 cursor-pointer items-center gap-2 text-body-md"><input type="radio" name="suspend-days" checked={choice === v} onChange={() => setChoice(v)} className="size-[18px] accent-primary-700" />{l}</label>
          ))}
        </div>
        {choice === 'custom' && <div className="mt-2 max-w-40"><TextInput label="Số ngày (1–365)" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} /></div>}
      </fieldset>
      <div className="mt-4"><Textarea label="Lý do tạm khoá (ghi vào Audit Log)" required value={reason} onChange={(e) => setReason(e.target.value)} max={LIMITS.reason} error={error?.message} /></div>
    </Modal>
  )
}

function ReasonModal({ title, label, confirm, onClose, onSubmit }: { title: string; label: string; confirm: string; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const { run, loading, error } = useAction()
  return (
    <Modal open onClose={onClose} title={title} tone="danger"
      footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><Button variant="danger" loading={loading} onClick={async () => { if (await run(() => call(() => { onSubmit(reason); return true }), { silent: true })) onClose() }}>{confirm}</Button></>}>
      <Textarea label={label} required value={reason} onChange={(e) => setReason(e.target.value)} max={LIMITS.reason} error={error?.message} autoFocus />
    </Modal>
  )
}

// ---------- WF-ADM-01 ----------
function Stat({ label, value, note, big, action }: { label: string; value: number; note?: string; big?: boolean; action?: ReactNode }) {
  return (
    <Card className={cn(big && 'border-l-4 border-l-warning-600')}>
      <p className="text-caption text-neutral-700 uppercase">{label}</p>
      <p className={cn('mt-2 tabular-nums text-neutral-950', big ? 'text-h1' : 'text-h2')}>{value.toLocaleString('vi-VN')}</p>
      {note && <p className="mt-1 text-caption text-neutral-700">{note}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  )
}

export function AdminDashboardPage() {
  const db = useDb()
  const navigate = useNavigate()
  const [at, setAt] = useState(() => new Date().toISOString())
  const active = (kind: 'question' | 'article') => db.posts.filter((p) => p.kind === kind && p.status === 'ACTIVE').length
  return (
    <>
      <PageTitle action={<Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => { setAt(new Date().toISOString()); toast.success('Đã làm mới số liệu') }}>Làm mới số liệu</Button>}>Dashboard vận hành hệ thống</PageTitle>
      <p className="-mt-4 mb-6 text-body-md text-neutral-700">Cập nhật lúc: {formatDateTime(at)}</p>
      <div className="grid grid-cols-2 gap-6">
        <Stat big label="Hồ sơ chờ thẩm định" value={db.verifications.filter((v) => v.status === 'PENDING').length} note="PENDING (gồm nộp lại và cập nhật)" action={<Button onClick={() => navigate('/admin/verifications')}>Xử lý ngay →</Button>} />
        <Stat big label="Báo cáo vi phạm" value={db.reports.filter((r) => r.status === 'PENDING' || r.status === 'REVIEWING').length} note="PENDING / REVIEWING" action={<Button onClick={() => navigate('/admin/reports')}>Xử lý ngay →</Button>} />
      </div>
      <div className="mt-6 grid grid-cols-4 gap-6">
        <Stat label="User Active" value={db.accounts.filter((a) => a.status === 'ACTIVE' && a.role !== 'ADMIN').length} note="Không tính Admin" />
        <Stat label="Verified Doctor" value={db.accounts.filter((a) => a.status === 'ACTIVE' && a.role === 'VERIFIED_DOCTOR').length} note="Đang hoạt động" />
        <Stat label="Câu hỏi" value={active('question')} note="Active" />
        <Stat label="Bài viết" value={active('article')} note="Active" />
      </div>
      <Card className="mt-6">
        <h2 className="text-h4 font-semibold">Lối tắt vận hành nhanh</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/verifications')}>Duyệt hồ sơ bác sĩ</Button>
          <Button variant="outline" onClick={() => navigate('/admin/reports')}>Xử lý report</Button>
          <Button variant="outline" onClick={() => navigate('/admin/tags')}>Quản lý tag</Button>
        </div>
      </Card>
      <p className="mt-4 text-caption text-neutral-700">Lưu ý: số liệu không bao gồm tài khoản / nội dung DELETED.</p>
    </>
  )
}

// ---------- WF-ADM-02 ----------
export function VerificationQueuePage() {
  const db = useDb()
  const [tab, setTab] = useState<VerificationStatus>('PENDING')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState<'old' | 'new'>('old')
  const count = (s: VerificationStatus) => db.verifications.filter((v) => v.status === s).length
  const rows = db.verifications
    .filter((v) => v.status === tab && (!type || v.type === type))
    .filter((v) => { const a = accountById(db, v.accountId); return !q || [v.license, v.id, a?.displayName ?? '', a?.username ?? ''].some((s) => s.toLowerCase().includes(q.toLowerCase())) })
    .sort((a, b) => (sort === 'old' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)))
  const paged = usePaged(rows)
  return (
    <>
      <PageTitle>Hàng đợi thẩm định hồ sơ bác sĩ</PageTitle>
      <Tabs value={tab} onChange={setTab} items={[{ value: 'PENDING', label: 'Chờ duyệt', count: count('PENDING') }, { value: 'APPROVED', label: 'Đã duyệt', count: count('APPROVED') }, { value: 'REJECTED', label: 'Bị từ chối', count: count('REJECTED') }, { value: 'REVOKED', label: 'Đã thu hồi', count: count('REVOKED') }]} />
      <div className="my-4 flex flex-wrap items-end gap-4">
        <div className="w-72"><TextInput aria-label="Tìm CCHN hoặc tên" placeholder="Tìm CCHN / tên bác sĩ…" prefix={<Search className="size-4" />} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select label="Loại" value={type} onChange={(e) => setType(e.target.value)}><option value="">Tất cả</option><option value="NEW">Nộp lần đầu</option><option value="RESUBMISSION">Nộp lại</option><option value="UPDATE">Cập nhật</option></Select>
        <Select label="Sắp xếp" value={sort} onChange={(e) => setSort(e.target.value as 'old' | 'new')}><option value="old">Cũ nhất trước</option><option value="new">Mới nhất trước</option></Select>
      </div>
      <Table head={['Mã HS', 'Ứng viên', 'Loại', 'Chuyên khoa', 'Ngày nộp', '']} empty={rows.length === 0}>
        {paged.slice.map((v) => {
          const a = accountById(db, v.accountId)
          return (
            <tr key={v.id} className="hover:bg-neutral-50">
              <td className={cn(TD, 'font-mono')}>#{v.id}</td>
              <td className={TD}><span className="font-semibold">{displayNameOf(a)}</span><span className="block text-caption text-neutral-700">{v.workplace}</span></td>
              <td className={TD}><StatusBadge status={v.type} /></td>
              <td className={TD}>{v.specialty}</td>
              <td className={cn(TD, 'tabular-nums')}>{formatDate(v.createdAt)}</td>
              <td className={cn(TD, 'text-right')}><Link to={`/admin/verifications/${v.id}`} className="inline-flex h-10 items-center rounded-md border border-primary-700 px-4 font-semibold text-primary-700 hover:bg-primary-50">Xem</Link></td>
            </tr>
          )
        })}
      </Table>
      {paged.node}
    </>
  )
}

// ---------- WF-ADM-03 ----------
export function VerificationDetailPage() {
  const { id } = useParams()
  const db = useDb()
  const navigate = useNavigate()
  const v = db.verifications.find((x) => x.id === id)
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [full, setFull] = useState(false)
  const [modal, setModal] = useState<'approve' | 'reject' | 'revoke' | null>(null)
  const { run, loading, error } = useAction()
  if (!v) return <NotFoundPage />
  const a = accountById(db, v.accountId)
  const info: Array<[string, ReactNode]> = [
    ['Số CCHN', <span className="font-mono">{v.license}</span>], ['Chuyên khoa', v.specialty], ['Chức danh', v.title], ['Nơi công tác', v.workplace], ['Năm bắt đầu', v.startYear],
    ['Tài khoản', <span className="flex items-center gap-2">@{a?.username} <StatusBadge status={a?.status ?? 'DELETED'} /></span>], ['Consent công khai', 'Đã đồng ý'],
  ]
  const act = async (fn: () => void, message: string) => {
    const ok = await run(() => call(() => { fn(); return true }), { silent: true })
    if (ok) {
      toast.success(message, { label: 'Xem Audit Log', onClick: () => navigate('/admin/audit-logs') })
      setModal(null)
    }
  }
  return (
    <>
      <PageTitle action={<Button variant="outline" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/admin/verifications')}>Quay lại</Button>}>
        <span className="flex flex-wrap items-center gap-3">Hồ sơ #{v.id} — {displayNameOf(a)} <StatusBadge status={v.status} /> <StatusBadge status={v.type} /></span>
      </PageTitle>
      {error && <div className="mb-4"><ErrorBanner message={error.message} /></div>}
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-h4 font-semibold">Công cụ soi chiếu minh chứng</h2>
            <span className="text-body-md text-neutral-700">Tệp {index + 1} / {v.files.length}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1" role="toolbar" aria-label="Công cụ ảnh">
            <IconButton label="Thu nhỏ" disabled={zoom <= 0.5} onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}><ZoomOut className="size-5" /></IconButton>
            <span className="w-14 text-center font-semibold tabular-nums">{zoom * 100}%</span>
            <IconButton label="Phóng to" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, z + 0.5))}><ZoomIn className="size-5" /></IconButton>
            <IconButton label="Xoay 90 độ" onClick={() => setRotate((r) => r + 90)}><RotateCw className="size-5" /></IconButton>
            <Button variant="ghost" size="sm" onClick={() => { setZoom(1); setRotate(0) }}>Đặt lại</Button>
            <IconButton label="Toàn màn hình" onClick={() => setFull(true)}><Maximize2 className="size-5" /></IconButton>
          </div>
          <div className="mt-3 flex h-[480px] items-center justify-center overflow-auto rounded-md bg-primary-950">
            <img src={v.files[index]} alt={`Ảnh minh chứng số ${index + 1}`} className="max-h-full max-w-full transition-transform duration-150" style={{ transform: `scale(${zoom}) rotate(${rotate}deg)` }} />
          </div>
          <ul className="mt-3 flex gap-2">
            {v.files.map((src, i) => (
              <li key={i}><button type="button" aria-label={`Xem tệp ${i + 1}`} aria-pressed={i === index} onClick={() => { setIndex(i); setZoom(1); setRotate(0) }} className={cn('overflow-hidden rounded-md border-2', i === index ? 'border-primary-500' : 'border-neutral-200')}><img src={src} alt="" className="size-16 object-cover" /></button></li>
            ))}
          </ul>
        </Card>
        <Card className="col-span-4">
          <h2 className="text-h4 font-semibold">Thông tin chuyên môn</h2>
          <dl className="mt-3 space-y-3">{info.map(([k, val]) => <div key={k}><dt className="text-body-md text-neutral-500">{k}</dt><dd className="text-body-md font-semibold break-words">{val}</dd></div>)}</dl>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="text-h4 font-semibold">Quyết định thẩm định <span className="text-body-md font-normal text-neutral-700">(ghi Audit Log)</span></h2>
        {v.reason && <p className="mt-2 text-body-md text-neutral-700"><span className="font-semibold">Lý do đã ghi:</span> {v.reason}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          {v.status === 'PENDING' && <><Button icon={<Check className="size-4" />} onClick={() => setModal('approve')}>Phê duyệt</Button><Button variant="danger" icon={<X className="size-4" />} onClick={() => setModal('reject')}>Từ chối</Button></>}
          {v.status === 'REJECTED' && <Button variant="secondary" loading={loading} onClick={() => act(() => api.reopenVerification(v.id), 'Đã mở lại hồ sơ')}>Mở lại</Button>}
          {v.status === 'APPROVED' && <Button variant="danger" onClick={() => setModal('revoke')}>Thu hồi xác minh</Button>}
          {v.status === 'REVOKED' && <p className="text-body-md text-neutral-700">Hồ sơ đã bị thu hồi. Người dùng có thể nộp lại hồ sơ mới.</p>}
        </div>
      </Card>
      <Card className="mt-6">
        <h2 className="text-h4 font-semibold">Lịch sử hồ sơ</h2>
        <ol className="mt-3 space-y-2 text-body-md">{v.history.map((h, i) => <li key={i}><span className="tabular-nums text-neutral-700">{formatDateTime(h.at)}</span> — <span className="font-semibold">{h.action}</span>{h.note && `: ${h.note}`}</li>)}</ol>
      </Card>

      <Modal open={modal === 'approve'} onClose={() => setModal(null)} title="Phê duyệt hồ sơ?" size="sm"
        footer={<><Button variant="outline" onClick={() => setModal(null)}>Huỷ</Button><Button loading={loading} onClick={() => act(() => api.approveVerification(v.id), 'Đã phê duyệt hồ sơ')}>Xác nhận phê duyệt</Button></>}>
        <p className="text-body-md text-neutral-700">Cấp quyền Verified Doctor và hiển thị huy hiệu Bác sĩ xác minh cho <span className="font-semibold">{displayNameOf(a)}</span>?</p>
      </Modal>
      {modal === 'reject' && <ReasonModal title="Từ chối hồ sơ" label="Lý do từ chối (gửi cho người nộp)" confirm="Xác nhận từ chối" onClose={() => setModal(null)} onSubmit={(r) => { api.rejectVerification(v.id, r); toast.success('Đã từ chối hồ sơ') }} />}
      {modal === 'revoke' && <ReasonModal title="Thu hồi xác minh bác sĩ" label="Lý do thu hồi (gửi cho bác sĩ)" confirm="Xác nhận thu hồi" onClose={() => setModal(null)} onSubmit={(r) => { api.revokeVerification(v.id, r); toast.success('Đã thu hồi xác minh; huy hiệu biến mất ngay') }} />}
      {full && <Lightbox images={v.files} start={index} onClose={() => setFull(false)} />}
    </>
  )
}

// ---------- WF-ADM-04 + WF-ADM-05 ----------
const TARGET_LABEL = { question: 'Question', article: 'Article', comment: 'Comment', account: 'Account' }

function ReportDrawer({ report, onClose }: { report: Report; onClose: () => void }) {
  const db = useDb()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [reason, setReason] = useState('')
  const [suspend, setSuspend] = useState(false)
  const { run, loading, error } = useAction()
  const post = report.targetType === 'question' || report.targetType === 'article' ? db.posts.find((p) => p.id === report.targetId) : undefined
  const comment = report.targetType === 'comment' ? db.comments.find((c) => c.id === report.targetId) : undefined
  const ownerId = report.targetType === 'account' ? report.targetId : (post?.authorId ?? comment?.authorId ?? '')
  const owner = accountById(db, ownerId)
  const content = post ?? comment
  const deleted = report.targetType !== 'account' && content?.status !== 'ACTIVE'
  const impact = cascadeImpact(db, report.targetType, report.targetId)
  const link = post ? `/${post.kind === 'question' ? 'questions' : 'articles'}/${post.id}` : comment ? (() => { const p = db.posts.find((x) => x.id === comment.postId); return p ? `/${p.kind === 'question' ? 'questions' : 'articles'}/${p.id}` : null })() : null
  const act = async (fn: () => void, message: string, close = false) => {
    const ok = await run(() => call(() => { fn(); return true }))
    if (ok) {
      toast.success(message, { label: 'Xem Audit Log', onClick: () => navigate('/admin/audit-logs') })
      if (close) onClose()
    }
    return ok
  }
  const removed = async () => {
    const ok = await run(() => call(() => { api.removeContent(report.targetType as 'question' | 'article' | 'comment', report.targetId, reason); return true }), { silent: true })
    if (ok) {
      toast.success('Đã gỡ nội dung kèm các comment thuộc nội dung này và ghi Audit Log', { label: 'Xem Audit Log', onClick: () => navigate('/admin/audit-logs') })
      setConfirm(false)
    }
  }
  return (
    <Drawer open onClose={onClose} title={`Chi tiết báo cáo #${report.id}`}
      footer={
        <div className="space-y-3">
          {report.status === 'PENDING' && <Button full loading={loading} onClick={() => act(() => api.takeReport(report.id), 'Đã tiếp nhận xử lý')}>Tiếp nhận xử lý</Button>}
          {report.status === 'REVIEWING' && (
            <>
              <div className="flex flex-wrap gap-3">
                {report.targetType !== 'account' && <Button variant="danger" icon={<Trash2 className="size-4" />} disabled={deleted} onClick={() => setConfirm(true)}>Gỡ nội dung</Button>}
                {owner && owner.status === 'ACTIVE' && owner.role !== 'ADMIN' && <Button variant="outline" className="border-warning-700 text-warning-700" icon={<ShieldAlert className="size-4" />} onClick={() => setSuspend(true)}>Tạm khoá @{owner.username}</Button>}
              </div>
              <div className="flex gap-3 border-t border-neutral-200 pt-3">
                <Button className="flex-1" icon={<Check className="size-4" />} loading={loading} onClick={() => act(() => api.closeReport(report.id, 'RESOLVED'), 'Đã hoàn tất báo cáo', true)}>Hoàn tất (Resolve)</Button>
                <Button className="flex-1" variant="outline" loading={loading} onClick={() => act(() => api.closeReport(report.id, 'REJECTED'), 'Đã bác bỏ báo cáo', true)}>Bác bỏ (Reject)</Button>
              </div>
            </>
          )}
          {(report.status === 'RESOLVED' || report.status === 'REJECTED') && <p className="text-body-md text-neutral-700">Báo cáo đã đóng, không còn thao tác.</p>}
        </div>
      }>
      <div className="flex flex-wrap gap-2"><StatusBadge status={report.status} /><Badge tone={report.severity === 'HIGH' ? 'danger' : 'warning'}>Mức độ: {report.severity === 'HIGH' ? 'Cao' : 'Trung bình'}</Badge></div>

      <h3 className="mt-6 text-h4 font-semibold">1. Thông tin báo cáo</h3>
      <dl className="mt-2 space-y-2 text-body-md">
        <div><dt className="inline text-neutral-500">Người báo cáo: </dt><dd className="inline font-semibold">@{accountById(db, report.reporterId)?.username}</dd> <span className="text-caption text-neutral-700">(ẩn danh với bên bị báo cáo)</span></div>
        <div><dt className="inline text-neutral-500">Loại vi phạm: </dt><dd className="inline font-semibold">{report.category}</dd></div>
        <div><dt className="inline text-neutral-500">Lý do: </dt><dd className="inline">“{report.reason}”</dd></div>
        <div><dt className="inline text-neutral-500">Thời điểm: </dt><dd className="inline tabular-nums">{formatDateTime(report.createdAt)}</dd></div>
      </dl>

      <h3 className="mt-6 text-h4 font-semibold">2. Ngữ cảnh nội dung bị tố cáo ({TARGET_LABEL[report.targetType]})</h3>
      {deleted && <div className="mt-2"><InfoBox tone="warning" icon={<Info />}>Nội dung mục tiêu đã bị xoá trước đó.</InfoBox></div>}
      <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-body-md"><span className="text-neutral-500">Tác giả: </span><span className="font-semibold">@{owner?.username ?? 'đã xoá'}</span> <StatusBadge status={owner?.status ?? 'DELETED'} /></p>
        {post && <p className="mt-2 text-body-lg font-semibold">{post.title}</p>}
        {content && <p className="mt-2 text-body-md break-words text-neutral-700">“{excerpt(content.body, 400)}”</p>}
        {report.targetType === 'account' && <p className="mt-2 text-body-md text-neutral-700">{owner?.bio || 'Tài khoản không có giới thiệu.'}</p>}
        {content && content.images.length > 0 && <div className="mt-3"><ImageGrid images={content.images} label="Ảnh trong nội dung" /></div>}
        {report.targetType !== 'account' && !deleted && <p className="mt-3 text-caption font-semibold text-danger-700">Các nội dung bị xoá tự động khi nội dung này bị gỡ: {impact.comments} bình luận, {impact.images} ảnh</p>}
        {link && !deleted && <Link to={link} className="mt-3 inline-flex items-center gap-1 text-body-md font-semibold text-primary-500 underline"><ExternalLink className="size-4" />Mở trang chi tiết (chỉ đọc)</Link>}
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Xác nhận gỡ nội dung vi phạm" tone="danger"
        footer={<><Button variant="outline" onClick={() => setConfirm(false)}>Huỷ</Button><Button variant="danger" loading={loading} onClick={removed}>Xác nhận gỡ vĩnh viễn</Button></>}>
        <p className="text-body-md">Nội dung bị gỡ: <span className="font-semibold">{TARGET_LABEL[report.targetType]} #{report.targetId}</span> (không thể khôi phục)</p>
        <p className="mt-3 text-body-md font-semibold">Phạm vi nội dung bị xoá tự động:</p>
        <ul className="mt-1 list-disc pl-5 text-body-md text-neutral-700">
          <li>{TARGET_LABEL[report.targetType]} #{report.targetId}</li>
          <li>{impact.comments} Comment / Reply con mọi cấp</li>
          <li>{impact.images} Image</li>
        </ul>
        <div className="mt-4"><Textarea label="Lý do kiểm duyệt (ghi vào Audit Log)" required value={reason} onChange={(e) => setReason(e.target.value)} max={LIMITS.reason} error={error?.message} /></div>
      </Modal>
      {/* Điền sẵn lý do tạm khoá bằng lý do vừa nhập khi gỡ nội dung để không phải gõ hai lần. */}
      {suspend && owner && <SuspendModal account={owner} defaultReason={reason || report.reason} onClose={() => setSuspend(false)} />}
    </Drawer>
  )
}

export function ReportsQueuePage() {
  const db = useDb()
  const [tab, setTab] = useState<ReportStatus>('PENDING')
  const [target, setTarget] = useState('')
  const [severity, setSeverity] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const count = (s: ReportStatus) => db.reports.filter((r) => r.status === s).length
  const rows = db.reports.filter((r) => r.status === tab && (!target || r.targetType === target) && (!severity || r.severity === severity))
  const paged = usePaged(rows)
  const open = db.reports.find((r) => r.id === openId)
  return (
    <>
      <PageTitle>Hàng đợi xử lý báo cáo vi phạm</PageTitle>
      <Tabs value={tab} onChange={setTab} items={[{ value: 'PENDING', label: 'Chờ xử lý', count: count('PENDING') }, { value: 'REVIEWING', label: 'Đang xem xét', count: count('REVIEWING') }, { value: 'RESOLVED', label: 'Đã giải quyết', count: count('RESOLVED') }, { value: 'REJECTED', label: 'Đã bác bỏ', count: count('REJECTED') }]} />
      <div className="my-4 flex flex-wrap gap-4">
        <Select label="Loại mục tiêu" value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Tất cả</option><option value="question">Question</option><option value="article">Article</option><option value="comment">Comment</option><option value="account">Account</option></Select>
        <Select label="Mức độ" value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="">Tất cả</option><option value="HIGH">Cao</option><option value="MEDIUM">Trung bình</option></Select>
      </div>
      <Table head={['Mã RP', 'Đối tượng', 'Lý do / Mức độ', 'Trạng thái', '']} empty={rows.length === 0}>
        {paged.slice.map((r) => (
          <tr key={r.id} className="hover:bg-neutral-50">
            <td className={cn(TD, 'font-mono')}>#{r.id}</td>
            <td className={TD}><span className="font-semibold">{TARGET_LABEL[r.targetType]}</span><span className="block font-mono text-caption text-neutral-700">{r.targetType === 'account' ? `@${accountById(db, r.targetId)?.username}` : `#${r.targetId}`}</span></td>
            <td className={TD}><StatusBadge status={r.severity} /> <span className="ml-1">{r.category}</span><span className="mt-1 line-clamp-1 block text-caption text-neutral-700">{r.reason}</span></td>
            <td className={TD}><StatusBadge status={r.status} /></td>
            <td className={cn(TD, 'text-right')}><Button variant="outline" onClick={() => setOpenId(r.id)}>{r.status === 'PENDING' ? 'Xem / Nhận' : r.status === 'REVIEWING' ? 'Xử lý →' : 'Xem'}</Button></td>
          </tr>
        ))}
      </Table>
      {paged.node}
      {open && <ReportDrawer report={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

// ---------- WF-ADM-06 ----------
export function AccountsPage() {
  const db = useDb()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [suspendId, setSuspendId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const { run } = useAction()
  const rows = db.accounts.filter((a) => a.status !== 'DELETED' && (!role || a.role === role) && (!status || a.status === status) && (!q || [a.username, a.email, a.displayName].some((s) => s.toLowerCase().includes(q.toLowerCase()))))
  const paged = usePaged(rows)
  const suspending = db.accounts.find((a) => a.id === suspendId)
  const detail = db.accounts.find((a) => a.id === detailId)
  const daysLeft = (a: Account) => (a.suspendedUntil ? `Còn ${Math.max(1, Math.ceil((new Date(a.suspendedUntil).getTime() - Date.now()) / 86_400_000))} ngày` : 'Vô thời hạn')
  const unsuspend = (a: Account) => run(() => call(() => { api.unsuspend(a.id); toast.success(`Đã mở khoá @${a.username}`) }))
  return (
    <>
      <PageTitle>Quản lý & kiểm soát tài khoản người dùng</PageTitle>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-72"><TextInput aria-label="Tìm tài khoản" placeholder="Tìm username / email…" prefix={<Search className="size-4" />} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select label="Vai trò" value={role} onChange={(e) => setRole(e.target.value)}><option value="">Tất cả</option><option value="NORMAL_USER">NORMAL_USER</option><option value="VERIFIED_DOCTOR">VERIFIED_DOCTOR</option><option value="ADMIN">ADMIN</option></Select>
        <Select label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả</option><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option><option value="UNVERIFIED">UNVERIFIED</option></Select>
      </div>
      <Table head={['Username', 'Vai trò', 'Trạng thái', 'Hành động']} empty={rows.length === 0}>
        {paged.slice.map((a) => (
          <tr key={a.id} className="hover:bg-neutral-50">
            <td className={TD}><button type="button" onClick={() => setDetailId(a.id)} className="text-left font-semibold text-primary-500 underline">@{a.username}</button><span className="block text-caption text-neutral-700">{a.displayName}</span></td>
            <td className={cn(TD, 'font-mono text-caption')}>{a.role}</td>
            <td className={TD}><StatusBadge status={a.status} />{a.status === 'SUSPENDED' && <span className="ml-2 text-caption text-neutral-700">({daysLeft(a)})</span>}</td>
            <td className={TD}>
              {a.role === 'ADMIN' ? <span className="text-neutral-700">—</span>
                : a.status === 'ACTIVE' ? <Button variant="outline" className="border-danger-700 text-danger-700" onClick={() => setSuspendId(a.id)}>Tạm khoá</Button>
                : a.status === 'SUSPENDED' ? <Button variant="outline" onClick={() => unsuspend(a)}>Mở khoá</Button>
                : <span className="text-neutral-700">—</span>}
            </td>
          </tr>
        ))}
      </Table>
      {paged.node}
      {suspending && <SuspendModal account={suspending} onClose={() => setSuspendId(null)} />}
      {/* SCR-A3 (chi tiết Account) không có wireframe riêng nên dựng thành drawer trong trang này. */}
      <Drawer open={!!detail} onClose={() => setDetailId(null)} title={detail ? `Tài khoản @${detail.username}` : ''} width="md:w-[480px]">
        {detail && (
          <dl className="space-y-3 text-body-md">
            {([['Tên hiển thị', detail.displayName], ['Email', detail.email], ['Vai trò', detail.role], ['Trạng thái', detail.status], ['Ngày tạo', formatDate(detail.createdAt)], ['2FA', detail.twoFA ? 'Đang bật' : 'Chưa bật'], ['Passkey', `${detail.passkeys.length}`],
              ['Câu hỏi / Bài viết', `${db.posts.filter((p) => p.authorId === detail.id && p.status === 'ACTIVE').length}`], ['Bình luận', `${db.comments.filter((c) => c.authorId === detail.id && c.status === 'ACTIVE').length}`],
              ...(detail.status === 'SUSPENDED' ? [['Lý do tạm khoá', detail.suspendReason ?? ''], ['Thời hạn', detail.suspendedUntil ? `đến ${formatDate(detail.suspendedUntil)}` : 'Vô thời hạn']] : [])] as Array<[string, string]>).map(([k, val]) => (
              <div key={k}><dt className="text-neutral-500">{k}</dt><dd className="font-semibold break-words">{val}</dd></div>
            ))}
          </dl>
        )}
      </Drawer>
    </>
  )
}

// ---------- WF-ADM-07 ----------
export function AdminTagsPage() {
  const db = useDb()
  const [name, setName] = useState('')
  const [q, setQ] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { run, loading, error } = useAction()
  const del = useAction()
  const tags = db.tags.filter((t) => !t.deleted && t.name.toLowerCase().includes(q.toLowerCase()))
  const used = (id: string) => db.posts.filter((p) => p.status === 'ACTIVE' && p.tagIds.includes(id)).length
  const deleting = db.tags.find((t) => t.id === deleteId)
  const create = async () => {
    const ok = await run(() => call(() => { api.createTag(name); return true }), { silent: true })
    if (ok) {
      toast.success('Đã thêm thẻ mới')
      setName('')
    }
  }
  return (
    <>
      <PageTitle>Quản trị danh mục thẻ chuyên khoa y tế (Tags)</PageTitle>
      <Card>
        <h2 className="text-h4 font-semibold">Tạo mới thẻ chuyên khoa</h2>
        <form className="mt-4 flex flex-wrap items-start gap-3" onSubmit={(e) => { e.preventDefault(); void create() }}>
          <div className="w-96 max-w-full"><TextInput aria-label="Tên thẻ mới" placeholder="Ví dụ: Nội thận – Tiết niệu" value={name} onChange={(e) => setName(e.target.value)} max={LIMITS.tagName} error={error?.message} /></div>
          <Button type="submit" className="h-11" icon={<Plus className="size-4" />} loading={loading} disabled={!name.trim()}>Thêm thẻ mới</Button>
        </form>
      </Card>
      <div className="my-4 flex flex-wrap items-center justify-between gap-4">
        <div className="w-72"><TextInput aria-label="Tìm tên thẻ" placeholder="Tìm tên thẻ…" prefix={<Search className="size-4" />} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <p className="text-body-md text-neutral-700">Tổng số: {db.tags.filter((t) => !t.deleted).length} thẻ</p>
      </div>
      <Table head={['Tên thẻ (Tag)', 'Số bài gắn', 'Ngày tạo', 'Thao tác']} empty={tags.length === 0}>
        {tags.map((t) => (
          <tr key={t.id} className="hover:bg-neutral-50">
            <td className={TD}><TagChip tagId={t.id} asLink={false} /></td>
            <td className={cn(TD, 'tabular-nums')}>{used(t.id)}</td>
            <td className={cn(TD, 'tabular-nums')}>{formatDate(t.createdAt)}</td>
            <td className={TD}><Button variant="ghost" className="text-danger-700" icon={<Trash2 className="size-4" />} onClick={() => setDeleteId(t.id)}>Xoá Tag</Button></td>
          </tr>
        ))}
      </Table>
      <p className="mt-4 text-caption text-neutral-700">Lưu ý: hệ thống không hỗ trợ đổi tên Tag. Bài viết cũ vẫn giữ nguyên Tag đã xoá.</p>
      <Modal open={!!deleting} onClose={() => setDeleteId(null)} title={`Xác nhận xoá thẻ chuyên khoa: #${deleting?.name ?? ''}`} tone="danger" size="sm"
        footer={<><Button variant="outline" onClick={() => setDeleteId(null)}>Huỷ</Button><Button variant="danger" loading={del.loading} onClick={async () => { if (await del.run(() => call(() => { api.deleteTag(deleteId!); return true }))) { toast.success('Đã xoá thẻ'); setDeleteId(null) } }}>Xác nhận xoá</Button></>}>
        <p className="text-body-md font-semibold">Thông báo tác động:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-body-md text-neutral-700">
          <li>Tag sẽ không thể chọn khi tạo hoặc chỉnh sửa bài viết mới.</li>
          <li>Tag sẽ ẩn khỏi tìm kiếm và bộ lọc.</li>
          <li>{deleting ? used(deleting.id) : 0} bài viết cũ đã gắn Tag này vẫn giữ nguyên hiển thị bình thường.</li>
        </ul>
      </Modal>
    </>
  )
}

// ---------- WF-ADM-08 ----------
export function AuditLogPage() {
  const db = useDb()
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const actions = Array.from(new Set(db.auditLogs.map((l) => l.action))).sort()
  const rows = db.auditLogs.filter((l) => (!action || l.action === action) && (!from || l.createdAt.slice(0, 10) >= from) && (!to || l.createdAt.slice(0, 10) <= to))
  const paged = usePaged(rows)
  return (
    <>
      <PageTitle>Nhật ký kiểm toán hệ thống (Immutable Audit Log)</PageTitle>
      <InfoBox icon={<Info />}>Dữ liệu bất biến: không thể sửa hoặc xoá bản ghi.</InfoBox>
      <div className="my-4 flex flex-wrap items-end gap-4">
        <Select label="Hành động" value={action} onChange={(e) => setAction(e.target.value)}><option value="">Tất cả</option>{actions.map((a) => <option key={a}>{a}</option>)}</Select>
        <div className="w-44"><TextInput label="Từ ngày" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="w-44"><TextInput label="Đến ngày" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {rows.length === 0 ? <EmptyState icon={<Search />} title="Không có bản ghi phù hợp" description="Thử nới bộ lọc." /> : (
        <Table head={['Thời gian', 'Actor', 'Action', 'Target', '']}>
          {paged.slice.map((l) => (
            <Fragment key={l.id}>
            <tr className="hover:bg-neutral-50">
              <td className={cn(TD, 'tabular-nums')}>{formatDateTime(l.createdAt)}</td>
              <td className={TD}>@{accountById(db, l.actorId)?.username}</td>
              <td className={cn(TD, 'font-mono')}>{l.action}</td>
              <td className={cn(TD, 'font-mono')}>{l.target}</td>
              <td className={cn(TD, 'text-right')}><Button variant="ghost" size="sm" aria-expanded={openId === l.id} onClick={() => setOpenId(openId === l.id ? null : l.id)}>{openId === l.id ? 'Ẩn' : 'Xem'}</Button></td>
            </tr>
            <tr className="bg-neutral-50">
              <td colSpan={5} className="px-4 py-2 font-mono text-caption break-all text-neutral-700">
                Metadata: {openId === l.id ? <pre className="mt-1 text-body-md whitespace-pre-wrap">{JSON.stringify(l.metadata, null, 2)}</pre> : excerpt(JSON.stringify(l.metadata), 110)}
              </td>
            </tr>
            </Fragment>
          ))}
        </Table>
      )}
      {paged.node}
    </>
  )
}

// ---------- Bảo mật tài khoản Admin (WF-USR-05, SCR-S5 của Admin) ----------
/** BR-02: Admin bắt buộc dùng 2FA nên chỉ có mục 2FA ở chế độ bắt buộc, không có nút tắt; không có Passkey, đổi mật khẩu hay xoá tài khoản (BR-24). */
export function AdminSecurityPage() {
  return (
    <div>
      <PageTitle>Bảo mật tài khoản</PageTitle>
      <div className="max-w-3xl space-y-6">
        <Card id="2fa">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h4 font-semibold">Xác thực hai yếu tố (2FA TOTP)</h2>
            <Badge tone="success" icon={<ShieldCheck className="size-4" aria-hidden />}>Bắt buộc · Đang bật</Badge>
          </div>
          <p className="mt-3 text-body-md text-neutral-700">
            Tài khoản quản trị bắt buộc dùng 2FA (BR-02). 2FA được thiết lập khi khởi tạo hệ thống; mọi lần đăng nhập đều phải nhập mã 6 chữ số từ ứng dụng Authenticator sau bước mật khẩu, và không thể tắt.
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-body-md md:grid-cols-2">
            <div><dt className="text-neutral-500">Phương thức</dt><dd className="font-semibold">TOTP (RFC 6238)</dd></div>
            <div><dt className="text-neutral-500">Mã xác thực</dt><dd className="font-semibold">6 chữ số, đổi mỗi 30 giây</dd></div>
            <div><dt className="text-neutral-500">Trạng thái</dt><dd className="font-semibold">Đang bật, không thể tắt</dd></div>
            <div><dt className="text-neutral-500">Đăng nhập</dt><dd className="font-semibold">Mật khẩu kèm TOTP</dd></div>
          </dl>
        </Card>
        <InfoBox tone="info">
          Tài khoản quản trị không dùng Passkey và không có mã khôi phục dự phòng cho 2FA. Mọi thay đổi về thông tin đăng nhập của Admin do người vận hành hệ thống thực hiện khi triển khai.
        </InfoBox>
      </div>
    </div>
  )
}
