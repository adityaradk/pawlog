import { Link, useParams } from 'react-router-dom'
import { Check, FileText, RotateCcw } from 'lucide-react'
import * as store from '../data/store'
import { dueLabel, formatDate, formatDateTime } from '../data/dates'
import { useQuery } from '../state/AppContext'
import { taskStatus, useTaskActions } from '../components/Cards'
import { Breadcrumbs, Loading, StatusBadge } from '../components/ui'
import { KIND_META } from './Timeline'

export default function TaskDetail() {
  const { id } = useParams()
  const { data: task } = useQuery(() => store.getTask(id), [id])
  const { complete, reopen } = useTaskActions()

  if (task === undefined) return <Loading />
  if (!task) {
    return (
      <div className="card">
        <h1>Task not found</h1>
        <p>This task may have been deleted together with its record.</p>
        <Link className="btn" to="/">Back to dashboard</Link>
      </div>
    )
  }

  const status = taskStatus(task)
  const src = task.source

  return (
    <>
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/' }, { label: task.title }]} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Task · {task.petName}</p>
          <h1>{task.title}</h1>
        </div>
      </div>

      <section className="card task-card">
        <p><StatusBadge status={status} /></p>
        <dl className="facts">
          <div>
            <dt>Due</dt>
            <dd>{formatDate(task.dueDate, { weekday: true })} <span className="muted">({task.completedAt ? 'completed' : dueLabel(task.dueDate).toLowerCase()})</span></dd>
          </div>
          {task.completedAt && (
            <div>
              <dt>Completed</dt>
              <dd>{formatDateTime(task.completedAt)}</dd>
            </div>
          )}
          <div>
            <dt>Created from</dt>
            <dd>
              {src ? (
                <Link to={`/records/${src.id}`}>
                  <FileText size={16} aria-hidden /> {KIND_META[src.type].label}, {formatDate(src.date)}: {src.title}
                </Link>
              ) : (
                <span className="muted">Added as a reminder (not linked to a record)</span>
              )}
            </dd>
          </div>
        </dl>
        <div className="form-actions start">
          {task.completedAt ? (
            <button type="button" className="btn" onClick={() => reopen(task)}><RotateCcw size={16} aria-hidden /> Reopen task</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => complete(task)}><Check size={16} aria-hidden /> Mark complete</button>
          )}
          {src && <Link className="btn" to={`/records/${src.id}`}>Open record</Link>}
        </div>
      </section>
    </>
  )
}
