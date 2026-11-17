/* eslint-disable react/only-export-components */
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, ShieldAlert, X } from 'lucide-react'
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { create } from 'zustand'
import { cn } from '../lib/utils'
import { ApiError } from '../mock/store'

// ---------- Button ----------
type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary-700 text-white hover:bg-primary-600 active:bg-primary-800',
  // Secondary dùng teal-700 (5,47:1 với chữ trắng) theo quyết định ngày 17/11/2026.
  secondary: 'bg-teal-700 text-white hover:bg-teal-800',
  outline: 'border border-primary-700 text-primary-700 bg-white hover:bg-primary-50',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
  ghost: 'text-neutral-700 hover:bg-neutral-100',
}
const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-caption',
  md: 'h-10 px-4 text-body-md font-semibold',
  lg: 'h-12 px-6 text-body-lg font-semibold',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  full?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, icon, full, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'touch-target inline-flex shrink-0 items-center justify-center gap-2 rounded-md whitespace-nowrap transition-colors duration-150 active:scale-[0.98]',
        'disabled:border-neutral-300 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:active:scale-100',
        VARIANT[variant],
        SIZE[size],
        full && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-md text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 disabled:text-neutral-400', className)}
    >
      {children}
    </button>
  )
}

// ---------- Form fields ----------
interface FieldShell {
  label?: string
  required?: boolean
  hint?: ReactNode
  error?: string | null
  max?: number
  length?: number
}

function FieldWrap({ id, label, required, hint, error, max, length, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-2 block text-body-md font-medium text-neutral-900">
          {label} {required && <span className="text-danger-600" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {(hint || error || max !== undefined) && (
        <div className="mt-1 flex items-start justify-between gap-3 text-caption">
          <p id={`${id}-help`} className={error ? 'flex items-center gap-1 text-danger-700' : 'text-neutral-500'} role={error ? 'alert' : undefined}>
            {error && <AlertTriangle className="size-3.5 shrink-0" aria-hidden />}
            {error ?? hint}
          </p>
          {max !== undefined && (
            <span className={cn('shrink-0 tabular-nums', (length ?? 0) > max ? 'text-danger-700' : 'text-neutral-500')}>
              {(length ?? 0).toLocaleString('vi-VN')}/{max.toLocaleString('vi-VN')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

const INPUT_BASE =
  'w-full rounded-md border bg-white px-3 text-body-lg text-neutral-900 placeholder:text-neutral-500 transition-colors duration-150 md:text-body-md ' +
  'hover:border-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-3 focus:ring-primary-500/15 ' +
  'disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-500'

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'max'>, FieldShell {
  prefix?: ReactNode
  suffix?: ReactNode
}

export function TextInput({ label, required, hint, error, max, prefix, suffix, className, id, ...rest }: TextInputProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldWrap id={fid} label={label} required={required} hint={hint} error={error} max={max} length={String(rest.value ?? '').length}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500">{prefix}</span>}
        <input
          id={fid}
          aria-invalid={!!error}
          aria-describedby={`${fid}-help`}
          required={required}
          {...rest}
          // Viền neutral-500 để đạt tương phản 3:1 cho thành phần giao diện (WCAG 1.4.11).
          className={cn(INPUT_BASE, 'h-12 md:h-11', error ? 'border-danger-600' : 'border-neutral-500', !!prefix && 'pl-9', !!suffix && 'pr-12', className)}
        />
        {suffix && <span className="absolute inset-y-0 right-1 flex items-center">{suffix}</span>}
      </div>
    </FieldWrap>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldShell {
  ref?: React.Ref<HTMLTextAreaElement>
}

export function Textarea({ label, required, hint, error, max, className, id, ref, ...rest }: TextareaProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldWrap id={fid} label={label} required={required} hint={hint} error={error} max={max} length={String(rest.value ?? '').length}>
      <textarea
        ref={ref}
        id={fid}
        aria-invalid={!!error}
        aria-describedby={`${fid}-help`}
        required={required}
        {...rest}
        className={cn(INPUT_BASE, 'min-h-24 py-3', error ? 'border-danger-600' : 'border-neutral-500', className)}
      />
    </FieldWrap>
  )
}

export function Select({ label, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-body-md text-neutral-700">
      <span className="shrink-0">{label}</span>
      <select {...rest} className={cn(INPUT_BASE, 'h-11 w-auto border-neutral-500 pr-8', className)}>
        {children}
      </select>
    </label>
  )
}

// ---------- Overlays ----------
function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const node = ref.current
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? [])
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Tab') {
        const list = focusables()
        if (list.length === 0) return
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return ref
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'neutral' | 'danger'
  children: ReactNode
  footer?: ReactNode
}

const MODAL_W = { sm: 'md:max-w-[480px]', md: 'md:max-w-[640px]', lg: 'md:max-w-[960px]' }

/** Desktop: hộp thoại giữa màn. Mobile: bottom sheet (lg thành toàn màn) theo Mobile-Responsive-Specs mục III. */
export function Modal({ open, onClose, title, size = 'md', tone = 'neutral', children, footer }: ModalProps) {
  const ref = useOverlay(open, onClose)
  const titleId = useId()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'anim-up md:anim-pop relative flex max-h-[90dvh] w-full flex-col rounded-t-xl bg-white shadow-lg md:max-h-[80dvh] md:rounded-xl',
          size === 'lg' && 'h-dvh max-h-dvh rounded-none md:h-auto',
          MODAL_W[size],
        )}
      >
        <header className="flex items-center justify-between gap-4 border-b border-neutral-200 py-3 pr-2 pl-4 md:pl-8">
          <h2 id={titleId} className={cn('flex items-center gap-2 text-h3', tone === 'danger' ? 'text-danger-700' : 'text-neutral-900')}>
            {tone === 'danger' && <ShieldAlert className="size-5 shrink-0" aria-hidden />}
            {title}
          </h2>
          <IconButton label="Đóng" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
        {footer && <footer className="flex flex-col-reverse gap-3 border-t border-neutral-200 p-4 md:flex-row md:justify-end md:px-8">{footer}</footer>}
      </div>
    </div>
  )
}

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  side?: 'right' | 'left' | 'bottom'
  children: ReactNode
  footer?: ReactNode
  width?: string
}

export function Drawer({ open, onClose, title, side = 'right', children, footer, width = 'md:w-[720px]' }: DrawerProps) {
  const ref = useOverlay(open, onClose)
  const titleId = useId()
  if (!open) return null
  const position = {
    right: `right-0 top-0 h-dvh w-full ${width} anim-right`,
    left: 'left-0 top-0 h-dvh w-[300px] max-w-[80vw] anim-left',
    bottom: 'bottom-0 left-0 max-h-[80dvh] w-full rounded-t-xl anim-up',
  }[side]
  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <aside ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn('absolute flex flex-col bg-white shadow-xl', position)}>
        <header className="flex items-center justify-between gap-4 border-b border-neutral-200 py-3 pr-2 pl-4 md:pl-8">
          <h2 id={titleId} className="text-h3 text-neutral-900">{title}</h2>
          <IconButton label="Đóng" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
        {footer && <footer className="border-t border-neutral-200 p-4 md:px-8">{footer}</footer>}
      </aside>
    </div>
  )
}

