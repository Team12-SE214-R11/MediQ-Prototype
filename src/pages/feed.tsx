import { FileQuestion, Hash, PenLine, Plus, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArticleCard, AuthorLine, PostCard, QuestionCard, SectionTitle, TagChip } from '../components/domain'
import { Badge, Button, Card, Drawer, EmptyState, Pagination, Select, SkeletonList, Tabs, useFakeLoading } from '../components/ui'
import { BrowseLayout } from '../layouts'
import { LIMITS, cn, excerpt } from '../lib/utils'
import { accountById, isVerifiedDoctor, useCurrentUser, useDb } from '../mock/store'
import type { Database, Post } from '../types'

const activePosts = (db: Database, kind?: Post['kind']) =>
  db.posts.filter((p) => p.status === 'ACTIVE' && (!kind || p.kind === kind)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

function TagRail() {
  const db = useDb()
  return (
    <Card>
      <h2 className="text-h4 font-semibold">Chuyên khoa</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {db.tags.filter((t) => !t.deleted).map((t) => <li key={t.id}><TagChip tagId={t.id} /></li>)}
      </ul>
      <Link to="/tags" className="mt-4 inline-block text-body-md font-semibold text-primary-500 underline">Xem tất cả chủ đề</Link>
    </Card>
  )
}

/** Bộ lọc Tag: select trên desktop, Drawer đáy trên mobile (Mobile-Responsive-Specs mục IV.3). */
function TagFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tags = useDb().tags.filter((t) => !t.deleted)
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="hidden md:block">
        <Select label="Lọc theo thẻ" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Tất cả chuyên khoa</option>
          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </div>
      <Button variant="outline" className="h-11 md:hidden" icon={<SlidersHorizontal className="size-4" />} onClick={() => setOpen(true)}>
        Lọc{value && ' (1)'}
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Lọc theo chuyên khoa" side="bottom"
        footer={<div className="flex gap-3"><Button variant="outline" size="lg" className="flex-1" onClick={() => { onChange(''); setOpen(false) }}>Xoá lọc</Button><Button size="lg" className="flex-[2]" onClick={() => setOpen(false)}>Áp dụng</Button></div>}>
        <ul>
          {tags.map((t) => (
            <li key={t.id}>
              <label className="flex h-12 cursor-pointer items-center gap-3 text-body-lg">
                <input type="radio" name="tag-filter" checked={value === t.id} onChange={() => onChange(t.id)} className="size-5 accent-primary-700" />{t.name}
              </label>
            </li>
          ))}
        </ul>
      </Drawer>
    </>
  )
}

function PostList({ posts, empty, render }: { posts: Post[]; empty: ReactNode; render: (p: Post) => ReactNode }) {
  const [shown, setShown] = useState<number>(LIMITS.feedPage)
  if (posts.length === 0) return <>{empty}</>
  return (
    <>
      {posts.slice(0, shown).map(render)}
      {posts.length > shown && (
        <div className="col-span-full pt-2 text-center"><Button variant="outline" onClick={() => setShown((s) => s + LIMITS.feedPage)}>Tải thêm</Button></div>
      )}
    </>
  )
}

// ---------- WF-FEED-01 ----------
export function FeedPage() {
  const db = useDb()
  const navigate = useNavigate()
  const [tag, setTag] = useState('')
  const loading = useFakeLoading(tag)
  // Baseline: sắp xếp theo createdAt giảm dần. Các tab "Dành cho bạn" / "Có BS trả lời" là đề xuất chưa có hợp đồng API nên không dựng.
  const posts = activePosts(db, 'question').filter((p) => !tag || p.tagIds.includes(tag))
  return (
    <BrowseLayout rail={<TagRail />}>
      <SectionTitle action={<Button className="hidden md:inline-flex" icon={<Plus className="size-4" />} onClick={() => navigate('/questions/new')}>Đặt câu hỏi</Button>}>Câu hỏi</SectionTitle>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-body-md text-neutral-700">Mới nhất · {posts.length} câu hỏi</p>
        <TagFilter value={tag} onChange={setTag} />
      </div>
      <div className="space-y-3 md:space-y-4" key={tag}>
        {loading ? <SkeletonList /> : (
          <PostList posts={posts} render={(p) => <QuestionCard key={p.id} post={p} />}
            empty={<EmptyState icon={<FileQuestion />} title="Chưa có câu hỏi nào" description={tag ? 'Chưa có câu hỏi thuộc chuyên khoa này.' : 'Hãy là người đầu tiên đặt câu hỏi.'} action={<Button onClick={() => navigate('/questions/new')}>Đặt câu hỏi</Button>} />} />
        )}
      </div>
    </BrowseLayout>
  )
}

