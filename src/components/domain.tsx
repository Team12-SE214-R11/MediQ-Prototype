import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  BookmarkCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  History,
  ImagePlus,
  Info,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  RotateCw,
  ShieldCheck,
  Stethoscope,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link, useNavigate } from 'react-router'
import { LIMITS, cn, excerpt, formatDateTime, maskLicense, readImageFile, timeAgo } from '../lib/utils'
import {
  accountById,
  activeComments,
  api,
  call,
  displayNameOf,
  doctorProfileOf,
  hasDoctorAnswer,
  isBookmarked,
  isVerifiedDoctor,
  myVote,
  scoreOf,
  useCurrentUser,
  useDb,
} from '../mock/store'
import type { Account, Comment, Post, ReportTargetType } from '../types'
import { Avatar, Badge, Button, IconButton, Modal, Textarea, type Tone, toast, useAction } from './ui'

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-mediq text-body-lg">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}

export function Disclaimer() {
  return (
    <aside className="flex gap-3 rounded-md border border-primary-200 bg-primary-50 p-3 text-body-md text-neutral-700 md:p-4" role="note">
      <Info className="mt-0.5 size-5 shrink-0 text-primary-500" aria-hidden />
      <p>
        Thông tin tư vấn trên MediQ chỉ mang tính chất tham khảo, không thay thế cho việc thăm khám, chẩn đoán và phác đồ điều trị trực tiếp tại
        các cơ sở y tế chuyên khoa. Trong tình huống cấp cứu khẩn cấp, vui lòng gọi 115 hoặc đến ngay bệnh viện gần nhất.
      </p>
    </aside>
  )
}

// ---------- Doctor badge ----------
const BADGE_SIZE = { sm: 'h-5 px-1.5 text-caption gap-1', md: 'h-6 px-2 text-body-md gap-1', lg: 'h-8 px-3 text-h4 gap-2' }
const BADGE_ICON = { sm: 'size-3', md: 'size-3.5', lg: 'size-[18px]' }

/** Chạm / bấm mở tóm tắt chứng chỉ (không phụ thuộc hover để dùng được trên mobile). */
export function DoctorBadge({ account, size = 'sm' }: { account?: Account; size?: 'sm' | 'md' | 'lg' }) {
  const db = useDb()
  const [open, setOpen] = useState(false)
  if (!isVerifiedDoctor(account)) return null
  const profile = doctorProfileOf(db, account!.id)
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        aria-haspopup="dialog"
        aria-label={`${account!.displayName}. Bác sĩ đã xác minh chuyên môn. Nhấn để xem thông tin hành nghề.`}
        className={cn('touch-target inline-flex shrink-0 items-center rounded-full border border-badge-cyan bg-badge-cyan-light font-medium whitespace-nowrap text-badge-cyan-dark transition-colors duration-150 hover:bg-primary-100', BADGE_SIZE[size])}
      >
        <ShieldCheck className={BADGE_ICON[size]} aria-hidden />
        <span>Bác sĩ xác minh</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Thông tin hành nghề đã xác minh" size="sm">
        <div className="rounded-md bg-badge-gold-light p-4 text-body-md text-badge-gold-dark">
          <p className="text-body-lg font-semibold">{account!.displayName}</p>
          {profile && (
            <dl className="mt-2 space-y-1">
              <div><dt className="inline font-medium">Chức danh: </dt><dd className="inline">{profile.title}</dd></div>
              <div><dt className="inline font-medium">Chuyên khoa: </dt><dd className="inline">{profile.specialty}</dd></div>
              <div><dt className="inline font-medium">Nơi công tác: </dt><dd className="inline">{profile.workplace}</dd></div>
              <div><dt className="inline font-medium">Số giấy phép: </dt><dd className="inline font-mono">{maskLicense(profile.license)}</dd></div>
            </dl>
          )}
          <p className="mt-3">Chứng chỉ hành nghề đã được Ban Quản trị MediQ thẩm định.</p>
        </div>
        <Link to={`/doctor/${account!.username}`} className="mt-4 inline-block text-body-md font-semibold text-primary-500 underline" onClick={() => setOpen(false)}>
          Xem hồ sơ bác sĩ
        </Link>
      </Modal>
    </>
  )
}

