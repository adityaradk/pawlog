import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, PawPrint, Pill, Plus, Scale } from 'lucide-react'
import * as store from '../data/store'
import { diffDays, formatDate, todayISO } from '../data/dates'
import { useApp, useQuery } from '../state/AppContext'
import { DoseCard, TaskCard, useTaskActions } from '../components/Cards'
import { EmptyState, Loading, StatusBadge } from '../components/ui'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function Group({ icon: Icon, title, tone, count, emptyText, children }) {
  return (
    <section className={`group group-${tone}`} aria-labelledby={`group-${tone}`}>
      <h2 id={`group-${tone}`} className="group-title">
        <Icon size={20} aria-hidden /> {title} <span className="count" aria-label={`${count} items`}>{count}</span>
      </h2>
      {count === 0 ? <p className="group-empty">{emptyText}</p> : <div className="items">{children}</div>}
    </section>
  )
}

export default function Dashboard() {
  const { user, pets, selectedPetId, selectedPet } = useApp()
  const petId = selectedPetId || 'all'
  const tasks = useQuery(() => store.getTasks(petId), [petId])
  const doses = useQuery(() => store.getDosesForDate(petId), [petId])
  const { reopen } = useTaskActions()
  const [showDone, setShowDone] = useState(false)

  if (pets && pets.length === 0) {
    return (
      <>
        <h1>{greeting()}, {user.name}</h1>
        <EmptyState
          icon={PawPrint}
          title="Welcome to PawLog!"
          action={<Link className="btn btn-primary" to="/pets/new"><Plus size={18} aria-hidden /> Add your first pet</Link>}
        >
          Add your cat or dog to start keeping vet visits, vaccinations, medications and weights in one place.
        </EmptyState>
      </>
    )
  }

  if (!tasks.data || !doses.data || !pets) return <Loading label="Loading your dashboard…" />

  const today = todayISO()
  const open = tasks.data.filter((t) => !t.completedAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const overdue = open.filter((t) => t.dueDate < today)
  const dueToday = open.filter((t) => t.dueDate === today)
  const upcoming = open.filter((t) => t.dueDate > today)
  const pendingDoses = doses.data.filter((d) => d.status === 'due')
  const doneDoses = doses.data.filter((d) => d.status === 'given' || d.status === 'dismissed')
  const doneTasks = tasks.data.filter((t) => t.completedAt && diffDays(today, t.completedAt.slice(0, 10)) <= 7)
  const showPet = petId === 'all'
  const who = selectedPet ? selectedPet.name : 'your pets'
  const todayCount = dueToday.length + pendingDoses.length

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{formatDate(today, { weekday: true })}</p>
          <h1>{greeting()}, {user.name}</h1>
          <p className="lead">
            {overdue.length + todayCount === 0
              ? `${who === 'your pets' ? 'Your pets are' : `${who} is`} all caught up for today.`
              : `Here’s what ${who} need${who === 'your pets' ? '' : 's'} next.`}
          </p>
        </div>
      </div>

      <div className="quick-actions" aria-label="Quick actions">
        <Link className="btn" to="/records/new"><Plus size={18} aria-hidden /> Add vet visit or vaccine</Link>
        <Link className="btn" to="/weight"><Scale size={18} aria-hidden /> Log weight</Link>
        <Link className="btn" to="/medications/new"><Pill size={18} aria-hidden /> Add medication</Link>
      </div>

      <div className="groups">
        <Group icon={AlertTriangle} title="Overdue" tone="overdue" count={overdue.length} emptyText="Nothing overdue. Nice work!">
          {overdue.map((t) => <TaskCard key={t.id} task={t} showPet={showPet} />)}
        </Group>
        <Group icon={Clock} title="Today" tone="today" count={todayCount} emptyText="Nothing else due today.">
          {pendingDoses.map((d) => <DoseCard key={`${d.medicationId}${d.key}`} dose={d} showPet={showPet} />)}
          {dueToday.map((t) => <TaskCard key={t.id} task={t} showPet={showPet} />)}
        </Group>
        <Group icon={CalendarDays} title="Upcoming" tone="upcoming" count={upcoming.length} emptyText="Nothing scheduled yet. Add a follow-up when you save a vet visit.">
          {upcoming.map((t) => <TaskCard key={t.id} task={t} showPet={showPet} />)}
        </Group>
      </div>

      <section className="done-section" aria-labelledby="done-title">
        <h2 id="done-title" className="group-title">
          <CheckCircle2 size={20} aria-hidden /> Done recently <span className="count">{doneDoses.length + doneTasks.length}</span>
        </h2>
        {doneDoses.length + doneTasks.length === 0 ? (
          <p className="group-empty">Completed tasks and today’s logged doses will show up here.</p>
        ) : (
          <>
            <button type="button" className="btn btn-small" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
              {showDone ? 'Hide' : 'Show'} completed items
            </button>
            {showDone && (
              <ul className="done-list">
                {doneDoses.map((d) => (
                  <li key={d.key + d.medicationId}>
                    <StatusBadge status={d.status} label={d.status === 'given' ? 'Given' : undefined} />
                    <Link to={`/medications/${d.medicationId}`}>{d.medName} · {d.slotName.toLowerCase()} dose</Link>
                    {showPet && <span className="muted"> · {d.petName}</span>}
                  </li>
                ))}
                {doneTasks.map((t) => (
                  <li key={t.id}>
                    <StatusBadge status="done" />
                    <Link to={`/tasks/${t.id}`}>{t.title}</Link>
                    {showPet && <span className="muted"> · {t.petName}</span>}
                    <button type="button" className="link-btn" onClick={() => reopen(t)}>Reopen</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  )
}
