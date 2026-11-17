import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LIMITS, excerpt, uid } from '../lib/utils'
import type {
  Account,
  Comment,
  Database,
  DoctorProfile,
  Notification,
  NotificationType,
  Post,
  PostKind,
  ReportTargetType,
  Verification,
  VoteValue,
} from '../types'
import { createSeed } from './seed'

/* Lớp giả lập backend. Mỗi hàm trong `api` tương ứng một nhóm API của SRS (ghi ở chú thích),
   kiểm tra quyền và quy tắc nghiệp vụ rồi ném ApiError với mã HTTP giống hợp đồng lỗi thật. */

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface State {
  db: Database
  sessionUserId: string | null
  pending2FA: string | null
}

export const useStore = create<State>()(
  persist((): State => ({ db: createSeed(), sessionUserId: null, pending2FA: null }), { name: 'mediq-prototype-v1' }),
)

const get = () => useStore.getState()
const now = () => new Date().toISOString()
const mutate = (fn: (db: Database) => void) => {
  const db = structuredClone(get().db)
  fn(db)
  useStore.setState({ db })
}

/** Giả lập độ trễ mạng; mọi màn hình gọi api qua hàm này để có trạng thái loading. */
export function call<T>(fn: () => T, delay = 350): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn())
      } catch (e) {
        reject(e)
      }
    }, delay)
  })
}

// ---------- Selectors ----------

export const DELETED_NAME = 'Deleted MediQ user'

export function currentUser(s: State = get()): Account | null {
  return s.db.accounts.find((a) => a.id === s.sessionUserId) ?? null
}
export const useCurrentUser = () => useStore((s) => s.db.accounts.find((a) => a.id === s.sessionUserId) ?? null)
export const useDb = () => useStore((s) => s.db)

export const accountById = (db: Database, id: string) => db.accounts.find((a) => a.id === id)
export const displayNameOf = (a?: Account) => (!a || a.status === 'DELETED' ? DELETED_NAME : a.displayName)
/** BR-05: huy hiệu được suy ra lúc hiển thị từ role hiện tại. */
export const isVerifiedDoctor = (a?: Account | null) => !!a && a.role === 'VERIFIED_DOCTOR' && a.status !== 'DELETED'
export const doctorProfileOf = (db: Database, accountId: string) => db.doctorProfiles.find((p) => p.accountId === accountId)

export function scoreOf(db: Database, targetType: 'article' | 'comment', targetId: string) {
  const votes = db.votes.filter((v) => v.targetType === targetType && v.targetId === targetId)
  const up = votes.filter((v) => v.value === 1).length
  return { up, down: votes.length - up, score: up - (votes.length - up) }
}
export const myVote = (db: Database, me: Account | null, targetType: 'article' | 'comment', targetId: string) =>
  db.votes.find((v) => v.accountId === me?.id && v.targetType === targetType && v.targetId === targetId)?.value ?? 0
export const isBookmarked = (db: Database, me: Account | null, postId: string) =>
  db.bookmarks.some((b) => b.accountId === me?.id && b.postId === postId)
export const activeComments = (db: Database, postId: string) =>
  db.comments.filter((c) => c.postId === postId && c.status === 'ACTIVE')
export const hasDoctorAnswer = (db: Database, postId: string) =>
  activeComments(db, postId).some((c) => isVerifiedDoctor(accountById(db, c.authorId)))
export const unreadCount = (db: Database, me: Account | null) =>
  db.notifications.filter((n) => n.accountId === me?.id && !n.read).length
