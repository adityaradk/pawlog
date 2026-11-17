import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bell, Pencil, Plus, Trash2 } from 'lucide-react'
import * as store from '../data/store'
import { dueLabel, formatDate } from '../data/dates'
import { formatWeight } from '../data/units'
import { useApp, useQuery } from '../state/AppContext'
import { useToast } from '../state/Toasts'
import { taskStatus } from '../components/Cards'
import { Breadcrumbs, ConfirmDialog, Loading, StatusBadge } from '../components/ui'
import { KIND_META } from './Timeline'
import { MissingRecord } from './RecordForm'

export default function RecordDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refresh } = useApp()
  const toast = useToast()
  const { data: record } = useQuery(() => store.getRecord(id), [id])
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  if (record === undefined) return <Loading />
  if (!record) return <MissingRecord />

  const meta = KIND_META[record.type]
  const Icon = meta.icon
  const fu = record.followUp

  async function remove() {
    setBusy(true)
    await store.deleteHealthEvent(record.id)
    refresh()
    navigate('/timeline')
    toast({ message: `${meta.label} “${record.title}” deleted${fu ? `, along with its follow-up “${fu.title}”` : ''}.` })
  }

  return (
    <>
      <Breadcrumbs items={[{ label: `${record.petName}’s timeline`, to: '/timeline' }, { label: record.title }]} />
      <div className="page-head">
        <div>
          <p className="eyebrow"><Icon size={16} aria-hidden /> {meta.label} · {record.petName}</p>
          <h1>{record.title}</h1>
          <p className="lead">{formatDate(record.date, { weekday: true })}{record.clinic && ` · ${record.clinic}`}</p>
        </div>
        <div className="head-actions">
          <Link className="btn" to={`/records/${record.id}/edit`}><Pencil size={16} aria-hidden /> Edit</Link>
          <button type="button" className="btn btn-danger-outline" onClick={() => setConfirming(true)}>
            <Trash2 size={16} aria-hidden /> Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <section className="card">
          <h2 className="h3">Notes</h2>
          {record.notes ? <p className="pre">{record.notes}</p> : <p className="muted">No notes added.</p>}
          <h2 className="h3">Weight</h2>
          {record.weight ? (
            <p>{formatWeight(record.weight.value, record.weight.unit)} · <Link to="/weight">See weight history</Link></p>
          ) : (
            <p className="muted">No weight logged with this record.</p>
          )}
        </section>

        <section className="card followup-card" aria-labelledby="fu-title">
          <h2 id="fu-title" className="h3"><Bell size={18} aria-hidden /> Follow-up reminder</h2>
          {fu ? (
            <>
              <p className="fu-name"><Link to={`/tasks/${fu.id}`}>{fu.title}</Link></p>
              <p>
                <StatusBadge status={taskStatus(fu)} />{' '}
                {fu.completedAt ? `Completed ${formatDate(fu.completedAt.slice(0, 10))}` : `${dueLabel(fu.dueDate)} · ${formatDate(fu.dueDate, { weekday: true })}`}
              </p>
              <Link className="btn btn-small" to={`/tasks/${fu.id}`}>Open task</Link>
            </>
          ) : (
            <>
              <p className="muted">No follow-up for this record.</p>
              <Link className="btn btn-small" to={`/records/${record.id}/edit?followup=1`}><Plus size={16} aria-hidden /> Add a follow-up</Link>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Delete this ${meta.label.toLowerCase()}?`}
        confirmLabel={fu ? 'Delete record and follow-up' : 'Delete record'}
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      >
        <p>“{record.title}” from {formatDate(record.date)} will be permanently removed from {record.petName}’s timeline. This can’t be undone.</p>
        {fu && (
          <p className="warning-box">
            <Bell size={16} aria-hidden /> This record has a linked follow-up, <strong>“{fu.title}”</strong> ({fu.completedAt ? 'completed' : `due ${formatDate(fu.dueDate)}`}). It will be deleted too.
          </p>
        )}
        {record.weight && <p className="muted small">The weight logged with it ({formatWeight(record.weight.value, record.weight.unit)}) will stay in the weight history.</p>}
      </ConfirmDialog>
    </>
  )
}