export function AuthorLine({ account, date, edited, size = 36 }: { account?: Account; date: string; edited?: boolean; size?: number }) {
  const deleted = !account || account.status === 'DELETED'
  const doctor = isVerifiedDoctor(account)
  const name = <span className="truncate text-body-md font-semibold text-neutral-900">{displayNameOf(account)}</span>
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={displayNameOf(account)} src={account?.avatar} size={size} ring={doctor} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {deleted ? name : <Link to={doctor ? `/doctor/${account.username}` : `/users/${account.username}`} className="min-w-0 truncate hover:underline">{name}</Link>}
          <DoctorBadge account={account} />
        </div>
        <p className="text-caption text-neutral-500">
          <time dateTime={date} title={formatDateTime(date)}>{timeAgo(date)}</time>
          {edited && ' · Đã chỉnh sửa'}
        </p>
      </div>
    </div>
  )
}

// ---------- Tags ----------
export function TagChip({ tagId, onRemove, asLink = true }: { tagId: string; onRemove?: () => void; asLink?: boolean }) {
  const tag = useDb().tags.find((t) => t.id === tagId)
  if (!tag) return null
  const body = (
    <span className="touch-target inline-flex h-8 items-center gap-1 rounded-full bg-teal-100 px-3 text-body-md font-semibold whitespace-nowrap text-teal-800">
      #{tag.name}
      {tag.deleted && <span className="font-normal">(đã xoá)</span>}
      {onRemove && (
        <button type="button" aria-label={`Bỏ thẻ ${tag.name}`} onClick={onRemove} className="touch-target -mr-1 inline-flex size-6 items-center justify-center rounded-full hover:bg-teal-50">
          <X className="size-4" />
        </button>
      )}
    </span>
  )
  return asLink && !onRemove ? <Link to={`/tags?tag=${tag.id}`}>{body}</Link> : body
}

