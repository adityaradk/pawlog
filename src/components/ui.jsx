import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, CalendarClock, CalendarDays, Check, ChevronRight, CircleSlash, Clock, EyeOff, Loader2, XCircle,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/Toasts'

// Status = color + icon + text, never color alone
const STATUS = {
  overdue: { label: 'Overdue', icon: AlertTriangle },
  today: { label: 'Today', icon: Clock },
  upcoming: { label: 'Upcoming', icon: CalendarDays },
  done: { label: 'Completed', icon: Check },
  due: { label: 'Due', icon: Clock },
  given: { label: 'Given', icon: Check },
  dismissed: { label: 'Dismissed – not recorded as given', icon: EyeOff },
  missed: { label: 'Missed – not given', icon: XCircle },
  scheduled: { label: 'Scheduled', icon: CalendarClock },
  ended: { label: 'Ended', icon: CircleSlash },
}

export function StatusBadge({ status, label }) {
  const s = STATUS[status]
  const Icon = s.icon
  return (
    <span className={`badge badge-${status}`}>
      <Icon size={14} aria-hidden />
      {label || s.label}
    </span>
  )
}

export function Field({ label, error, hint, optional, children }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errId = `${id}-err`
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(' ') || undefined
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="optional"> (optional)</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && <p className="hint" id={hintId}>{hint}</p>}
      {error && (
        <p className="error" id={errId}>
          <AlertTriangle size={14} aria-hidden /> {error}
        </p>
      )}
    </div>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading" role="status">
      <Loader2 size={20} className="spin" aria-hidden /> {label}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={36} aria-hidden className="empty-icon" />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            {i < items.length - 1 && <ChevronRight size={14} aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, busy }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onCancel} autoFocus>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export function ComingSoonButton({ children, className = 'btn', feature }) {
  const toast = useToast()
  return (
    <button type="button" className={className} onClick={() => toast({ tone: 'info', message: `${feature} is coming soon in a later version of PawLog.` })}>
      {children}
    </button>
  )
}

export function PetAvatar({ species, size = 'md' }) {
  return (
    <span className={`pet-avatar pet-avatar-${size}`} aria-hidden>
      {species === 'dog' ? '🐶' : '🐱'}
    </span>
  )
}

// Screens about one pet: asks the user to pick a pet if "All pets" is selected
export function PetGate({ children, what }) {
  const { pets, selectedPet, selectPet } = useApp()
  if (!pets) return <Loading />
  if (pets.length === 0) {
    return (
      <EmptyState
        title="Add a pet to get started"
        action={<Link className="btn btn-primary" to="/pets/new">Add a pet</Link>}
      >
        PawLog keeps {what} for each of your pets. Start by adding your first pet.
      </EmptyState>
    )
  }
  if (!selectedPet) {
    return (
      <div className="card">
        <h2 className="h3">Which pet?</h2>
        <p className="muted">{what[0].toUpperCase() + what.slice(1)} are shown one pet at a time. Choose a pet:</p>
        <div className="pet-choices">
          {pets.map((p) => (
            <button key={p.id} type="button" className="btn btn-large" onClick={() => selectPet(p.id)}>
              <PetAvatar species={p.species} /> {p.name}
            </button>
          ))}
        </div>
      </div>
    )
  }
  return children(selectedPet)
}
