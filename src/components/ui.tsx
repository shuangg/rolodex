import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import type { CheckInStatus, Circle, Person } from '../../server/lib/types'
import { avatarColor, initials, STATUS_LABEL } from '../lib/format'

export function Avatar({
  name,
  photo,
  size = '',
  title,
}: {
  name: string
  photo?: string | null
  size?: '' | 'sm' | 'lg' | 'xl'
  title?: string
}) {
  const cls = size ? `avatar avatar-${size}` : 'avatar'
  if (photo) {
    return <div className={cls} title={title ?? name} style={{ backgroundImage: `url(${photo})` }} />
  }
  return (
    <div className={cls} title={title ?? name} style={{ background: avatarColor(name) }}>
      {initials(name)}
    </div>
  )
}

export function StatusBadge({ status, title }: { status: CheckInStatus; title?: string }) {
  return (
    <span className={`badge status-${status}`} title={title}>
      <span className="dot" />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function CircleChip({ circle, onClick }: { circle: Circle; onClick?: () => void }) {
  const label = { inner: 'Inner', close: 'Close', wider: 'Wider', distant: 'Distant' }[circle]
  return (
    <span
      className={`chip circle-${circle}${onClick ? ' chip-clickable' : ''}`}
      onClick={onClick}
      title={onClick ? `Filter by ${label} circle` : undefined}
    >
      {label}
    </span>
  )
}

export function Modal({
  title,
  icon,
  onClose,
  children,
  footer,
  large,
}: {
  title: string
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  large?: boolean
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${large ? ' modal-lg' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>
            {icon}
            {title}
          </h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <div>{children}</div>
    </div>
  )
}

export function personPhotoStyle(p: Person): React.CSSProperties {
  if (p.photo) return { backgroundImage: `url(${p.photo})` }
  return { background: avatarColor(p.name) }
}
