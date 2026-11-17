// Giới hạn độ dài và số lượng theo SRS (NFR-06.13 và các REQ liên quan).
export const LIMITS = {
  title: 300,
  questionBody: 10_000,
  articleBody: 50_000,
  commentBody: 2_000,
  displayName: 100,
  bio: 500,
  usernameMin: 3,
  displayNameMin: 3,
  passkeyName: 50,
  license: 50,
  specialty: 100,
  workplace: 200,
  usernameMax: 50,
  passwordMin: 8,
  passwordMax: 64,
  questionImages: 5,
  articleImages: 20,
  commentImages: 3,
  verificationFiles: 5,
  fileSizeMB: 10,
  reason: 1000,
  tagName: 100,
  passkeys: 10,
  pageSize: 20,
  feedPage: 6,
} as const

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'Vừa xong'
  if (min < 60) return `${min} phút trước`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} ngày trước`
  return formatDate(iso)
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function excerpt(markdown: string, max = 180): string {
  const text = markdown
    .replace(/[#>*_`[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  return `${name.slice(0, 1)}***@${domain}`
}

export function maskLicense(license: string): string {
  return `********${license.replace(/\D/g, '').slice(-4)}`
}

/** Tập 19 ký tự đặc biệt theo NFR-04.2. */
export const SPECIAL_CHARS = '! @ # $ % ^ & * , . / < > ? - _ = + ~'
const SPECIAL_RE = /[!@#$%^&*,./<>?\-_=+~]/

/** NFR-04.2: 8–64 ký tự, có chữ thường, chữ hoa, chữ số và ký tự đặc biệt. */
export function passwordChecks(pw: string) {
  const length = pw.length >= LIMITS.passwordMin && pw.length <= LIMITS.passwordMax
  const lower = /[a-z]/.test(pw)
  const upper = /[A-Z]/.test(pw)
  const digit = /\d/.test(pw)
  const special = SPECIAL_RE.test(pw)
  const passed = [length, lower, upper, digit, special].filter(Boolean).length
  const valid = passed === 5
  return { length, lower, upper, digit, special, valid, passed, strong: valid && pw.length >= 12 }
}

/** Ảnh minh hoạ giả lập (SVG data URL) dùng cho dữ liệu mẫu. */
export function placeholderImage(label: string, hue = 210): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="hsl(${hue} 45% 88%)"/><rect x="24" y="24" width="592" height="372" rx="12" fill="none" stroke="hsl(${hue} 40% 55%)" stroke-width="2" stroke-dasharray="8 8"/><text x="320" y="216" text-anchor="middle" font-family="sans-serif" font-size="26" fill="hsl(${hue} 45% 28%)">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Kiểm tra định dạng / dung lượng (CI-05) rồi thu nhỏ ảnh để lưu được trong localStorage. */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED.includes(file.type)) {
      reject(new Error(`"${file.name}": định dạng không được hỗ trợ. Chỉ nhận JPEG, PNG, WEBP hoặc GIF tĩnh.`))
      return
    }
    if (file.size > LIMITS.fileSizeMB * 1024 * 1024) {
      reject(new Error(`"${file.name}": dung lượng vượt quá ${LIMITS.fileSizeMB}MB.`))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Không đọc được tệp "${file.name}".`))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error(`"${file.name}" không phải ảnh hợp lệ.`))
      img.onload = () => {
        const scale = Math.min(1, 640 / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