// ---------- Toast ----------
type ToastType = 'success' | 'danger' | 'warning'
interface ToastItem {
  id: number
  type: ToastType
  message: string
  action?: { label: string; onClick: () => void }
}
const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }))
let toastSeq = 0
function pushToast(type: ToastType, message: string, action?: ToastItem['action']) {
  const id = ++toastSeq
  useToasts.setState((s) => ({ items: [...s.items, { id, type, message, action }] }))
  setTimeout(() => dismissToast(id), 4000)
}
const dismissToast = (id: number) => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }))
export const toast = {
  success: (m: string, action?: ToastItem['action']) => pushToast('success', m, action),
  error: (m: string) => pushToast('danger', m),
  warning: (m: string) => pushToast('warning', m),
}
const TOAST_STYLE: Record<ToastType, { border: string; icon: ReactNode }> = {
  success: { border: 'border-l-success-600', icon: <CheckCircle2 className="size-5 text-success-700" aria-hidden /> },
  danger: { border: 'border-l-danger-600', icon: <AlertTriangle className="size-5 text-danger-700" aria-hidden /> },
  warning: { border: 'border-l-warning-600', icon: <ShieldAlert className="size-5 text-warning-700" aria-hidden /> },
}
export function Toaster() {
  const items = useToasts((s) => s.items)
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-[1200] flex flex-col gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:w-[360px]">
      {items.map((t) => (
        <div key={t.id} className={cn('pointer-events-auto flex items-center gap-3 rounded-md border border-l-4 border-neutral-200 bg-white p-3 shadow-lg', TOAST_STYLE[t.type].border)}>
          {TOAST_STYLE[t.type].icon}
          <p className="flex-1 text-body-md text-neutral-900">{t.message}</p>
          {t.action && (
            <button type="button" className="text-body-md font-semibold text-primary-500 underline" onClick={t.action.onClick}>
              {t.action.label}
            </button>
          )}
          <IconButton label="Đóng thông báo" className="size-8" onClick={() => dismissToast(t.id)}>
            <X className="size-4" />
          </IconButton>
        </div>
      ))}
    </div>
  )
}

