// Mô hình dữ liệu của prototype, bám theo SRS mục 1.3 (enum) và các REQ tương ứng.

export type Role = 'NORMAL_USER' | 'VERIFIED_DOCTOR' | 'ADMIN'
export type AccountStatus = 'UNVERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'DELETED'
export type ContentStatus = 'ACTIVE' | 'DELETED'
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'
export type VerificationType = 'NEW' | 'RESUBMISSION' | 'UPDATE'
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'REJECTED'
export type ReportTargetType = 'question' | 'article' | 'comment' | 'account'
export type PostKind = 'question' | 'article'
export type VoteValue = 1 | -1

export interface Passkey {
  id: string
  name: string
  createdAt: string
}

export interface Account {
  id: string
  email: string
  username: string
  displayName: string
  password: string
  bio: string
  avatar: string | null
  role: Role
  status: AccountStatus
  suspendedUntil: string | null // null khi SUSPENDED = vô thời hạn
  suspendReason: string | null
  twoFA: boolean
  passkeys: Passkey[]
  createdAt: string
}

export interface DoctorProfile {
  accountId: string
  title: string
  specialty: string
  workplace: string
  startYear: number
  license: string
  visible: boolean
  revoked: boolean
}

export interface VerificationEvent {
  at: string
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'REOPENED'
  status: VerificationStatus
  note: string
}

export interface Verification {
  id: string
  accountId: string
  type: VerificationType
  status: VerificationStatus
  license: string
  specialty: string
  title: string
  workplace: string
  startYear: number
  files: string[]
  reason: string | null
  createdAt: string
  decidedAt: string | null
  history: VerificationEvent[]
}

export interface Tag {
  id: string
  name: string
  createdAt: string
  deleted: boolean
}

export interface Post {
  id: string
  kind: PostKind
  authorId: string
  title: string
  body: string
  tagIds: string[]
  images: string[]
  status: ContentStatus
  createdAt: string
  editedAt: string | null
}

export interface Comment {
  id: string
  postId: string
  parentId: string | null
  authorId: string
  body: string
  images: string[]
  status: ContentStatus
  createdAt: string
  editedAt: string | null
}

export interface Revision {
  id: string
  targetType: 'post' | 'comment'
  targetId: string
  version: number
  title: string | null
  body: string
  images: string[]
  tagIds: string[]
  editorId: string
  createdAt: string
}

export interface Vote {
  accountId: string
  targetType: 'article' | 'comment'
  targetId: string
  value: VoteValue
}

export interface Bookmark {
  accountId: string
  postId: string
  createdAt: string
}

export interface Report {
  id: string
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  category: string
  severity: 'HIGH' | 'MEDIUM'
  reason: string
  status: ReportStatus
  createdAt: string
  handledBy: string | null
}

export type NotificationType =
  | 'COMMENT'
  | 'REPLY'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'VERIFICATION_REVOKED'
  | 'REPORT_RESOLVED'
  | 'REPORT_REJECTED'
  | 'REPORT_AGAINST_YOU_RESOLVED'

export interface Notification {
  id: string
  accountId: string
  type: NotificationType
  actorId: string | null
  title: string
  excerpt: string
  link: string
  read: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  actorId: string
  action: string
  target: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface Database {
  accounts: Account[]
  doctorProfiles: DoctorProfile[]
  verifications: Verification[]
  tags: Tag[]
  posts: Post[]
  comments: Comment[]
  revisions: Revision[]
  votes: Vote[]
  bookmarks: Bookmark[]
  reports: Report[]
  notifications: Notification[]
  auditLogs: AuditLog[]
}