export function TagPicker({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string | null }) {
  const tags = useDb().tags.filter((t) => !t.deleted && !value.includes(t.id))
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = tags.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <div>
      <p className="mb-2 text-body-md font-medium text-neutral-900">
        Chuyên khoa <span className="text-danger-600" aria-hidden>*</span>
      </p>
      {value.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-x-2 gap-y-3">
          {value.map((id) => (
            <TagChip key={id} tagId={id} onRemove={() => onChange(value.filter((v) => v !== id))} />
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Gõ để lọc thẻ chuyên khoa…"
          aria-label="Lọc thẻ chuyên khoa"
          className={cn('h-12 w-full rounded-md border bg-white px-3 text-body-lg placeholder:text-neutral-500 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/15 focus:outline-none md:h-11 md:text-body-md', error ? 'border-danger-600' : 'border-neutral-500')}
        />
        {open && (
          <ul className="absolute z-[500] mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-md" role="listbox">
            {filtered.length === 0 && <li className="px-3 py-3 text-body-md text-neutral-700">Không có thẻ phù hợp. Thẻ do Quản trị viên tạo.</li>}
            {filtered.map((t) => (
              <li key={t.id}>
                <button type="button" role="option" aria-selected={false} className="flex h-12 w-full items-center px-3 text-left text-body-md hover:bg-primary-50" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange([...value, t.id]); setQuery('') }}>
                  #{t.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className={cn('mt-1 text-caption', error ? 'text-danger-700' : 'text-neutral-500')} role={error ? 'alert' : undefined}>
        {error ?? `Đã chọn ${value.length} thẻ. Cần ít nhất 1 thẻ; chỉ chọn từ danh mục có sẵn.`}
      </p>
    </div>
  )
}

// ---------- Vote / Bookmark ----------
/** Chỉ dùng cho Article và Comment (BR-18). Admin và khách không tương tác được. */
export function VoteControl({ targetType, targetId }: { targetType: 'article' | 'comment'; targetId: string }) {
  const db = useDb()
  const me = useCurrentUser()
  const { score } = scoreOf(db, targetType, targetId)
  const mine = myVote(db, me, targetType, targetId)
  const disabled = !me || me.role === 'ADMIN'
  const vote = (value: 1 | -1) => {
    try {
      api.vote(targetType, targetId, value)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể bình chọn.')
    }
  }
  return (
    <div className="inline-flex items-center" role="group" aria-label="Bình chọn">
      <button type="button" disabled={disabled} aria-label="Bình chọn hữu ích (Upvote)" aria-pressed={mine === 1} onClick={() => vote(1)}
        className={cn('inline-flex size-11 items-center justify-center rounded-md transition-colors duration-150 disabled:text-neutral-400', mine === 1 ? 'bg-primary-100 text-primary-700' : 'text-neutral-700 hover:bg-neutral-100')}>
        <ArrowBigUp className="size-6" fill={mine === 1 ? 'currentColor' : 'none'} aria-hidden />
      </button>
      <span aria-live="polite" aria-atomic="true" className={cn('min-w-6 text-center text-body-md font-semibold tabular-nums', score > 0 ? 'text-success-700' : score < 0 ? 'text-danger-700' : 'text-neutral-700')}>
        {score > 0 ? `+${score}` : score}
        <span className="sr-only"> điểm hữu ích</span>
      </span>
      <button type="button" disabled={disabled} aria-label="Bình chọn không hữu ích (Downvote)" aria-pressed={mine === -1} onClick={() => vote(-1)}
        className={cn('inline-flex size-11 items-center justify-center rounded-md transition-colors duration-150 disabled:text-neutral-400', mine === -1 ? 'bg-danger-100 text-danger-700' : 'text-neutral-700 hover:bg-neutral-100')}>
        <ArrowBigDown className="size-6" fill={mine === -1 ? 'currentColor' : 'none'} aria-hidden />
      </button>
    </div>
  )
}

export function BookmarkButton({ postId, compact }: { postId: string; compact?: boolean }) {
  const db = useDb()
  const me = useCurrentUser()
  const saved = isBookmarked(db, me, postId)
  if (!me || me.role === 'ADMIN') return null
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      toast.success(api.toggleBookmark(postId) ? 'Đã lưu vào bộ sưu tập' : 'Đã bỏ lưu')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể lưu.')
    }
  }
  const Icon = saved ? BookmarkCheck : Bookmark
  return (
    <button type="button" onClick={toggle} aria-pressed={saved} aria-label={saved ? 'Bỏ lưu' : 'Lưu'}
      className={cn('inline-flex h-11 items-center gap-2 rounded-md px-2 text-body-md font-semibold transition-colors duration-150 hover:bg-neutral-100', saved ? 'text-badge-gold-dark' : 'text-neutral-700')}>
      <Icon className="size-5" aria-hidden />
      {!compact && (saved ? 'Đã lưu' : 'Lưu')}
    </button>
  )
}

// ---------- Cards ----------
/** QuestionCard không có cột vote: BR-18 chỉ cho vote Article và Comment. */
export function QuestionCard({ post, compact }: { post: Post; compact?: boolean }) {
  const db = useDb()
  const author = accountById(db, post.authorId)
  const count = activeComments(db, post.id).length
  const answered = hasDoctorAnswer(db, post.id)
  return (
    <article className={cn('group relative rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow duration-150 focus-within:border-primary-200 hover:border-primary-200 hover:shadow-md md:p-6', answered && 'border-l-4 border-l-teal-600')}>
      <div className="flex items-start justify-between gap-3">
        <AuthorLine account={author} date={post.createdAt} edited={!!post.editedAt} />
        <BookmarkButton postId={post.id} compact />
      </div>
      {answered && (
        <p className="mt-3">
          <Badge tone="success" icon={<Stethoscope className="size-3.5" aria-hidden />}>Bác sĩ đã trả lời</Badge>
        </p>
      )}
      <h3 className="mt-3 line-clamp-2 text-h4 text-neutral-900 group-hover:text-primary-600">
        <Link to={`/questions/${post.id}`} className="after:absolute after:inset-0">{post.title}</Link>
      </h3>
      {!compact && <p className="mt-2 line-clamp-2 text-body-md text-neutral-700">{excerpt(post.body)}</p>}
      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {post.tagIds.map((id) => <TagChip key={id} tagId={id} />)}
        </div>
        <p className="flex items-center gap-4 text-caption text-neutral-700">
          {post.images.length > 0 && <span className="inline-flex items-center gap-1"><Camera className="size-4" aria-hidden />{post.images.length} ảnh</span>}
          <span className="inline-flex items-center gap-1"><MessageSquare className="size-4" aria-hidden />{count} bình luận</span>
        </p>
      </div>
    </article>
  )
}

export function readingMinutes(body: string) {
  return Math.max(1, Math.round(body.split(/\s+/).length / 200))
}

export function ArticleCard({ post, row }: { post: Post; row?: boolean }) {
  const db = useDb()
  const author = accountById(db, post.authorId)
  const { score } = scoreOf(db, 'article', post.id)
  return (
    <article className={cn('group relative overflow-hidden rounded-lg border border-neutral-200 bg-teal-50 shadow-sm transition-shadow duration-150 hover:shadow-md', row && 'md:flex')}>
      {!row && (
        <div className="aspect-video w-full bg-teal-100">
          {post.images[0] ? <img src={post.images[0]} alt="" loading="lazy" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-teal-700"><Stethoscope className="size-12" aria-hidden /></div>}
        </div>
      )}
      <div className="flex-1 p-4 md:p-6">
        <div className="relative z-10 flex flex-wrap gap-2">
          {post.tagIds.slice(0, 2).map((id) => <TagChip key={id} tagId={id} />)}
        </div>
        <h3 className="mt-3 line-clamp-2 text-h4 font-semibold text-neutral-900 group-hover:text-primary-600">
          <Link to={`/articles/${post.id}`} className="after:absolute after:inset-0">{post.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-body-md text-neutral-700">{excerpt(post.body, 140)}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative z-10"><AuthorLine account={author} date={post.createdAt} edited={!!post.editedAt} /></div>
          <p className="flex items-center gap-3 text-caption text-neutral-700">
            <span className="inline-flex items-center gap-1"><Clock className="size-4" aria-hidden />{readingMinutes(post.body)} phút đọc</span>
            <span className="inline-flex items-center gap-1"><ArrowBigUp className="size-4" aria-hidden />{score}</span>
            <span className="inline-flex items-center gap-1"><MessageSquare className="size-4" aria-hidden />{activeComments(db, post.id).length}</span>
          </p>
        </div>
      </div>
    </article>
  )
}

export function PostCard({ post }: { post: Post }) {
  return post.kind === 'question' ? <QuestionCard post={post} /> : <ArticleCard post={post} row />
}

// ---------- Images ----------
export function Lightbox({ images, start, onClose }: { images: string[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start)
  const [zoom, setZoom] = useState(1)
  const [rotate, setRotate] = useState(0)
  const go = (d: number) => {
    setIndex((i) => (i + d + images.length) % images.length)
    setZoom(1)
    setRotate(0)
  }
  return (
    <Modal open onClose={onClose} title={`Ảnh ${index + 1}/${images.length}`} size="lg">
      <div className="flex flex-wrap items-center justify-center gap-1 pb-3">
        <IconButton label="Thu nhỏ" disabled={zoom <= 0.5} onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}><ZoomOut className="size-5" /></IconButton>
        <span className="w-14 text-center text-body-md font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
        <IconButton label="Phóng to" disabled={zoom >= 4} onClick={() => setZoom((z) => Math.min(4, z + 0.5))}><ZoomIn className="size-5" /></IconButton>
        <IconButton label="Xoay 90 độ" onClick={() => setRotate((r) => r + 90)}><RotateCw className="size-5" /></IconButton>
      </div>
      <div className="flex h-[55dvh] items-center justify-center overflow-auto rounded-md bg-primary-950">
        <img src={images[index]} alt={`Ảnh đính kèm số ${index + 1}`} className="max-h-full max-w-full transition-transform duration-150" style={{ transform: `scale(${zoom}) rotate(${rotate}deg)` }} />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex justify-between">
          <Button variant="outline" icon={<ChevronLeft className="size-4" />} onClick={() => go(-1)}>Ảnh trước</Button>
          <Button variant="outline" onClick={() => go(1)}>Ảnh sau<ChevronRight className="size-4" /></Button>
        </div>
      )}
    </Modal>
  )
}

export function ImageGrid({ images, label = 'Ảnh đính kèm' }: { images: string[]; label?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  if (images.length === 0) return null
  return (
    <>
      <ul className="flex gap-3 overflow-x-auto py-1">
        {images.map((src, i) => (
          <li key={i} className="shrink-0">
            <button type="button" onClick={() => setOpen(i)} aria-label={`Phóng to ${label.toLowerCase()} số ${i + 1}`} className="block overflow-hidden rounded-md border border-neutral-200">
              <img src={src} alt={`${label} số ${i + 1}`} loading="lazy" className="size-28 object-cover md:size-32" />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox images={images} start={open} onClose={() => setOpen(null)} />}
    </>
  )
}

export function ImageUploader({ images, onChange, max, label = 'Ảnh đính kèm' }: { images: string[]; onChange: (v: string[]) => void; max: number; label?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const full = images.length >= max
  const add = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    if (images.length + files.length > max) {
      setError(`Chỉ được đính kèm tối đa ${max} ảnh. Hãy bỏ bớt lựa chọn.`)
      return
    }
    setBusy(true)
    const next = [...images]
    for (const f of Array.from(files)) {
      try {
        next.push(await readImageFile(f))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải được ảnh.')
      }
    }
    onChange(next)
    setBusy(false)
    if (input.current) input.current.value = ''
  }
  return (
    <div>
      <p className="mb-2 text-body-md font-medium text-neutral-900">{label} <span className="font-normal text-neutral-700">({images.length}/{max})</span></p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!full) void add(e.dataTransfer.files) }}
        className={cn('rounded-md border-2 border-dashed p-4 text-center', drag ? 'border-primary-500 bg-primary-50' : 'border-primary-400', full && 'border-neutral-300 bg-neutral-100')}
      >
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => void add(e.target.files)} aria-label={`Tải lên ${label.toLowerCase()} (tối đa ${LIMITS.fileSizeMB} Megabytes mỗi ảnh)`} />
        <Button variant="outline" size="lg" icon={<ImagePlus className="size-5" />} loading={busy} disabled={full} onClick={() => input.current?.click()} className="w-full md:w-auto">
          Chọn ảnh từ thiết bị
        </Button>
        <p className="mt-2 text-caption text-neutral-700">Hoặc kéo thả ảnh vào đây. JPEG, PNG, WEBP, GIF tĩnh; tối đa {LIMITS.fileSizeMB}MB/ảnh. Còn lại: {max - images.length}/{max} ảnh.</p>
      </div>
      {error && <p role="alert" className="mt-2 text-caption text-danger-700">{error}</p>}
      {images.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {images.map((src, i) => (
            <li key={i} className="relative">
              <img src={src} alt={`${label} số ${i + 1}`} className="size-20 rounded-md border border-neutral-200 object-cover" />
              <button type="button" aria-label={`Gỡ ảnh số ${i + 1}`} onClick={() => onChange(images.filter((_, j) => j !== i))} className="touch-target absolute -top-2 -right-2 inline-flex size-7 items-center justify-center rounded-full bg-danger-600 text-white shadow-md">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- Status badges ----------
const STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ xử lý', tone: 'warning' },
  REVIEWING: { label: 'Đang xem xét', tone: 'info' },
  APPROVED: { label: 'Đã phê duyệt', tone: 'success' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
  REVOKED: { label: 'Đã thu hồi', tone: 'neutral' },
  RESOLVED: { label: 'Đã giải quyết', tone: 'success' },
  ACTIVE: { label: 'Đang hoạt động', tone: 'success' },
  SUSPENDED: { label: 'Tạm khoá', tone: 'danger' },
  UNVERIFIED: { label: 'Chưa xác minh email', tone: 'neutral' },
  DELETED: { label: 'Đã xoá', tone: 'neutral' },
  NEW: { label: 'Nộp lần đầu', tone: 'neutral' },
  RESUBMISSION: { label: 'Nộp lại', tone: 'neutral' },
  UPDATE: { label: 'Cập nhật', tone: 'neutral' },
  HIGH: { label: 'Cao', tone: 'danger' },
  MEDIUM: { label: 'Trung bình', tone: 'warning' },
}
export function StatusBadge({ status, override }: { status: string; override?: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'neutral' as Tone }
  return <Badge tone={s.tone}>{override ?? s.label}</Badge>
}

// ---------- Report ----------
const REPORT_CATEGORIES = ['Quảng cáo thuốc, sản phẩm không rõ nguồn gốc', 'Thông tin y tế sai lệch', 'Giả mạo hoặc lừa đảo', 'Ngôn từ thù địch, quấy rối', 'Khác']

export function ReportButton({ targetType, targetId, compact }: { targetType: ReportTargetType; targetId: string; compact?: boolean }) {
  const me = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(REPORT_CATEGORIES[0])
  const [reason, setReason] = useState('')
  const { run, loading, error } = useAction()
  if (!me || me.role === 'ADMIN') return null
  const submit = async () => {
    const ok = await run(() => call(() => { api.report(targetType, targetId, category, reason); return true }), { silent: true })
    if (ok) {
      toast.success('Đã gửi báo cáo. Ban Quản trị sẽ xem xét.')
      setOpen(false)
      setReason('')
    }
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-body-md font-semibold text-neutral-700 hover:bg-neutral-100" aria-label="Báo cáo vi phạm">
        <Flag className="size-5" aria-hidden />
        {!compact && 'Báo cáo'}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Báo cáo vi phạm" size="sm"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button><Button variant="danger" loading={loading} onClick={submit}>Gửi báo cáo</Button></>}>
        <fieldset className="space-y-1">
          <legend className="mb-2 text-body-md font-medium">Loại vi phạm <span className="text-danger-600">*</span></legend>
          {REPORT_CATEGORIES.map((c) => (
            <label key={c} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-body-md hover:bg-neutral-100">
              <input type="radio" name="report-category" checked={category === c} onChange={() => setCategory(c)} className="size-[18px] accent-primary-700" />
              {c}
            </label>
          ))}
        </fieldset>
        <div className="mt-4">
          <Textarea label="Mô tả" required value={reason} onChange={(e) => setReason(e.target.value)} max={LIMITS.reason} error={error?.message} placeholder="Mô tả ngắn gọn nội dung vi phạm…" />
        </div>
        <p className="mt-3 text-caption text-neutral-700">Danh tính người báo cáo không được tiết lộ cho bên bị báo cáo.</p>
      </Modal>
    </>
  )
}

// ---------- Revision history (REQ-SOC-013: chỉ xem snapshot, không diff, không khôi phục) ----------
export function RevisionButton({ targetType, targetId, label = 'Lịch sử' }: { targetType: 'post' | 'comment'; targetId: string; label?: string }) {
  const db = useDb()
  const [open, setOpen] = useState(false)
  const revisions = db.revisions.filter((r) => r.targetType === targetType && r.targetId === targetId).sort((a, b) => b.version - a.version)
  const [version, setVersion] = useState<number | null>(null)
  const current = revisions.find((r) => r.version === version) ?? revisions[0]
  if (revisions.length < 2) return null
  return (
    <>
      <button type="button" onClick={() => { setVersion(null); setOpen(true) }} className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-body-md font-semibold text-primary-500 hover:bg-neutral-100">
        <History className="size-5" aria-hidden />
        {label} ({revisions.length})
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Lịch sử chỉnh sửa" size="lg">
        <div className="flex flex-wrap items-center gap-2">
          {revisions.map((r) => (
            <button key={r.id} type="button" onClick={() => setVersion(r.version)} aria-pressed={r.version === current.version}
              className={cn('h-11 rounded-md border px-4 text-body-md font-semibold', r.version === current.version ? 'border-primary-700 bg-primary-50 text-primary-700' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100')}>
              Phiên bản {r.version}{r.version === revisions[0].version && ' (hiện tại)'}
            </button>
          ))}
        </div>
        <p className="mt-4 text-body-md text-neutral-700">
          Lưu lúc <time className="font-semibold">{formatDateTime(current.createdAt)}</time> bởi <span className="font-semibold">{displayNameOf(accountById(db, current.editorId))}</span>
        </p>
        <div className="mt-4 rounded-md border border-neutral-200 p-4">
          {current.title && <h3 className="mb-3 text-h3">{current.title}</h3>}
          <Markdown>{current.body}</Markdown>
          {current.tagIds.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{current.tagIds.map((id) => <TagChip key={id} tagId={id} asLink={false} />)}</div>}
          {current.images.length > 0 && <div className="mt-4"><ImageGrid images={current.images} label="Ảnh của phiên bản" /></div>}
        </div>
        <p className="mt-3 text-caption text-neutral-700">Mỗi lần lưu chỉnh sửa tạo một phiên bản mới; các phiên bản cũ được giữ nguyên để tham chiếu.</p>
      </Modal>
    </>
  )
}

// ---------- Admin: xoá nội dung ngay trên trang chi tiết (BR-03) ----------
export function AdminRemoveButton({ targetType, targetId, onDone }: { targetType: 'question' | 'article' | 'comment'; targetId: string; onDone?: () => void }) {
  const me = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { run, loading, error } = useAction()
  if (me?.role !== 'ADMIN') return null
  const submit = async () => {
    const ok = await run(() => call(() => { api.removeContent(targetType, targetId, reason); return true }), { silent: true })
    if (ok) {
      toast.success('Đã gỡ nội dung và ghi Audit Log')
      setOpen(false)
      onDone?.()
    }
  }
  return (
    <>
      <Button variant="danger" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setOpen(true)}>Xoá nội dung</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Xác nhận gỡ nội dung vi phạm" tone="danger"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button><Button variant="danger" loading={loading} onClick={submit}>Xác nhận gỡ vĩnh viễn</Button></>}>
        <p className="text-body-md text-neutral-700">Nội dung và toàn bộ bình luận con sẽ chuyển sang DELETED, không thể khôi phục.</p>
        <div className="mt-4"><Textarea label="Lý do kiểm duyệt (ghi vào Audit Log)" required value={reason} onChange={(e) => setReason(e.target.value)} max={LIMITS.reason} error={error?.message} /></div>
      </Modal>
    </>
  )
}

// ---------- Comment tree ----------
function CommentComposer({ postId, parentId, onDone, autoFocus }: { postId: string; parentId: string | null; onDone?: () => void; autoFocus?: boolean }) {
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [showImages, setShowImages] = useState(false)
  const { run, loading, error } = useAction()
  const submit = async () => {
    const id = await run(() => call(() => api.createComment(postId, parentId, body, images)), { silent: true })
    if (id) {
      setBody('')
      setImages([])
      setShowImages(false)
      toast.success(parentId ? 'Đã gửi trả lời' : 'Đã gửi bình luận')
      onDone?.()
    }
  }
  return (
    <div className="space-y-3">
      <Textarea aria-label={parentId ? 'Viết trả lời' : 'Viết bình luận'} placeholder={parentId ? 'Viết trả lời…' : 'Viết bình luận…'} value={body} onChange={(e) => setBody(e.target.value)} max={LIMITS.commentBody} error={error?.message} autoFocus={autoFocus} />
      {showImages && <ImageUploader images={images} onChange={setImages} max={LIMITS.commentImages} label="Ảnh bình luận" />}
      <div className="flex flex-wrap justify-end gap-3">
        {!showImages && <Button variant="ghost" icon={<ImagePlus className="size-4" />} onClick={() => setShowImages(true)}>Ảnh (0/{LIMITS.commentImages})</Button>}
        {onDone && <Button variant="outline" onClick={onDone}>Huỷ</Button>}
        <Button variant={parentId ? 'primary' : 'secondary'} loading={loading} disabled={!body.trim()} onClick={submit}>Gửi</Button>
      </div>
    </div>
  )
}

const REPLY_PAGE = 2

function CommentItem({ comment, all, level }: { comment: Comment; all: Comment[]; level: number }) {
  const db = useDb()
  const me = useCurrentUser()
  const author = accountById(db, comment.authorId)
  const doctor = isVerifiedDoctor(author)
  const parentAuthor = comment.parentId ? accountById(db, all.find((c) => c.id === comment.parentId)?.authorId ?? '') : undefined
  const replies = all.filter((c) => c.parentId === comment.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const [shown, setShown] = useState(REPLY_PAGE)
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [menu, setMenu] = useState(false)
  const { run, loading } = useAction()
  const mine = me?.id === comment.authorId
  const canInteract = !!me && me.role !== 'ADMIN'

  const save = async () => {
    const ok = await run(() => call(() => { api.updateComment(comment.id, draft); return true }))
    if (ok) {
      setEditing(false)
      toast.success('Đã lưu chỉnh sửa')
    }
  }
  const remove = async () => {
    if (!window.confirm('Xoá bình luận này và mọi trả lời bên dưới?')) return
    const ok = await run(() => call(() => { api.deleteComment(comment.id); return true }))
    if (ok) toast.success('Đã xoá bình luận')
  }

  return (
    // Thụt lề tối đa 3 cấp; cấp sâu hơn giữ lề và hiện @mention.
    <li className={cn(level > 0 && level <= 3 && 'ml-4 border-l-2 pl-3 md:ml-6 md:pl-4', level > 0 && level <= 3 && (doctor ? 'border-teal-500' : 'border-neutral-300'))}>
      <div className={cn('rounded-lg border p-3 md:p-4', doctor ? 'border-teal-500 border-l-4 border-l-teal-600 bg-teal-50' : 'border-neutral-200 bg-white')}>
        {doctor && level === 0 && (
          <p className="mb-3 flex items-center gap-2 text-caption font-semibold text-teal-800">
            <Pin className="size-4" aria-hidden />Phản hồi chuyên môn từ Bác sĩ
          </p>
        )}
        <div className="flex items-start justify-between gap-2">
          <AuthorLine account={author} date={comment.createdAt} edited={!!comment.editedAt} size={40} />
          {(mine || canInteract) && (
            <div className="relative">
              <IconButton label="Tuỳ chọn bình luận" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><MoreHorizontal className="size-5" /></IconButton>
              {menu && (
                <ul className="absolute right-0 z-[500] w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-md" onClick={() => setMenu(false)}>
                  {mine && <li><button type="button" className="flex h-11 w-full items-center gap-2 px-3 text-body-md hover:bg-neutral-100" onClick={() => { setDraft(comment.body); setEditing(true) }}><Pencil className="size-4" />Chỉnh sửa</button></li>}
                  {mine && <li><button type="button" className="flex h-11 w-full items-center gap-2 px-3 text-body-md text-danger-700 hover:bg-neutral-100" onClick={remove}><Trash2 className="size-4" />Xoá</button></li>}
                  {!mine && <li className="px-1"><ReportButton targetType="comment" targetId={comment.id} /></li>}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="mt-3">
          {editing ? (
            <div className="space-y-3">
              <Textarea aria-label="Chỉnh sửa bình luận" value={draft} onChange={(e) => setDraft(e.target.value)} max={LIMITS.commentBody} />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditing(false)}>Huỷ</Button>
                <Button loading={loading} onClick={save}>Lưu thay đổi</Button>
              </div>
            </div>
          ) : (
            <>
              {level > 3 && parentAuthor && <p className="mb-1 text-body-md font-semibold text-primary-500">@{displayNameOf(parentAuthor)}</p>}
              <Markdown>{comment.body}</Markdown>
              {comment.images.length > 0 && <div className="mt-3"><ImageGrid images={comment.images} label="Ảnh bình luận" /></div>}
            </>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2">
          <VoteControl targetType="comment" targetId={comment.id} />
          {canInteract && <button type="button" onClick={() => setReplying((r) => !r)} className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-body-md font-semibold text-neutral-700 hover:bg-neutral-100"><MessageSquare className="size-5" aria-hidden />Trả lời</button>}
          <RevisionButton targetType="comment" targetId={comment.id} />
          <AdminRemoveButton targetType="comment" targetId={comment.id} />
        </div>
        {replying && <div className="mt-3"><CommentComposer postId={comment.postId} parentId={comment.id} onDone={() => setReplying(false)} autoFocus /></div>}
      </div>
      {replies.length > 0 && (
        <ul className="mt-3 space-y-3">
          {replies.slice(0, shown).map((r) => <CommentItem key={r.id} comment={r} all={all} level={level + 1} />)}
          {replies.length > shown && (
            <li className="ml-4 md:ml-6">
              <button type="button" onClick={() => setShown((s) => s + REPLY_PAGE)} className="h-11 rounded-md px-3 text-body-md font-semibold text-primary-500 hover:bg-neutral-100">
                Xem thêm {replies.length - shown} trả lời
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  )
}

export function CommentSection({ post }: { post: Post }) {
  const db = useDb()
  const me = useCurrentUser()
  const all = activeComments(db, post.id)
  // Giữ thứ tự thời gian; không ghim câu trả lời bác sĩ lên đầu vì chưa có hợp đồng API (WF-SOC README mục III).
  const roots = all.filter((c) => !c.parentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return (
    <section aria-labelledby="discussion-title" className="mt-8">
      <h2 id="discussion-title" className="text-h3 text-neutral-900">Thảo luận ({all.length})</h2>
      {roots.length === 0 ? (
        <p className="mt-4 rounded-lg border border-neutral-200 bg-white p-6 text-center text-body-md text-neutral-700">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ.</p>
      ) : (
        <ul className="mt-4 space-y-4">{roots.map((c) => <CommentItem key={c.id} comment={c} all={all} level={0} />)}</ul>
      )}
      {me && me.role !== 'ADMIN' && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 md:p-6">
          <CommentComposer postId={post.id} parentId={null} />
        </div>
      )}
    </section>
  )
}

/** Thanh hành động của chính chủ nội dung: sửa / xoá. */
export function OwnerActions({ post }: { post: Post }) {
  const me = useCurrentUser()
  const navigate = useNavigate()
  const { run, loading } = useAction()
  if (me?.id !== post.authorId) return null
  const base = post.kind === 'question' ? '/questions' : '/articles'
  const remove = async () => {
    if (!window.confirm('Xoá nội dung này? Mọi bình luận và ảnh liên quan cũng sẽ bị xoá và không thể khôi phục.')) return
    const ok = await run(() => call(() => { api.deletePost(post.id); return true }))
    if (ok) {
      toast.success('Đã xoá nội dung')
      navigate(post.kind === 'question' ? '/' : '/articles')
    }
  }
  return (
    <>
      <Link to={`${base}/${post.id}/edit`} className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-body-md font-semibold text-neutral-700 hover:bg-neutral-100"><Pencil className="size-5" aria-hidden />Sửa</Link>
      <Button variant="ghost" className="h-11 px-2 text-danger-700" loading={loading} icon={<Trash2 className="size-5" />} onClick={remove}>Xoá</Button>
    </>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-h2 text-primary-900 md:text-h1">{children}</h1>
      {action}
    </div>
  )
}