// ---------- WF-FEED-02 ----------
export function ArticlesFeedPage() {
  const db = useDb()
  const me = useCurrentUser()
  const navigate = useNavigate()
  const [tag, setTag] = useState('')
  const loading = useFakeLoading(tag)
  const posts = activePosts(db, 'article').filter((p) => !tag || p.tagIds.includes(tag))
  const doctor = me?.role === 'VERIFIED_DOCTOR'
  return (
    <BrowseLayout rail={<TagRail />}>
      <SectionTitle action={doctor && <Button variant="secondary" className="hidden md:inline-flex" icon={<PenLine className="size-4" />} onClick={() => navigate('/articles/new')}>Viết bài</Button>}>Bài viết chuyên môn</SectionTitle>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-body-md text-neutral-700">Do bác sĩ đã xác minh biên soạn</p>
        <TagFilter value={tag} onChange={setTag} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6" key={tag}>
        {loading ? <div className="col-span-full"><SkeletonList /></div> : (
          <PostList posts={posts} render={(p) => <ArticleCard key={p.id} post={p} />}
            empty={<div className="col-span-full"><EmptyState icon={<FileQuestion />} title="Chưa có bài viết nào" description="Chưa có bài viết thuộc chuyên khoa này." /></div>} />
        )}
      </div>
    </BrowseLayout>
  )
}

// ---------- WF-SEARCH-01 ----------
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark className="rounded-sm bg-primary-100 text-neutral-900">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
}

type SearchTab = 'all' | 'question' | 'article' | 'doctor' | 'user' | 'tag'
const SEARCH_PAGE = 5

