import { ArrowLeft, Bold, Heading2, Info, Italic, List, Lock, MessageSquare } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import {
  AdminRemoveButton,
  AuthorLine,
  BookmarkButton,
  CommentSection,
  Disclaimer,
  ImageGrid,
  ImageUploader,
  Markdown,
  OwnerActions,
  PostCard,
  ReportButton,
  RevisionButton,
  TagChip,
  TagPicker,
  VoteControl,
  readingMinutes,
} from '../components/domain'
import { Badge, Button, Card, ErrorBanner, IconButton, InfoBox, Modal, SkeletonCard, TextInput, Textarea, toast, useAction, useFakeLoading } from '../components/ui'
import { NotFoundPage } from '../layouts'
import { LIMITS, formatDateTime } from '../lib/utils'
import { accountById, activeComments, api, call, useCurrentUser, useDb } from '../mock/store'
import type { PostKind } from '../types'

const LABEL = {
  question: { list: '/', listLabel: 'Về Câu hỏi', create: 'Đặt câu hỏi y tế', edit: 'Chỉnh sửa câu hỏi', submit: 'Đăng câu hỏi', bodyLabel: 'Mô tả', path: 'questions' },
  article: { list: '/articles', listLabel: 'Về Bài viết', create: 'Soạn bài viết chuyên môn', edit: 'Chỉnh sửa bài viết chuyên môn', submit: 'Xuất bản bài viết', bodyLabel: 'Nội dung', path: 'articles' },
} as const

const draftKey = (kind: PostKind) => `mediq-draft-${kind}`

