import { Link, useSearchParams } from 'react-router-dom'
import { Bell, ClipboardList, Plus, Scale, Stethoscope, Syringe } from 'lucide-react'
import * as store from '../data/store'
import { dueLabel, formatDate } from '../data/dates'
import { formatWeight } from '../data/units'
import { useQuery } from '../state/AppContext'
import { EmptyState, Loading, PetGate } from '../components/ui'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'visit', label: 'Vet visits' },
  { key: 'vaccination', label: 'Vaccinations' },
  { key: 'weight', label: 'Weight' },
]

export const KIND_META = {
  visit: { label: 'Vet visit', icon: Stethoscope },
  vaccination: { label: 'Vaccination', icon: Syringe },
  weight: { label: 'Weight', icon: Scale },
}

function TimelineItem({ item }) {
  const meta = KIND_META[item.kind]
  const Icon = meta.icon
  if (item.kind === 'weight') {
    return (
      <li className="tl-item tl-weight">
        <span className="tl-icon" aria-hidden><Icon size={18} /></span>
        <div className="tl-body">
          <p className="tl-date">{formatDate(item.date, { weekday: true })}</p>
          <p className="tl-title">
            <span className="tl-kind">Weight</span> <Link to="/weight">{formatWeight(item.value, item.unit)}</Link>
          </p>
        </div>
      </li>
    )
  }
  return (
    <li className={`tl-item tl-${item.kind}`}>
      <span className="tl-icon" aria-hidden><Icon size={18} /></span>
      <div className="tl-body">
        <p className="tl-date">{formatDate(item.date, { weekday: true })}</p>
        <p className="tl-title">
          <span className="tl-kind">{meta.label}</span> <Link to={`/records/${item.id}`}>{item.title}</Link>
        </p>
        {item.clinic && <p className="muted small">{item.clinic}</p>}
        {item.notes && <p className="tl-notes">{item.notes}</p>}
        {item.followUp && (
          <p className="tl-followup">
            <Bell size={14} aria-hidden /> Follow-up: <Link to={`/tasks/${item.followUp.id}`}>{item.followUp.title}</Link>
            {' · '}{item.followUp.completedAt ? 'Completed' : `${dueLabel(item.followUp.dueDate)} (${formatDate(item.followUp.dueDate)})`}
          </p>
        )}
      </div>
    </li>
  )
}

function TimelineFor({ pet }) {
  const [params, setParams] = useSearchParams()
  const filter = FILTERS.some((f) => f.key === params.get('type')) ? params.get('type') : 'all'
  const { data } = useQuery(() => store.getTimeline(pet.id), [pet.id])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{pet.name}’s health timeline</h1>
          <p className="lead">Vet visits, vaccinations and weights, newest first.</p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-primary" to="/records/new"><Plus size={18} aria-hidden /> Add record</Link>
        </div>
      </div>

      <div className="chips" role="group" aria-label="Filter by type">
        {FILTERS.map((f) => {
          const count = data ? (f.key === 'all' ? data.length : data.filter((i) => i.kind === f.key).length) : null
          return (
            <button
              key={f.key}
              type="button"
              className="chip"
              aria-pressed={filter === f.key}
              onClick={() => setParams(f.key === 'all' ? {} : { type: f.key }, { replace: true })}
            >
              {f.label}{count !== null && <span className="chip-count">{count}</span>}
            </button>
          )
        })}
      </div>

      {!data ? (
        <Loading label="Loading timeline…" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={`No records for ${pet.name} yet`}
          action={<Link className="btn btn-primary" to="/records/new"><Plus size={18} aria-hidden /> Add a vet visit or vaccination</Link>}
        >
          Add past vet visits and vaccinations so you can find dates and notes later. You can attach a follow-up reminder to each one.
        </EmptyState>
      ) : (
        (() => {
          const items = filter === 'all' ? data : data.filter((i) => i.kind === filter)
          if (items.length === 0) {
            const label = FILTERS.find((f) => f.key === filter).label.toLowerCase()
            return (
              <EmptyState title={`No ${label} yet`} action={filter === 'weight'
                ? <Link className="btn" to="/weight">Log a weight</Link>
                : <Link className="btn" to={`/records/new?type=${filter}`}>Add one</Link>}
              >
                Nothing matches this filter. <button type="button" className="link-btn" onClick={() => setParams({}, { replace: true })}>Show all records</button>
              </EmptyState>
            )
          }
          return <ol className="timeline">{items.map((i) => <TimelineItem key={i.id} item={i} />)}</ol>
        })()
      )}
    </>
  )
}

export default function Timeline() {
  return <PetGate what="health records">{(pet) => <TimelineFor pet={pet} />}</PetGate>
}
