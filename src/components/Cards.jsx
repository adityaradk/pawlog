import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, EyeOff, FileText, Pill, Syringe } from 'lucide-react'
import * as store from '../data/store'
import { diffDays, dueLabel, formatDate, formatTime, hourLabel, todayISO } from '../data/dates'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/Toasts'
import { StatusBadge } from './ui'

const KIND = {
  'follow-up': { label: 'Follow-up', icon: Bell },
  vaccine: { label: 'Vaccine', icon: Syringe },
  care: { label: 'Care', icon: Bell },
}

export function taskStatus(task) {
  if (task.completedAt) return 'done'
  const n = diffDays(task.dueDate, todayISO())
  return n < 0 ? 'overdue' : n === 0 ? 'today' : 'upcoming'
}

export function useTaskActions() {
  const { refresh } = useApp()
  const toast = useToast()
  return {
    async complete(task) {
      await store.completeTask(task.id)
      refresh()
      toast({
        message: `Marked “${task.title}” complete.`,
        action: { label: 'Undo', onClick: async () => { await store.reopenTask(task.id); refresh() } },
      })
    },
    async reopen(task) {
      await store.reopenTask(task.id)
      refresh()
      toast({ tone: 'info', message: `“${task.title}” is open again.` })
    },
  }
}

export function TaskCard({ task, showPet }) {
  const { complete } = useTaskActions()
  const [busy, setBusy] = useState(false)
  const kind = KIND[task.kind] || KIND.care
  const Icon = kind.icon
  const status = taskStatus(task)
  return (
    <article className={`item item-${status}`}>
      <span className="item-icon" aria-hidden><Icon size={20} /></span>
      <div className="item-body">
        <div className="item-top">
          <span className="item-kind">{kind.label}{showPet && ` · ${task.petName}`}</span>
          <StatusBadge status={status} />
        </div>
        <h3 className="item-title">
          <Link to={`/tasks/${task.id}`}>{task.title}</Link>
        </h3>
        <p className="item-meta">
          <strong>{dueLabel(task.dueDate)}</strong> · {formatDate(task.dueDate, { weekday: true })}
        </p>
        <div className="item-actions">
          <button
            type="button"
            className="btn btn-primary btn-small"
            disabled={busy}
            onClick={async () => { setBusy(true); await complete(task); setBusy(false) }}
          >
            <Check size={16} aria-hidden /> Mark complete
          </button>
          {task.sourceRecordId ? (
            <Link className="btn btn-small" to={`/records/${task.sourceRecordId}`}>
              <FileText size={16} aria-hidden /> Open record
            </Link>
          ) : (
            <Link className="btn btn-small" to={`/tasks/${task.id}`}>Details</Link>
          )}
        </div>
      </div>
    </article>
  )
}

export function useDoseActions() {
  const { refresh } = useApp()
  const toast = useToast()
  const undo = (dose) => ({ label: 'Undo', onClick: async () => { await store.clearDose(dose.medicationId, dose.key); refresh() } })
  return {
    async give(dose) {
      const log = await store.logDose(dose.medicationId, dose.key, 'given')
      refresh()
      toast({ message: `${dose.medName} (${dose.slotName.toLowerCase()}) recorded as given at ${formatTime(log.at)}.`, action: undo(dose) })
    },
    async dismiss(dose) {
      await store.logDose(dose.medicationId, dose.key, 'dismissed')
      refresh()
      toast({ tone: 'info', message: `Reminder dismissed – ${dose.medName} was NOT recorded as given.`, action: undo(dose) })
    },
  }
}

export function DoseCard({ dose, showPet, compact }) {
  const { give, dismiss } = useDoseActions()
  const [busy, setBusy] = useState(false)
  const run = (fn) => async () => {
    if (busy) return
    setBusy(true)
    await fn(dose)
    setBusy(false)
  }
  const done = dose.status === 'given' || dose.status === 'dismissed'
  return (
    <article className={`item item-${done ? dose.status : 'today'}`}>
      <span className="item-icon" aria-hidden><Pill size={20} /></span>
      <div className="item-body">
        <div className="item-top">
          <span className="item-kind">Medication dose{showPet && ` · ${dose.petName}`}</span>
          <StatusBadge status={dose.status} label={dose.status === 'given' ? `Given at ${formatTime(dose.loggedAt)}` : undefined} />
        </div>
        <h3 className="item-title">
          <Link to={`/medications/${dose.medicationId}`}>{dose.medName}</Link> · {dose.slotName} dose
        </h3>
        <p className="item-meta">
          {done ? <>Scheduled for {hourLabel(dose.hour)}</> : <><strong>Due today</strong> · {hourLabel(dose.hour)}</>}
          {!compact && <><br /><span className="instructions">{dose.instructions}</span></>}
        </p>
        {!done && (
          <>
            <div className="item-actions">
              <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={run(give)}>
                <Check size={16} aria-hidden /> Mark as given
              </button>
              <button type="button" className="btn btn-small" disabled={busy} onClick={run(dismiss)}>
                <EyeOff size={16} aria-hidden /> Dismiss
              </button>
            </div>
            <p className="hint">“Dismiss” only hides the reminder. It does not record the dose as given.</p>
          </>
        )}
      </div>
    </article>
  )
}