export function SearchPage() {
  const db = useDb()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const [input, setInput] = useState(q)
  const [tab, setTab] = useState<SearchTab>('all')
  const [page, setPage] = useState(1)
  const loading = useFakeLoading(q + tab)
  const has = (s: string) => s.toLowerCase().includes(q.toLowerCase())

  type Result = { key: string; type: Exclude<SearchTab, 'all'>; node: ReactNode }
  const results: Result[] = !q ? [] : [
    ...activePosts(db).filter((p) => has(p.title) || has(p.body)).map<Result>((p) => ({
      key: p.id, type: p.kind,
      node: (
        <Card className="relative transition-shadow duration-150 hover:shadow-md">
          <Badge tone={p.kind === 'article' ? 'success' : 'info'}>{p.kind === 'article' ? 'Bài viết' : 'Câu hỏi'}</Badge>
          <h3 className="mt-2 text-h4"><Link to={`/${p.kind === 'article' ? 'articles' : 'questions'}/${p.id}`} className="after:absolute after:inset-0 hover:text-primary-600"><Highlight text={p.title} q={q} /></Link></h3>
          <p className="mt-1 line-clamp-2 text-body-md text-neutral-700"><Highlight text={excerpt(p.body, 200)} q={q} /></p>
          <div className="relative z-10 mt-3"><AuthorLine account={accountById(db, p.authorId)} date={p.createdAt} /></div>
        </Card>
      ),
    })),
    ...db.accounts.filter((a) => a.status === 'ACTIVE' && a.role !== 'ADMIN' && (has(a.displayName) || has(a.username))).map<Result>((a) => ({
      key: a.id, type: isVerifiedDoctor(a) ? 'doctor' : 'user',
      node: (
        <Card>
          <Badge>{isVerifiedDoctor(a) ? 'Bác sĩ' : 'Người dùng'}</Badge>
          <div className="mt-3"><AuthorLine account={a} date={a.createdAt} size={48} /></div>
          {a.bio && <p className="mt-2 line-clamp-2 text-body-md text-neutral-700">{a.bio}</p>}
        </Card>
      ),
    })),
    ...db.tags.filter((t) => !t.deleted && has(t.name)).map<Result>((t) => ({
      key: t.id, type: 'tag',
      node: <Card><Badge>Thẻ chuyên khoa</Badge><div className="mt-3"><TagChip tagId={t.id} /></div></Card>,
    })),
  ]
  const count = (t: SearchTab) => (t === 'all' ? results.length : results.filter((r) => r.type === t).length)
  const list = tab === 'all' ? results : results.filter((r) => r.type === tab)
  const pageCount = Math.ceil(list.length / SEARCH_PAGE)
  const current = Math.min(page, Math.max(1, pageCount))

  return (
    <BrowseLayout>
      <div className="max-w-[845px]">
        <form role="search" className="flex gap-3" onSubmit={(e) => { e.preventDefault(); setPage(1); navigate(`/search?q=${encodeURIComponent(input.trim())}`) }}>
          <input type="search" value={input} onChange={(e) => setInput(e.target.value)} autoFocus={!q} aria-label="Tìm thông tin sức khoẻ" placeholder="Tìm thông tin sức khoẻ…"
            className="h-12 min-w-0 flex-1 rounded-md border border-neutral-500 bg-white px-3 text-body-lg placeholder:text-neutral-500 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/15 focus:outline-none" />
          <Button type="submit" size="lg">Tìm</Button>
        </form>
        {!q ? (
          <div className="mt-6">
            <p className="text-body-md text-neutral-700">Gợi ý chuyên khoa:</p>
            <ul className="mt-3 flex flex-wrap gap-2">{db.tags.filter((t) => !t.deleted).map((t) => <li key={t.id}><TagChip tagId={t.id} /></li>)}</ul>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-h2 text-primary-900">Kết quả cho: “{q}”</h1>
            <Tabs className="mt-4" value={tab} onChange={(t) => { setTab(t); setPage(1) }}
              items={([['all', 'Tất cả'], ['question', 'Câu hỏi'], ['article', 'Bài viết'], ['doctor', 'Bác sĩ'], ['user', 'Người dùng'], ['tag', 'Thẻ chuyên khoa']] as Array<[SearchTab, string]>).map(([value, label]) => ({ value, label, count: count(value) }))} />
            <div className="mt-4 space-y-3 md:space-y-4">
              {loading ? <SkeletonList /> : list.length === 0 ? (
                <EmptyState icon={<SearchX />} title="Không tìm thấy kết quả" description="Thử từ khoá khác hoặc duyệt theo chuyên khoa." action={<Button variant="outline" onClick={() => navigate('/tags')}>Xem chủ đề</Button>} />
              ) : (
                <>
                  {list.slice((current - 1) * SEARCH_PAGE, current * SEARCH_PAGE).map((r) => <div key={r.key}>{r.node}</div>)}
                  <Pagination page={current} pageCount={pageCount} onChange={setPage} summary={`${list.length} kết quả`} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </BrowseLayout>
  )
}

// ---------- WF-TAGS-01 ----------
export function TagsPage() {
  const db = useDb()
  const [params, setParams] = useSearchParams()
  const selected = params.get('tag') ?? ''
  const tags = db.tags.filter((t) => !t.deleted)
  const tag = db.tags.find((t) => t.id === selected)
  const loading = useFakeLoading(selected)
  const posts = selected ? activePosts(db).filter((p) => p.tagIds.includes(selected)) : []
  // Số thảo luận lấy trực tiếp từ dữ liệu, không hiển thị mô tả biên tập vì chưa có nguồn đã duyệt.
  const countOf = (id: string) => activePosts(db).filter((p) => p.tagIds.includes(id)).length
  return (
    <BrowseLayout>
      <SectionTitle>Khám phá chuyên khoa</SectionTitle>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {tags.map((t) => (
          <li key={t.id}>
            <button type="button" aria-pressed={selected === t.id} onClick={() => setParams(selected === t.id ? {} : { tag: t.id })}
              className={cn('flex min-h-20 w-full flex-col items-start gap-1 rounded-lg border p-4 text-left transition-shadow duration-150 hover:shadow-md', selected === t.id ? 'border-primary-700 bg-primary-50' : 'border-neutral-200 bg-white')}>
              <span className="flex items-center gap-2 text-body-md font-semibold text-neutral-900"><Hash className="size-5 text-teal-600" aria-hidden />{t.name}</span>
              <span className="text-caption text-neutral-700">{countOf(t.id)} thảo luận</span>
            </button>
          </li>
        ))}
      </ul>
      {tag && (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-h3">Chủ đề đang chọn:</h2>
            <TagChip tagId={tag.id} asLink={false} />
            <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={() => setParams({})}>Bỏ chọn</Button>
          </div>
          <div className="space-y-3 md:space-y-4" key={selected}>
            {loading ? <SkeletonList /> : <PostList posts={posts} render={(p) => <PostCard key={p.id} post={p} />} empty={<EmptyState icon={<FileQuestion />} title="Chưa có nội dung" description="Chủ đề này chưa có câu hỏi hay bài viết nào." />} />}
          </div>
        </div>
      )}
    </BrowseLayout>
  )
}
