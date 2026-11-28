import { BellOff, CheckCheck, Flag, MessageSquare, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, EmptyState, SkeletonList, Tabs, toast, useFakeLoading } from '../components/ui'
import { cn, timeAgo } from '../lib/utils'
import { api, unreadCount, useCurrentUser, useDb } from '../mock/store'
import type { Notification, NotificationType } from '../types'

const ICON: Record<NotificationType, LucideIcon> = { COMMENT_ON_QUESTION: MessageSquare, COMMENT_ON_ARTICLE: MessageSquare, COMMENT_REPLY: MessageSquare, VERIFICATION_APPROVED: ShieldCheck, VERIFICATION_REJECTED: ShieldCheck, VERIFICATION_REVOKED: ShieldCheck, REPORT_CREATED: Flag, REPORT_RESOLVED: Flag, REPORT_REJECTED: Flag, REPORT_REOPENED: Flag, REPORT_AGAINST_YOU_RESOLVED: Flag }

/** UC-NTF-004: bấm vào thì đánh dấu đã đọc trước, rồi mới điều hướng; đích đã xoá thì báo và không điều hướng. */
export function NotificationItem({ n, onNavigate }: { n: Notification; onNavigate?: () => void }) {
  const db = useDb()
  const navigate = useNavigate()
  const Icon = ICON[n.type]
  const open = () => {
    api.markRead(n.id)
    const match = n.link.match(/^\/(questions|articles)\/(.+)$/)
    if (match && db.posts.find((p) => p.id === match[2])?.status !== 'ACTIVE') {
      toast.warning('Nội dung liên quan đã bị xoá hoặc không còn khả dụng')
      return
    }
    onNavigate?.()
    if (n.link !== '/notifications') navigate(n.link)
  }
  return (
    <li>
      <button type="button" onClick={open} className={cn('flex w-full gap-3 p-4 text-left transition-colors duration-150 hover:bg-neutral-100', !n.read && 'bg-primary-50')}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700"><Icon className="size-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className={cn('line-clamp-2 text-body-md text-neutral-900', !n.read && 'font-semibold')}>{n.title}</span>
          <span className="mt-1 line-clamp-2 text-body-md text-neutral-700">{n.excerpt}</span>
          <span className="mt-1 block text-caption text-neutral-700">{timeAgo(n.createdAt)}</span>
        </span>
        {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary-500" aria-label="Chưa đọc" />}
      </button>
    </li>
  )
}

const PAGE = 20

export function NotificationsPage() {
  const db = useDb()
  const me = useCurrentUser()
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [shown, setShown] = useState(PAGE)
  const loading = useFakeLoading(tab)
  const mine = db.notifications.filter((n) => n.accountId === me?.id)
  const list = tab === 'all' ? mine : mine.filter((n) => !n.read)
  const unread = unreadCount(db, me)
  return (
    <div className="mx-auto max-w-[845px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-primary-900 md:text-h1">Trung tâm thông báo</h1>
        <Button variant="outline" icon={<CheckCheck className="size-4" />} disabled={unread === 0} onClick={() => { api.markAllRead(); toast.success('Đã đánh dấu tất cả là đã đọc') }}>Đánh dấu tất cả là đã đọc</Button>
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: 'Tất cả' }, { value: 'unread', label: 'Chưa đọc', count: unread }]} className="[&>button]:flex-1 md:[&>button]:flex-none" />
      <div className="mt-4">
        {loading ? <SkeletonList count={4} /> : list.length === 0 ? (
          <EmptyState icon={<BellOff />} title={tab === 'all' ? 'Bạn chưa có thông báo nào' : 'Bạn đã đọc hết mọi thông báo'} />
        ) : (
          <>
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              {list.slice(0, shown).map((n) => <NotificationItem key={n.id} n={n} />)}
            </ul>
            {list.length > shown && <div className="mt-4 text-center"><Button variant="outline" onClick={() => setShown((s) => s + PAGE)}>Tải thêm thông báo</Button></div>}
          </>
        )}
      </div>
    </div>
  )
}