// ---------- WF-SOC-01 / 03 / 04 / 06 ----------
export function PostFormPage({ kind, mode }: { kind: PostKind; mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const db = useDb()
  const me = useCurrentUser()!
  const navigate = useNavigate()
  const L = LABEL[kind]
  const existing = mode === 'edit' ? db.posts.find((p) => p.id === id && p.status === 'ACTIVE') : undefined
  const saved = mode === 'create' ? localStorage.getItem(draftKey(kind)) : null
  const initial = existing ?? (saved ? JSON.parse(saved) as { title: string; body: string; tagIds: string[] } : null)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? [])
  const [images, setImages] = useState<string[]>(existing?.images ?? [])
  const [touched, setTouched] = useState(false)
  const [preview, setPreview] = useState(false)
  const [keepDraft, setKeepDraft] = useState(!!saved)
  const [draftAt, setDraftAt] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const { run, loading, error } = useAction()
  const maxBody = kind === 'question' ? LIMITS.questionBody : LIMITS.articleBody
  const maxImages = kind === 'question' ? LIMITS.questionImages : LIMITS.articleImages
  const dirty = title !== (existing?.title ?? '') || body !== (existing?.body ?? '') || images.length !== (existing?.images.length ?? 0)

  // Nháp chỉ lưu trên thiết bị khi người dùng chọn; không đồng bộ lên máy chủ (WF-SOC README mục III).
  useEffect(() => {
    if (mode !== 'create') return
    if (!keepDraft) {
      localStorage.removeItem(draftKey(kind))
      setDraftAt(null)
      return
    }
    const t = setTimeout(() => {
      localStorage.setItem(draftKey(kind), JSON.stringify({ title, body, tagIds }))
      setDraftAt(new Date().toISOString())
    }, 600)
    return () => clearTimeout(t)
  }, [keepDraft, title, body, tagIds, kind, mode])

  if (mode === 'edit' && !existing) return <NotFoundPage />
  if (existing && existing.authorId !== me.id) return <Navigate to="/403" replace />

  const errs = {
    title: !title.trim() ? 'Tiêu đề không được để trống.' : title.length > LIMITS.title ? `Tiêu đề tối đa ${LIMITS.title} ký tự.` : null,
    body: !body.trim() ? 'Nội dung không được để trống.' : body.length > maxBody ? 'Nội dung vượt quá giới hạn.' : null,
    tags: tagIds.length === 0 ? 'Cần chọn ít nhất một thẻ chuyên khoa.' : null,
  }
  const wrap = (before: string, after = before) => {
    const el = bodyRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    setBody(body.slice(0, s) + before + (body.slice(s, e) || 'văn bản') + after + body.slice(e))
    el.focus()
  }
  const cancel = () => {
    if (dirty && !window.confirm('Bỏ bản soạn? Nội dung chưa lưu sẽ mất.')) return
    navigate(existing ? `/${L.path}/${existing.id}` : L.list)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (Object.values(errs).some(Boolean)) {
      toast.error('Vui lòng kiểm tra các trường được đánh dấu.')
      return
    }
    const input = { title, body, tagIds, images }
    const result = await run(() => call(() => (existing ? (api.updatePost(existing.id, input), existing.id) : api.createPost(kind, input)), 600), { silent: true })
    if (result) {
      localStorage.removeItem(draftKey(kind))
      toast.success(existing ? 'Đã lưu thay đổi và tạo phiên bản mới' : kind === 'question' ? 'Đã đăng câu hỏi' : 'Đã xuất bản bài viết')
      navigate(`/${L.path}/${result}`)
    }
  }

  const form = (
    <Card className="space-y-6">
      {error && <ErrorBanner message={error.message} />}
      <TextInput label="Tiêu đề" required value={title} onChange={(e) => setTitle(e.target.value)} max={LIMITS.title} error={touched ? errs.title : null} placeholder={kind === 'question' ? 'Ví dụ: Bé 3 tuổi sốt 2 ngày rồi nổi ban, có nguy hiểm không?' : 'Tiêu đề bài viết'} />
      <div>
        {kind === 'article' && (
          <div className="sticky top-14 z-10 mb-2 flex gap-1 rounded-md bg-neutral-100 p-1 md:top-16" role="toolbar" aria-label="Định dạng">
            <IconButton label="Đậm" className="size-10" onClick={() => wrap('**')}><Bold className="size-5" /></IconButton>
            <IconButton label="Nghiêng" className="size-10" onClick={() => wrap('_')}><Italic className="size-5" /></IconButton>
            <IconButton label="Tiêu đề mục" className="size-10" onClick={() => wrap('\n## ', '\n')}><Heading2 className="size-5" /></IconButton>
            <IconButton label="Danh sách" className="size-10" onClick={() => wrap('\n- ', '\n')}><List className="size-5" /></IconButton>
          </div>
        )}
        <Textarea ref={bodyRef} label={L.bodyLabel} required value={body} onChange={(e) => setBody(e.target.value)} max={maxBody} error={touched ? errs.body : null}
          className={kind === 'article' ? 'min-h-[480px]' : 'min-h-40 md:min-h-60'} hint="Hỗ trợ Markdown. Không chia sẻ họ tên đầy đủ, số điện thoại hay địa chỉ trong nội dung."
          placeholder={kind === 'question' ? 'Mô tả triệu chứng, thời gian xuất hiện, thuốc đã dùng…' : 'Nội dung bài viết…'} />
      </div>
      <TagPicker value={tagIds} onChange={setTagIds} error={touched ? errs.tags : null} />
      <ImageUploader images={images} onChange={setImages} max={maxImages} label={kind === 'question' ? 'Ảnh xét nghiệm, đơn thuốc' : 'Ảnh minh hoạ'} />
      {mode === 'create' && kind === 'article' && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body-md">
          <input type="checkbox" checked={keepDraft} onChange={(e) => setKeepDraft(e.target.checked)} className="size-[18px] accent-primary-700" />
          <span>Lưu nháp trên thiết bị này <span className="block text-caption text-neutral-700">{draftAt ? `Đã lưu nháp lúc ${formatDateTime(draftAt)}. Nháp không đồng bộ sang thiết bị khác.` : 'Nháp chỉ nằm trong trình duyệt này, không gửi lên máy chủ.'}</span></span>
        </label>
      )}
      {mode === 'edit' && <InfoBox icon={<Info />}>Lần lưu này sẽ tạo một phiên bản mới trong lịch sử chỉnh sửa. Các phiên bản cũ được giữ nguyên.</InfoBox>}
      <Disclaimer />
    </Card>
  )

  return (
    <form onSubmit={submit} noValidate className={kind === 'article' ? 'mx-auto max-w-[1063px]' : undefined}>
      <button type="button" onClick={cancel} className="mb-4 hidden h-11 items-center gap-2 text-body-md font-semibold text-primary-500 md:inline-flex"><ArrowLeft className="size-4" />{existing ? 'Về nội dung' : L.listLabel}</button>
      <h1 className="mb-6 text-h2 text-primary-900">{mode === 'create' ? L.create : L.edit}</h1>
      {kind === 'question' && mode === 'create' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">{form}</div>
          <aside className="space-y-4 lg:col-span-3 lg:col-start-10">
            <Card><h2 className="text-h4 font-semibold">Hướng dẫn</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-body-md text-neutral-700"><li>Nêu rõ tuổi, triệu chứng, thời gian xuất hiện.</li><li>Đính kèm ảnh xét nghiệm hoặc đơn thuốc nếu có.</li><li>Chọn đúng chuyên khoa để bác sĩ phù hợp nhìn thấy.</li></ul></Card>
            <InfoBox icon={<Lock />}><p className="font-semibold text-neutral-900">Bảo vệ dữ liệu cá nhân</p><p className="mt-1">Che tên, mã bệnh nhân, số điện thoại trên ảnh trước khi tải lên. Câu hỏi hiển thị với mọi thành viên đã đăng nhập.</p></InfoBox>
          </aside>
        </div>
      ) : <div className={kind === 'question' ? 'mx-auto max-w-[845px]' : undefined}>{form}</div>}

      {/* Desktop: hàng nút canh phải. Mobile: thanh hành động dính đáy, chia 1 : 2. */}
      <div className="fixed inset-x-0 bottom-0 z-[100] flex gap-3 border-t border-neutral-200 bg-white p-3 md:static md:mt-6 md:justify-end md:border-0 md:bg-transparent md:p-0">
        <Button variant="outline" className="hidden md:inline-flex" onClick={cancel}>Huỷ</Button>
        <Button variant="outline" size="lg" className="flex-1 md:h-10 md:flex-none md:px-4 md:text-body-md" onClick={() => setPreview(true)}>Xem trước</Button>
        <Button type="submit" size="lg" loading={loading} className="flex-[2] md:h-10 md:flex-none md:px-4 md:text-body-md">{existing ? 'Lưu thay đổi' : L.submit}</Button>
      </div>
      <div className="h-20 md:hidden" />

      <Modal open={preview} onClose={() => setPreview(false)} title="Xem trước" size="lg">
        <p className="mb-4 text-caption text-neutral-700">Bản xem trước chỉ hiển thị trên thiết bị này, chưa tạo nội dung.</p>
        <h2 className="text-h2">{title || '(Chưa có tiêu đề)'}</h2>
        <div className="mt-3 flex flex-wrap gap-2">{tagIds.map((t) => <TagChip key={t} tagId={t} asLink={false} />)}</div>
        <div className="mt-4"><Markdown>{body || '_(Chưa có nội dung)_'}</Markdown></div>
        <div className="mt-4"><ImageGrid images={images} /></div>
      </Modal>
    </form>
  )
}