export const latestVerification = (db: Database, accountId: string) =>
  db.verifications.filter((v) => v.accountId === accountId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

// ---------- Guards ----------

function requireUser(): Account {
  const me = currentUser()
  if (!me) throw new ApiError(401, 'UNAUTHENTICATED', 'Bạn cần đăng nhập để tiếp tục.')
  if (me.status === 'SUSPENDED') throw new ApiError(401, 'TOKEN_REVOKED', 'Tài khoản của bạn đang bị tạm khoá.')
  return me
}
function requireMember(): Account {
  const me = requireUser()
  if (me.role === 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'Quản trị viên không thực hiện tương tác xã hội (BR-03).')
  return me
}
function requireAdmin(): Account {
  const me = requireUser()
  if (me.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'Chỉ Quản trị viên được thực hiện thao tác này.')
  return me
}
function invalid(message: string): never {
  throw new ApiError(422, 'VALIDATION_FAILED', message)
}
function checkPassword(me: Account, password: string) {
  if (me.password !== password) throw new ApiError(422, 'INVALID_PASSWORD', 'Mật khẩu hiện tại không đúng.')
}

function audit(db: Database, actorId: string, action: string, target: string, metadata: Record<string, unknown>) {
  db.auditLogs.unshift({ id: uid('al'), actorId, action, target, metadata, createdAt: now() })
}
/** BR-19: không gửi thông báo cho chính người thao tác. */
function notify(db: Database, accountId: string, actorId: string | null, type: NotificationType, title: string, text: string, link: string) {
  if (accountId === actorId) return
  const target = accountById(db, accountId)
  if (!target || target.status === 'DELETED') return
  const n: Notification = { id: uid('n'), accountId, type, actorId, title, excerpt: excerpt(text, 120), link, read: false, createdAt: now() }
  db.notifications.unshift(n)
}

/** BR-13..15: gỡ nội dung kéo theo mọi comment con và ảnh. Trả về số lượng bị ảnh hưởng. */
function cascadeDeletePost(db: Database, postId: string) {
  const post = db.posts.find((p) => p.id === postId)
  if (!post) return { comments: 0, images: 0 }
  post.status = 'DELETED'
  const comments = db.comments.filter((c) => c.postId === postId && c.status === 'ACTIVE')
  comments.forEach((c) => (c.status = 'DELETED'))
  db.bookmarks = db.bookmarks.filter((b) => b.postId !== postId)
  return { comments: comments.length, images: post.images.length + comments.reduce((n, c) => n + c.images.length, 0) }
}
function cascadeDeleteComment(db: Database, commentId: string) {
  const ids = new Set([commentId])
  let grew = true
  while (grew) {
    grew = false
    for (const c of db.comments) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id)
        grew = true
      }
    }
  }
  let count = 0
  for (const c of db.comments) {
    if (ids.has(c.id) && c.status === 'ACTIVE') {
      c.status = 'DELETED'
      count++
    }
  }
  return { comments: count - 1, images: 0 }
}
export function cascadeImpact(db: Database, targetType: ReportTargetType, targetId: string) {
  const copy = structuredClone(db)
  if (targetType === 'comment') return cascadeDeleteComment(copy, targetId)
  if (targetType === 'account') return { comments: 0, images: 0 }
  return cascadeDeletePost(copy, targetId)
}

function validatePost(kind: PostKind, data: PostInput, db: Database, existing?: Post) {
  const title = data.title.trim()
  const body = data.body.trim()
  if (!title) invalid('Tiêu đề không được để trống.')
  if (title.length > LIMITS.title) invalid(`Tiêu đề tối đa ${LIMITS.title} ký tự.`)
  if (!body) invalid('Nội dung không được để trống.')
  const maxBody = kind === 'question' ? LIMITS.questionBody : LIMITS.articleBody
  if (body.length > maxBody) invalid(`Nội dung tối đa ${maxBody.toLocaleString('vi-VN')} ký tự.`)
  if (data.tagIds.length < 1) invalid('Cần chọn ít nhất một thẻ chuyên khoa.')
  for (const id of data.tagIds) {
    const tag = db.tags.find((t) => t.id === id)
    // Tag đã bị Admin xoá chỉ được giữ nếu đang gắn sẵn trên nội dung (REQ-SOC-006).
    if (!tag || (tag.deleted && !existing?.tagIds.includes(id))) invalid('Thẻ chuyên khoa không còn khả dụng.')
  }
  const maxImages = kind === 'question' ? LIMITS.questionImages : LIMITS.articleImages
  if (data.images.length > maxImages) throw new ApiError(422, 'TOO_MANY_ITEMS', `Tối đa ${maxImages} ảnh.`)
  return { title, body }
}

export interface PostInput {
  title: string
  body: string
  tagIds: string[]
  images: string[]
}
export interface VerificationInput {
  license: string
  specialty: string
  title: string
  workplace: string
  startYear: number
  files: string[]
}