/** Chạy một thao tác mock-API: quản lý loading, hiển thị lỗi bằng toast và trả lỗi về cho form. */
export function useAction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const run = useCallback(async <T,>(fn: () => Promise<T>, opts: { silent?: boolean } = {}): Promise<T | undefined> => {
    setLoading(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(500, 'INTERNAL', e instanceof Error ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.')
      setError(err)
      if (!opts.silent) toast.error(err.message)
      return undefined
    } finally {
      setLoading(false)
    }
  }, [])
  return { loading, error, run, clearError: () => setError(null) }
}

/** Giả lập thời gian tải dữ liệu lần đầu để hiển thị Skeleton. */
export function useFakeLoading(key: string, ms = 450) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
  }, [key, ms])
  return loading
}

// ---------- Display ----------
export function Avatar({ name, src, size = 40, ring }: { name: string; src?: string | null; size?: number; ring?: boolean }) {
  const initials = name.replace(/^(BS\.\S*|Bác sĩ)\s*/i, '').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase()
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-800', ring && 'ring-2 ring-badge-gold')}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      aria-hidden
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials || '?'}
    </span>
  )
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'
const TONE: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-primary-100 text-primary-800',
}
export function Badge({ tone = 'neutral', children, icon }: { tone?: Tone; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-caption whitespace-nowrap', TONE[tone])}>
      {icon}
      {children}
    </span>
  )
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn('rounded-lg border border-neutral-200 bg-white p-4 shadow-sm md:p-6', className)}>
      {children}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: Array<{ value: T; label: string; count?: number }>; className?: string }) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-neutral-200', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            'h-11 shrink-0 border-b-2 px-4 text-body-md font-semibold whitespace-nowrap transition-colors duration-150',
            value === it.value ? 'border-primary-700 text-primary-700' : 'border-transparent text-neutral-700 hover:bg-neutral-100',
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="ml-1 font-normal">({it.count})</span>}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <span className="text-neutral-400 [&>svg]:size-16">{icon}</span>
      <h3 className="mt-4 text-h3 text-neutral-900">{title}</h3>
      {description && <p className="mt-2 max-w-md text-body-md text-neutral-700">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-md bg-danger-100 p-3 text-body-md text-danger-700">
      <AlertTriangle className="size-5 shrink-0" aria-hidden />
      <p className="flex-1">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}

export function InfoBox({ icon, children, tone = 'info' }: { icon?: ReactNode; children: ReactNode; tone?: 'info' | 'warning' | 'danger' }) {
  const style = { info: 'border-primary-200 bg-primary-50 text-neutral-700', warning: 'border-warning-600 bg-warning-100 text-warning-700', danger: 'border-danger-600 bg-danger-100 text-danger-700' }[tone]
  return (
    <div className={cn('flex gap-3 rounded-md border p-3 text-body-md md:p-4', style)}>
      {icon && <span className="mt-0.5 shrink-0 [&>svg]:size-5">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 md:p-6" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="skeleton size-10 rounded-full" />
        <div className="skeleton h-3.5 w-40" />
      </div>
      <div className="skeleton mt-4 h-5 w-4/5" />
      <div className="skeleton mt-3 h-3.5 w-full" />
      <div className="skeleton mt-2 h-3.5 w-2/3" />
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-6 w-16" />
        <div className="skeleton h-6 w-16" />
        <div className="skeleton h-6 w-16" />
      </div>
    </div>
  )
}
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function Pagination({ page, pageCount, onChange, summary }: { page: number; pageCount: number; onChange: (p: number) => void; summary?: string }) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Phân trang">
      <p className="text-body-md text-neutral-700">{summary}</p>
      <div className="flex items-center gap-2">
        <IconButton label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)} className="border border-neutral-300">
          <ChevronLeft className="size-5" />
        </IconButton>
        <span className="min-w-16 text-center text-body-md font-semibold tabular-nums">
          {page} / {Math.max(1, pageCount)}
        </span>
        <IconButton label="Trang sau" disabled={page >= pageCount} onClick={() => onChange(page + 1)} className="border border-neutral-300">
          <ChevronRight className="size-5" />
        </IconButton>
      </div>
    </nav>
  )
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-body-md text-neutral-700">
      {items.map((it, i) => (
        <span key={it}>
          {i > 0 && <span className="mx-2 text-neutral-500" aria-hidden>›</span>}
          <span className={i === items.length - 1 ? 'font-semibold text-neutral-900' : undefined}>{it}</span>
        </span>
      ))}
    </nav>
  )
}

export function Spinner() {
  return <Loader2 className="size-5 animate-spin text-primary-500" aria-label="Đang tải" />
}