// ---------- WF-SOC-02 / 05 ----------
export function PostDetailPage({ kind }: { kind: PostKind }) {
  const { id } = useParams()
  const db = useDb()
  const me = useCurrentUser()
  const navigate = useNavigate()
  const loading = useFakeLoading(id ?? '')
  const post = db.posts.find((p) => p.id === id && p.kind === kind)
  const L = LABEL[kind]
  if (loading) return <div className="mx-auto max-w-[845px]"><SkeletonCard /></div>
  if (!post || post.status !== 'ACTIVE') return <NotFoundPage />
  const author = accountById(db, post.authorId)
  const admin = me?.role === 'ADMIN'
  const related = db.posts.filter((p) => p.status === 'ACTIVE' && p.id !== post.id && p.tagIds.some((t) => post.tagIds.includes(t))).slice(0, 3)
  const commentCount = activeComments(db, post.id).length

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-8">
        {!admin && <Link to={L.list} className="mb-4 hidden h-11 items-center gap-2 text-body-md font-semibold text-primary-500 md:inline-flex"><ArrowLeft className="size-4" />{L.listLabel}</Link>}
        <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
          {kind === 'article' && <p className="mb-2"><Badge tone="success">Bài viết chuyên môn</Badge></p>}
          <h1 className="text-h3 text-neutral-950 md:text-h2">{post.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">{post.tagIds.map((t) => <TagChip key={t} tagId={t} />)}</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <AuthorLine account={author} date={post.createdAt} edited={!!post.editedAt} size={40} />
            {kind === 'article' && <span className="text-caption text-neutral-700">{readingMinutes(post.body)} phút đọc</span>}
          </div>
          {kind === 'article' && post.images[0] && <img src={post.images[0]} alt="Ảnh bìa bài viết" className="-mx-4 mt-4 aspect-video w-[calc(100%+2rem)] max-w-none object-cover md:mx-0 md:w-full md:rounded-lg" />}
          <div className="mt-4 max-w-[720px]"><Markdown>{post.body}</Markdown></div>
          {post.images.length > (kind === 'article' ? 1 : 0) && <div className="mt-4"><ImageGrid images={kind === 'article' ? post.images.slice(1) : post.images} label={kind === 'question' ? 'Ảnh do người hỏi cung cấp' : 'Ảnh minh hoạ'} /></div>}
          {/* Câu hỏi không có vote, chỉ Lưu và Báo cáo (BR-18). */}
          <div className="mt-4 flex flex-wrap items-center gap-x-2 border-t border-neutral-200 pt-2">
            {kind === 'article' && <VoteControl targetType="article" targetId={post.id} />}
            <BookmarkButton postId={post.id} />
            <RevisionButton targetType="post" targetId={post.id} label="Lịch sử chỉnh sửa" diff={kind === 'article'} />
            <OwnerActions post={post} />
            {me?.id !== post.authorId && <ReportButton targetType={kind} targetId={post.id} />}
            <AdminRemoveButton targetType={kind} targetId={post.id} onDone={() => navigate('/admin/reports')} />
          </div>
        </article>
        <div className="mt-4"><Disclaimer /></div>
        <CommentSection post={post} />
      </div>

      <aside className="space-y-4 lg:col-span-3 lg:col-start-10">
        <Card>
          <h2 className="text-h4 font-semibold">Chủ đề liên quan</h2>
          <div className="mt-3 flex flex-wrap gap-2">{post.tagIds.map((t) => <TagChip key={t} tagId={t} />)}</div>
        </Card>
        {related.length > 0 && !admin && (
          <section aria-label="Nội dung liên quan" className="space-y-3">
            <h2 className="text-h4 font-semibold">Nội dung liên quan</h2>
            {related.map((p) => <PostCard key={p.id} post={p} />)}
          </section>
        )}
      </aside>

      {/* Mobile: thanh tương tác dính đáy cho bài viết */}
      {kind === 'article' && !admin && (
        <div className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-between border-t border-neutral-200 bg-white px-2 py-1 md:hidden">
          <VoteControl targetType="article" targetId={post.id} />
          <a href="#discussion-title" className="inline-flex h-11 items-center gap-2 px-2 text-body-md font-semibold text-neutral-700"><MessageSquare className="size-5" aria-hidden />{commentCount}</a>
          <BookmarkButton postId={post.id} />
        </div>
      )}
    </div>
  )
}