export const api = {
  // ================= AUTH (API-AUTH-*) =================
  register(input: { email: string; username: string; displayName: string; password: string }) {
    const email = input.email.trim().toLowerCase()
    const username = input.username.trim()
    mutate((db) => {
      if (db.accounts.some((a) => a.email === email)) throw new ApiError(409, 'EMAIL_TAKEN', 'Email này đã được đăng ký.')
      if (db.accounts.some((a) => a.username === username)) throw new ApiError(409, 'USERNAME_TAKEN', 'Tên đăng nhập đã tồn tại.')
      db.accounts.push({
        id: uid('u'), email, username, displayName: input.displayName.trim(), password: input.password, bio: '', avatar: null,
        role: 'NORMAL_USER', status: 'UNVERIFIED', suspendedUntil: null, suspendReason: null, twoFA: false, passkeys: [], createdAt: now(),
      })
    })
    return email
  },
  verifyEmail(email: string) {
    mutate((db) => {
      const acc = db.accounts.find((a) => a.email === email)
      if (!acc || acc.status !== 'UNVERIFIED') throw new ApiError(400, 'INVALID_TOKEN', 'Liên kết đã hết hạn hoặc không còn hợp lệ.')
      acc.status = 'ACTIVE'
    })
  },
  /** Trả về '2fa' nếu tài khoản bật TOTP, ngược lại tạo phiên luôn. */
  login(email: string, password: string): 'ok' | '2fa' {
    const acc = get().db.accounts.find((a) => a.email === email.trim().toLowerCase())
    if (!acc || acc.status === 'DELETED' || acc.password !== password)
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.')
    return api._startSession(acc)
  },
  loginWithPasskey(email: string): 'ok' | '2fa' {
    const acc = get().db.accounts.find((a) => a.email === email.trim().toLowerCase())
    if (!acc || acc.passkeys.length === 0 || acc.status === 'DELETED')
      throw new ApiError(401, 'PASSKEY_NOT_FOUND', 'Không tìm thấy Passkey nào trên thiết bị này cho tài khoản đã nhập.')
    // Passkey đã là xác thực mạnh nên bỏ qua bước TOTP.
    return api._startSession(acc, true)
  },
  _startSession(acc: Account, skip2FA = false): 'ok' | '2fa' {
    if (acc.status === 'UNVERIFIED') throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Tài khoản chưa xác minh email. Vui lòng kiểm tra hộp thư.')
    if (acc.status === 'SUSPENDED') {
      if (acc.suspendedUntil && new Date(acc.suspendedUntil) < new Date()) {
        mutate((db) => {
          const a = accountById(db, acc.id)!
          a.status = 'ACTIVE'
          a.suspendedUntil = null
          a.suspendReason = null
        })
      } else {
        useStore.setState({ sessionUserId: acc.id, pending2FA: null })
        throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Tài khoản đang bị tạm khoá.')
      }
    }
    if (acc.twoFA && !skip2FA) {
      useStore.setState({ pending2FA: acc.id })
      return '2fa'
    }
    useStore.setState({ sessionUserId: acc.id, pending2FA: null })
    return 'ok'
  },
  /** Prototype chấp nhận mọi mã 6 chữ số, trừ 000000 để demo trường hợp sai mã. */
  verify2FA(code: string) {
    const id = get().pending2FA
    if (!id) throw new ApiError(401, 'SESSION_EXPIRED', 'Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.')
    if (!/^\d{6}$/.test(code) || code === '000000') throw new ApiError(401, 'INVALID_TOTP', 'Mã xác thực không đúng. Vui lòng thử lại.')
    useStore.setState({ sessionUserId: id, pending2FA: null })
  },
  logout() {
    useStore.setState({ sessionUserId: null, pending2FA: null })
  },
  resetPassword(email: string, password: string) {
    mutate((db) => {
      const acc = db.accounts.find((a) => a.email === email.trim().toLowerCase())
      if (acc && acc.status !== 'DELETED') acc.password = password
    })
  },
  /** Thanh demo: đổi nhanh vai trò mà không qua màn đăng nhập. */
  switchTo(accountId: string | null) {
    useStore.setState({ sessionUserId: accountId, pending2FA: null })
  },
  resetDemo() {
    useStore.setState({ db: createSeed(), sessionUserId: null, pending2FA: null })
  },

  // ================= USR (API-USR-*) =================
  updateProfile(input: { displayName: string; bio: string; avatar: string | null }) {
    const me = requireUser()
    const name = input.displayName.trim()
    if (name.length < LIMITS.displayNameMin || name.length > LIMITS.displayName)
      invalid(`Tên hiển thị từ ${LIMITS.displayNameMin} đến ${LIMITS.displayName} ký tự.`)
    if (input.bio.length > LIMITS.bio) invalid(`Giới thiệu tối đa ${LIMITS.bio} ký tự.`)
    mutate((db) => Object.assign(accountById(db, me.id)!, { displayName: name, bio: input.bio.trim(), avatar: input.avatar }))
  },
  enable2FA(password: string, code: string) {
    const me = requireUser()
    checkPassword(me, password)
    if (!/^\d{6}$/.test(code) || code === '000000') throw new ApiError(422, 'INVALID_TOTP', 'Mã 6 chữ số không đúng.')
    mutate((db) => (accountById(db, me.id)!.twoFA = true))
  },
  disable2FA(password: string) {
    const me = requireUser()
    checkPassword(me, password)
    mutate((db) => (accountById(db, me.id)!.twoFA = false))
  },
  addPasskey(name: string) {
    const me = requireUser()
    if (me.passkeys.length >= LIMITS.passkeys) throw new ApiError(422, 'TOO_MANY_ITEMS', `Mỗi tài khoản tối đa ${LIMITS.passkeys} Passkey.`)
    mutate((db) => accountById(db, me.id)!.passkeys.push({ id: uid('pk'), name: name.trim().slice(0, LIMITS.passkeyName) || 'Thiết bị mới', createdAt: now() }))
  },
  renamePasskey(id: string, name: string) {
    const me = requireUser()
    mutate((db) => {
      const pk = accountById(db, me.id)!.passkeys.find((p) => p.id === id)
      if (pk) pk.name = name.trim().slice(0, LIMITS.passkeyName) || pk.name
    })
  },
  removePasskey(id: string) {
    const me = requireUser()
    mutate((db) => {
      const acc = accountById(db, me.id)!
      acc.passkeys = acc.passkeys.filter((p) => p.id !== id)
    })
  },
  /** BR-25/26: xoá định danh, giữ nội dung dưới tên "Deleted MediQ user". */
  deleteAccount(password: string) {
    const me = requireUser()
    checkPassword(me, password)
    mutate((db) => {
      const acc = accountById(db, me.id)!
      Object.assign(acc, { status: 'DELETED', email: `deleted-${acc.id}@deleted.invalid`, username: `deleted-${acc.id}`, displayName: DELETED_NAME, bio: '', avatar: null, twoFA: false, passkeys: [], role: 'NORMAL_USER' })
      db.bookmarks = db.bookmarks.filter((b) => b.accountId !== me.id)
      db.notifications = db.notifications.filter((n) => n.accountId !== me.id)
      db.doctorProfiles = db.doctorProfiles.filter((p) => p.accountId !== me.id)
      db.verifications = db.verifications.filter((v) => v.accountId !== me.id)
    })
    useStore.setState({ sessionUserId: null })
  },

  // ================= SOC: Question / Article (API-SOC-01..08) =================
  createPost(kind: PostKind, input: PostInput): string {
    const me = requireMember()
    // BR-06: chỉ Verified Doctor được tạo Article.
    if (kind === 'article' && me.role !== 'VERIFIED_DOCTOR')
      throw new ApiError(403, 'FORBIDDEN', 'Chỉ bác sĩ đã xác minh mới được đăng bài viết chuyên môn.')
    const id = uid(kind === 'question' ? 'q' : 'a')
    mutate((db) => {
      const { title, body } = validatePost(kind, input, db)
      const post: Post = { id, kind, authorId: me.id, title, body, tagIds: input.tagIds, images: input.images, status: 'ACTIVE', createdAt: now(), editedAt: null }
      db.posts.unshift(post)
      db.revisions.push({ id: uid('r'), targetType: 'post', targetId: id, version: 1, title, body, images: input.images, tagIds: input.tagIds, editorId: me.id, createdAt: post.createdAt })
    })
    return id
  },
  /** BR-07 + BR-16: chỉ chính chủ sửa; mỗi lần lưu tạo một Revision mới. */
  updatePost(id: string, input: PostInput) {
    const me = requireMember()
    mutate((db) => {
      const post = db.posts.find((p) => p.id === id)
      if (!post || post.status !== 'ACTIVE') throw new ApiError(404, 'NOT_FOUND', 'Nội dung không còn tồn tại.')
      if (post.authorId !== me.id) throw new ApiError(403, 'FORBIDDEN', 'Bạn chỉ có thể sửa nội dung do mình tạo.')
      if (post.kind === 'article' && me.role !== 'VERIFIED_DOCTOR')
        throw new ApiError(403, 'FORBIDDEN', 'Tài khoản không còn quyền Verified Doctor nên không thể sửa bài viết.')
      const { title, body } = validatePost(post.kind, input, db, post)
      Object.assign(post, { title, body, tagIds: input.tagIds, images: input.images, editedAt: now() })
      const version = db.revisions.filter((r) => r.targetType === 'post' && r.targetId === id).length + 1
      db.revisions.push({ id: uid('r'), targetType: 'post', targetId: id, version, title, body, images: input.images, tagIds: input.tagIds, editorId: me.id, createdAt: post.editedAt! })
    })
  },
  deletePost(id: string) {
    const me = requireMember()
    mutate((db) => {
      const post = db.posts.find((p) => p.id === id)
      if (!post || post.status !== 'ACTIVE') throw new ApiError(404, 'NOT_FOUND', 'Nội dung không còn tồn tại.')
      if (post.authorId !== me.id) throw new ApiError(403, 'FORBIDDEN', 'Bạn chỉ có thể xoá nội dung do mình tạo.')
      cascadeDeletePost(db, id)
    })
  },

  // ================= SOC: Comment (API-SOC-09..13, 25) =================
  createComment(postId: string, parentId: string | null, body: string, images: string[]): string {
    const me = requireMember()
    const text = body.trim()
    if (!text) invalid('Nội dung bình luận không được để trống.')
    if (text.length > LIMITS.commentBody) invalid(`Bình luận tối đa ${LIMITS.commentBody.toLocaleString('vi-VN')} ký tự.`)
    if (images.length > LIMITS.commentImages) throw new ApiError(422, 'TOO_MANY_ITEMS', `Bình luận tối đa ${LIMITS.commentImages} ảnh.`)
    const id = uid('c')
    mutate((db) => {
      const post = db.posts.find((p) => p.id === postId)
      if (!post || post.status !== 'ACTIVE') throw new ApiError(404, 'NOT_FOUND', 'Nội dung không còn tồn tại.')
      const parent = parentId ? db.comments.find((c) => c.id === parentId) : null
      if (parentId && (!parent || parent.status !== 'ACTIVE')) throw new ApiError(404, 'NOT_FOUND', 'Bình luận gốc không còn tồn tại.')
      const c: Comment = { id, postId, parentId, authorId: me.id, body: text, images, status: 'ACTIVE', createdAt: now(), editedAt: null }
      db.comments.push(c)
      db.revisions.push({ id: uid('r'), targetType: 'comment', targetId: id, version: 1, title: null, body: text, images, tagIds: [], editorId: me.id, createdAt: c.createdAt })
      const link = post.kind === 'question' ? `/questions/${post.id}` : `/articles/${post.id}`
      const kindLabel = post.kind === 'question' ? 'câu hỏi' : 'bài viết'
      // Reply báo cho tác giả comment cha; comment gốc báo cho tác giả nội dung. Không gửi kép.
      if (parent) notify(db, parent.authorId, me.id, 'REPLY', `${me.displayName} đã trả lời bình luận của bạn`, text, link)
      else notify(db, post.authorId, me.id, 'COMMENT', `${me.displayName} đã bình luận về ${kindLabel} của bạn`, text, link)
    })
    return id
  },
  updateComment(id: string, body: string) {
    const me = requireMember()
    const text = body.trim()
    if (!text) invalid('Nội dung bình luận không được để trống.')
    if (text.length > LIMITS.commentBody) invalid(`Bình luận tối đa ${LIMITS.commentBody.toLocaleString('vi-VN')} ký tự.`)
    mutate((db) => {
      const c = db.comments.find((x) => x.id === id)
      if (!c || c.status !== 'ACTIVE') throw new ApiError(404, 'NOT_FOUND', 'Bình luận không còn tồn tại.')
      if (c.authorId !== me.id) throw new ApiError(403, 'FORBIDDEN', 'Bạn chỉ có thể sửa bình luận của mình.')
      c.body = text
      c.editedAt = now()
      const version = db.revisions.filter((r) => r.targetType === 'comment' && r.targetId === id).length + 1
      db.revisions.push({ id: uid('r'), targetType: 'comment', targetId: id, version, title: null, body: text, images: c.images, tagIds: [], editorId: me.id, createdAt: c.editedAt })
    })
  },
  deleteComment(id: string) {
    const me = requireMember()
    mutate((db) => {
      const c = db.comments.find((x) => x.id === id)
      if (!c || c.status !== 'ACTIVE') throw new ApiError(404, 'NOT_FOUND', 'Bình luận không còn tồn tại.')
      if (c.authorId !== me.id) throw new ApiError(403, 'FORBIDDEN', 'Bạn chỉ có thể xoá bình luận của mình.')
      cascadeDeleteComment(db, id)
    })
  },

  // ================= SOC: Vote / Bookmark (API-SOC-14..20) =================
  /** BR-18: ba trạng thái, bấm lại nút đang chọn thì về NONE; chỉ áp dụng cho Article và Comment. */
  vote(targetType: 'article' | 'comment', targetId: string, value: VoteValue) {
    const me = requireMember()
    mutate((db) => {
      const existing = db.votes.find((v) => v.accountId === me.id && v.targetType === targetType && v.targetId === targetId)
      db.votes = db.votes.filter((v) => v !== existing)
      if (existing?.value !== value) db.votes.push({ accountId: me.id, targetType, targetId, value })
    })
  },
  toggleBookmark(postId: string): boolean {
    const me = requireMember()
    let saved = false
    mutate((db) => {
      const had = db.bookmarks.some((b) => b.accountId === me.id && b.postId === postId)
      db.bookmarks = db.bookmarks.filter((b) => !(b.accountId === me.id && b.postId === postId))
      if (!had) {
        db.bookmarks.unshift({ accountId: me.id, postId, createdAt: now() })
        saved = true
      }
    })
    return saved
  },

  // ================= Report (API-ADM-01) =================
  report(targetType: ReportTargetType, targetId: string, category: string, reason: string) {
    const me = requireMember()
    const text = reason.trim()
    if (!text) invalid('Vui lòng mô tả lý do báo cáo.')
    if (text.length > LIMITS.reason) invalid(`Lý do tối đa ${LIMITS.reason} ký tự.`)
    mutate((db) => {
      const dup = db.reports.some((r) => r.reporterId === me.id && r.targetType === targetType && r.targetId === targetId && (r.status === 'PENDING' || r.status === 'REVIEWING'))
      if (dup) throw new ApiError(409, 'DUPLICATE_REPORT', 'Bạn đã báo cáo nội dung này và báo cáo đang được xử lý.')
      const severity = /thuốc|lừa đảo|giả mạo/i.test(category) ? 'HIGH' : 'MEDIUM'
      const seq = 100 + db.reports.length + 11
      db.reports.unshift({ id: `RP-${seq}`, reporterId: me.id, targetType, targetId, category, severity, reason: text, status: 'PENDING', createdAt: now(), handledBy: null })
    })
  },

  // ================= DV (API-DV-*) =================
  submitVerification(input: VerificationInput) {
    const me = requireMember()
    const year = new Date().getFullYear()
    if (!input.license.trim() || !input.specialty.trim() || !input.title.trim() || !input.workplace.trim()) invalid('Vui lòng điền đủ các trường bắt buộc.')
    if (!Number.isInteger(input.startYear) || input.startYear < 1900 || input.startYear > year) invalid(`Năm bắt đầu hành nghề phải từ 1900 đến ${year}.`)
    if (input.files.length < 1 || input.files.length > LIMITS.verificationFiles) invalid(`Cần từ 1 đến ${LIMITS.verificationFiles} tệp minh chứng.`)
    mutate((db) => {
      if (db.verifications.some((v) => v.accountId === me.id && v.status === 'PENDING'))
        throw new ApiError(409, 'INVALID_VERIFICATION_STATE', 'Bạn đang có một hồ sơ chờ thẩm định.')
      const last = latestVerification(db, me.id)
      const type = me.role === 'VERIFIED_DOCTOR' ? 'UPDATE' : last ? 'RESUBMISSION' : 'NEW'
      const seq = 40 + db.verifications.length + 6
      const v: Verification = {
        id: `DV-${String(seq).padStart(3, '0')}`, accountId: me.id, type, status: 'PENDING', ...input,
        license: input.license.trim(), reason: null, createdAt: now(), decidedAt: null,
        history: [{ at: now(), action: 'SUBMITTED', status: 'PENDING', note: `Đã gửi ${input.files.length} tệp minh chứng` }],
      }
      db.verifications.unshift(v)
    })
  },
  approveVerification(id: string) {
    const admin = requireAdmin()
    mutate((db) => {
      const v = db.verifications.find((x) => x.id === id)
      if (!v || v.status !== 'PENDING') throw new ApiError(409, 'INVALID_VERIFICATION_STATE', 'Hồ sơ đã được xử lý trước đó.')
      const acc = accountById(db, v.accountId)!
      if (acc.status === 'SUSPENDED') throw new ApiError(409, 'APPLICANT_SUSPENDED', 'Tài khoản người nộp đang bị tạm khoá; không thể phê duyệt.')
      v.status = 'APPROVED'
      v.decidedAt = now()
      v.history.push({ at: now(), action: 'APPROVED', status: 'APPROVED', note: '' })
      acc.role = 'VERIFIED_DOCTOR'
      const profile: DoctorProfile = { accountId: acc.id, title: v.title, specialty: v.specialty, workplace: v.workplace, startYear: v.startYear, license: v.license, visible: doctorProfileOf(db, acc.id)?.visible ?? true, revoked: false }
      db.doctorProfiles = [...db.doctorProfiles.filter((p) => p.accountId !== acc.id), profile]
      audit(db, admin.id, 'VERIFICATION_APPROVED', v.id, { license: v.license })
      notify(db, acc.id, admin.id, 'VERIFICATION_APPROVED', 'Hồ sơ xác minh bác sĩ đã được phê duyệt', 'Tài khoản của bạn đã được cấp quyền Verified Doctor.', '/doctor-verification/status')
    })
  },
  rejectVerification(id: string, reason: string) {
    const admin = requireAdmin()
    const text = reason.trim()
    if (!text || text.length > LIMITS.reason) invalid(`Lý do từ 1 đến ${LIMITS.reason} ký tự.`)
    mutate((db) => {
      const v = db.verifications.find((x) => x.id === id)
      if (!v || v.status !== 'PENDING') throw new ApiError(409, 'INVALID_VERIFICATION_STATE', 'Hồ sơ đã được xử lý trước đó.')
      v.status = 'REJECTED'
      v.reason = text
      v.decidedAt = now()
      v.history.push({ at: now(), action: 'REJECTED', status: 'REJECTED', note: text })
      audit(db, admin.id, 'VERIFICATION_REJECTED', v.id, { reason: text })
      notify(db, v.accountId, admin.id, 'VERIFICATION_REJECTED', 'Hồ sơ xác minh bác sĩ bị từ chối', text, '/doctor-verification/status')
    })
  },
  /** Thu hồi: hạ role về NORMAL_USER, huy hiệu biến mất ngay (BR-05), huỷ hồ sơ UPDATE đang chờ. */
  revokeVerification(id: string, reason: string) {
    const admin = requireAdmin()
    const text = reason.trim()
    if (!text || text.length > LIMITS.reason) invalid(`Lý do từ 1 đến ${LIMITS.reason} ký tự.`)
    mutate((db) => {
      const v = db.verifications.find((x) => x.id === id)
      if (!v || v.status !== 'APPROVED') throw new ApiError(409, 'INVALID_VERIFICATION_STATE', 'Chỉ thu hồi được hồ sơ đang APPROVED.')
      v.status = 'REVOKED'
      v.reason = text
      v.decidedAt = now()
      v.history.push({ at: now(), action: 'REVOKED', status: 'REVOKED', note: text })
      const acc = accountById(db, v.accountId)!
      if (acc.role === 'VERIFIED_DOCTOR') acc.role = 'NORMAL_USER'
      const profile = doctorProfileOf(db, acc.id)
      if (profile) profile.revoked = true
      db.verifications = db.verifications.filter((x) => !(x.accountId === acc.id && x.type === 'UPDATE' && x.status === 'PENDING'))
      audit(db, admin.id, 'VERIFICATION_REVOKED', v.id, { reason: text })
      notify(db, acc.id, admin.id, 'VERIFICATION_REVOKED', 'Xác minh bác sĩ của bạn đã bị thu hồi', text, '/doctor-verification/status')
    })
  },
  reopenVerification(id: string) {
    const admin = requireAdmin()
    mutate((db) => {
      const v = db.verifications.find((x) => x.id === id)
      if (!v || v.status !== 'REJECTED') throw new ApiError(409, 'INVALID_VERIFICATION_STATE', 'Chỉ mở lại được hồ sơ đang REJECTED.')
      if (db.verifications.some((x) => x.accountId === v.accountId && x.status === 'PENDING'))
        throw new ApiError(409, 'INVALID_VERIFICATION_STATE', 'Người nộp đang có hồ sơ PENDING khác.')
      v.status = 'PENDING'
      v.reason = null
      v.decidedAt = null
      v.history.push({ at: now(), action: 'REOPENED', status: 'PENDING', note: 'Admin mở lại hồ sơ' })
      audit(db, admin.id, 'VERIFICATION_REOPENED', v.id, {})
    })
  },
  setDoctorProfileVisible(visible: boolean) {
    const me = requireUser()
    mutate((db) => {
      const p = doctorProfileOf(db, me.id)
      if (!p) throw new ApiError(404, 'NOT_FOUND', 'Bạn chưa có hồ sơ bác sĩ.')
      p.visible = visible
    })
  },

  // ================= NTF (API-NTF-*) =================
  markRead(id: string) {
    const me = requireUser()
    mutate((db) => {
      const n = db.notifications.find((x) => x.id === id && x.accountId === me.id)
      if (n) n.read = true
    })
  },
  markAllRead() {
    const me = requireUser()
    mutate((db) => db.notifications.forEach((n) => n.accountId === me.id && (n.read = true)))
  },

  // ================= ADM (API-ADM-*) =================
  takeReport(id: string) {
    const admin = requireAdmin()
    mutate((db) => {
      const r = db.reports.find((x) => x.id === id)
      if (!r || r.status !== 'PENDING') throw new ApiError(409, 'INVALID_REPORT_STATE', 'Báo cáo đã được phiên khác tiếp nhận.')
      r.status = 'REVIEWING'
      r.handledBy = admin.id
      audit(db, admin.id, 'REPORT_REVIEWING', r.id, {})
    })
  },
  closeReport(id: string, outcome: 'RESOLVED' | 'REJECTED') {
    const admin = requireAdmin()
    mutate((db) => {
      const r = db.reports.find((x) => x.id === id)
      if (!r || r.status !== 'REVIEWING') throw new ApiError(409, 'INVALID_REPORT_STATE', 'Báo cáo không ở trạng thái đang xem xét.')
      r.status = outcome
      audit(db, admin.id, outcome === 'RESOLVED' ? 'REPORT_RESOLVED' : 'REPORT_REJECTED', r.id, {})
      notify(db, r.reporterId, admin.id, outcome === 'RESOLVED' ? 'REPORT_RESOLVED' : 'REPORT_REJECTED', `Kết quả xử lý báo cáo #${r.id}`,
        outcome === 'RESOLVED' ? 'Báo cáo của bạn đã được Ban Quản trị tiếp nhận và xử lý.' : 'Ban Quản trị đã xem xét và không ghi nhận vi phạm.', '/notifications')
      if (outcome === 'RESOLVED') {
        // NFR-05.7: không tiết lộ người báo cáo cho bên bị báo cáo.
        const owner = r.targetType === 'account' ? r.targetId : r.targetType === 'comment' ? db.comments.find((c) => c.id === r.targetId)?.authorId : db.posts.find((p) => p.id === r.targetId)?.authorId
        if (owner) notify(db, owner, admin.id, 'REPORT_AGAINST_YOU_RESOLVED', 'Một báo cáo liên quan đến bạn đã được xử lý', 'Ban Quản trị đã xử lý một báo cáo về nội dung hoặc tài khoản của bạn.', '/notifications')
      }
    })
  },
  /** UC-ADM-008: gỡ nội dung cascade, không khôi phục được (BR-11), ghi Audit Log. */
  removeContent(targetType: 'question' | 'article' | 'comment', targetId: string, reason: string) {
    const admin = requireAdmin()
    const text = reason.trim()
    if (!text) invalid('Lý do kiểm duyệt là bắt buộc.')
    if (text.length > LIMITS.reason) invalid(`Lý do tối đa ${LIMITS.reason} ký tự.`)
    mutate((db) => {
      const target = targetType === 'comment' ? db.comments.find((c) => c.id === targetId) : db.posts.find((p) => p.id === targetId)
      if (!target || target.status !== 'ACTIVE') throw new ApiError(409, 'TARGET_DELETED', 'Nội dung mục tiêu đã ở trạng thái DELETED.')
      const impact = targetType === 'comment' ? cascadeDeleteComment(db, targetId) : cascadeDeletePost(db, targetId)
      audit(db, admin.id, 'CONTENT_REMOVED', `${targetType}:${targetId}`, { reason: text, cascadeComments: impact.comments, cascadeImages: impact.images })
    })
  },
  /** days = null nghĩa là khoá vô thời hạn. Thu hồi phiên ngay lập tức (NFR-04.6). */
  suspend(accountId: string, days: number | null, reason: string) {
    const admin = requireAdmin()
    const text = reason.trim()
    if (!text) invalid('Lý do tạm khoá là bắt buộc.')
    if (text.length > LIMITS.reason) invalid(`Lý do tối đa ${LIMITS.reason} ký tự.`)
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 365)) invalid('Thời hạn tạm khoá từ 1 đến 365 ngày.')
    mutate((db) => {
      const acc = accountById(db, accountId)
      if (!acc || acc.status !== 'ACTIVE') throw new ApiError(409, 'INVALID_ACCOUNT_STATE', 'Chỉ tạm khoá được tài khoản đang ACTIVE.')
      if (acc.role === 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'Không thể tạm khoá tài khoản Quản trị viên.')
      acc.status = 'SUSPENDED'
      acc.suspendedUntil = days === null ? null : new Date(Date.now() + days * 86_400_000).toISOString()
      acc.suspendReason = text
      audit(db, admin.id, 'SUSPEND', `account:${acc.username}`, { days: days ?? 'indefinite', reason: text })
    })
  },
  unsuspend(accountId: string) {
    const admin = requireAdmin()
    mutate((db) => {
      const acc = accountById(db, accountId)
      if (!acc || acc.status !== 'SUSPENDED') throw new ApiError(409, 'INVALID_ACCOUNT_STATE', 'Tài khoản không ở trạng thái tạm khoá.')
      acc.status = 'ACTIVE'
      acc.suspendedUntil = null
      acc.suspendReason = null
      audit(db, admin.id, 'UNSUSPEND', `account:${acc.username}`, {})
    })
  },
  createTag(name: string) {
    const admin = requireAdmin()
    const text = name.trim()
    if (!text) invalid('Tên thẻ không được để trống.')
    if (text.length > LIMITS.tagName) invalid(`Tên thẻ tối đa ${LIMITS.tagName} ký tự.`)
    mutate((db) => {
      if (db.tags.some((t) => !t.deleted && t.name.toLowerCase() === text.toLowerCase())) throw new ApiError(409, 'TAG_EXISTS', 'Thẻ này đã tồn tại.')
      const id = uid('t')
      db.tags.push({ id, name: text, createdAt: now(), deleted: false })
      audit(db, admin.id, 'CREATE_TAG', id, { tagName: text })
    })
  },
  /** BR-17: không đổi tên; xoá thì nội dung cũ vẫn giữ tag. */
  deleteTag(id: string) {
    const admin = requireAdmin()
    mutate((db) => {
      const tag = db.tags.find((t) => t.id === id)
      if (!tag || tag.deleted) throw new ApiError(404, 'NOT_FOUND', 'Thẻ không tồn tại.')
      tag.deleted = true
      audit(db, admin.id, 'DELETE_TAG', id, { tagName: tag.name })
    })
  },
}
