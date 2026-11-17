import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, History, Pill, Plus } from 'lucide-react'
import * as store from '../data/store'
import { formatDate, formatTime, hourLabel, todayISO } from '../data/dates'
import { useApp, useQuery } from '../state/AppContext'
import { useToast } from '../state/Toasts'
import { DoseCard, useDoseActions } from '../components/Cards'
import { Breadcrumbs, EmptyState, Field, Loading, PetAvatar, PetGate, StatusBadge } from '../components/ui'

function scheduleText(med) {
  const times = store.SLOT_HOURS[med.timesPerDay].map(hourLabel).join(', ')
  return `${med.timesPerDay}× daily (${times}) · ${formatDate(med.startDate)} – ${formatDate(med.endDate)}`
}

function medStatus(med) {
  const t = todayISO()
  if (med.startDate > t) return 'scheduled'
  if (med.endDate < t) return 'ended'
  return null
}

function MedList({ pet }) {
  const meds = useQuery(() => store.getMedications(pet.id), [pet.id])
  const doses = useQuery(() => store.getDosesForDate(pet.id), [pet.id])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{pet.name}’s medications</h1>
          <p className="lead">Record each dose as you give it. Dismissing a reminder never counts as giving a dose.</p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-primary" to="/medications/new"><Plus size={18} aria-hidden /> Add medication</Link>
        </div>
      </div>

      {!meds.data || !doses.data ? (
        <Loading label="Loading medications…" />
      ) : meds.data.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={`No medications for ${pet.name}`}
          action={<Link className="btn btn-primary" to="/medications/new"><Plus size={18} aria-hidden /> Add a medication</Link>}
        >
          Add a medication with the instructions from your vet. PawLog will remind you when each dose is due.
        </EmptyState>
      ) : (
        <div className="stack">
          {meds.data.map((med) => {
            const todays = doses.data.filter((d) => d.medicationId === med.id)
            const st = medStatus(med)
            return (
              <section key={med.id} className="card med-card" aria-labelledby={`med-${med.id}`}>
                <div className="med-head">
                  <div>
                    <h2 id={`med-${med.id}`} className="h3"><Pill size={18} aria-hidden /> {med.name}</h2>
                    <p className="instructions">{med.instructions}</p>
                    <p className="muted small">{scheduleText(med)}</p>
                  </div>
                  {st && <StatusBadge status={st} />}
                </div>
                {todays.length > 0 && (
                  <>
                    <h3 className="subhead">Today’s doses</h3>
                    <div className="items">
                      {todays.map((d) => <DoseCard key={d.key} dose={d} compact />)}
                    </div>
                  </>
                )}
                <Link className="btn btn-small" to={`/medications/${med.id}`}><History size={16} aria-hidden /> Dose history</Link>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function Medications() {
  return <PetGate what="medications">{(pet) => <MedList pet={pet} />}</PetGate>
}

function MedForm({ pet }) {
  const navigate = useNavigate()
  const { refresh } = useApp()
  const toast = useToast()
  const [f, setF] = useState({ name: '', instructions: '', timesPerDay: '2', startDate: todayISO(), endDate: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value })
    if (errors[k]) setErrors({ ...errors, [k]: undefined })
  }

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!f.name.trim()) errs.name = 'Enter the medication name, e.g. “Ear drops”.'
    if (!f.instructions.trim()) errs.instructions = 'Copy the instructions from the label or your vet.'
    if (!f.startDate) errs.startDate = 'Enter the first day of the medication.'
    if (!f.endDate) errs.endDate = 'Enter the last day. Ask your vet if you’re not sure.'
    else if (f.startDate && f.endDate < f.startDate) errs.endDate = 'The last day can’t be before the first day.'
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    setBusy(true)
    const med = await store.createMedication({ petId: pet.id, ...f })
    refresh()
    toast({ message: `${med.name} added for ${pet.name} · ${med.timesPerDay} dose${med.timesPerDay > 1 ? 's' : ''} a day until ${formatDate(med.endDate)}.` })
    navigate(`/medications/${med.id}`)
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Medications', to: '/medications' }, { label: 'Add medication' }]} />
      <h1>Add a medication</h1>
      <p className="for-pet"><PetAvatar species={pet.species} size="sm" /> For <strong>{pet.name}</strong><span className="muted small"> · Change the pet in the top bar</span></p>
      <form className="card form" onSubmit={submit} noValidate>
        <Field label="Medication name" error={errors.name}>
          {(p) => <input {...p} placeholder="e.g. Ear drops" value={f.name} onChange={set('name')} />}
        </Field>
        <Field label="Prescribed instructions" error={errors.instructions} hint="Enter them exactly as prescribed. PawLog never suggests doses.">
          {(p) => <textarea {...p} rows={3} placeholder="e.g. 2 drops in the left ear, twice daily" value={f.instructions} onChange={set('instructions')} />}
        </Field>
        <Field label="How many times a day?" hint={`Reminders at ${store.SLOT_HOURS[f.timesPerDay].map(hourLabel).join(', ')}.`}>
          {(p) => (
            <select {...p} value={f.timesPerDay} onChange={set('timesPerDay')}>
              <option value="1">Once a day</option>
              <option value="2">Twice a day</option>
              <option value="3">3 times a day</option>
              <option value="4">4 times a day</option>
            </select>
          )}
        </Field>
        <div className="row">
          <Field label="First day" error={errors.startDate}>
            {(p) => <input {...p} type="date" value={f.startDate} onChange={set('startDate')} />}
          </Field>
          <Field label="Last day" error={errors.endDate}>
            {(p) => <input {...p} type="date" min={f.startDate} value={f.endDate} onChange={set('endDate')} />}
          </Field>
        </div>
        <div className="form-actions">
          <Link className="btn" to="/medications">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save medication'}</button>
        </div>
      </form>
    </>
  )
}

export function NewMedicationPage() {
  return <PetGate what="medications">{(pet) => <MedForm key={pet.id} pet={pet} />}</PetGate>
}

const LEGEND = ['given', 'dismissed', 'missed', 'due']

export function MedicationDetail() {
  const { id } = useParams()
  const { data: med } = useQuery(() => store.getMedication(id), [id])
  const { data: history } = useQuery(() => store.getDoseHistory(id), [id])
  const { give } = useDoseActions()

  if (med === undefined || history === undefined) return <Loading />
  if (!med) {
    return (
      <div className="card">
        <h1>Medication not found</h1>
        <Link className="btn" to="/medications">Back to medications</Link>
      </div>
    )
  }

  const today = todayISO()
  const todays = history.filter((d) => d.date === today).sort((a, b) => a.slot - b.slot)
  const past = history.filter((d) => d.date < today)
  const days = [...new Set(past.map((d) => d.date))]
  const counts = Object.fromEntries(LEGEND.map((s) => [s, history.filter((d) => d.status === s).length]))

  return (
    <>
      <Breadcrumbs items={[{ label: 'Medications', to: '/medications' }, { label: med.name }]} />
      <div className="page-head">
        <div>
          <p className="eyebrow"><Pill size={16} aria-hidden /> Medication · {med.petName}</p>
          <h1>{med.name}</h1>
          <p className="instructions">{med.instructions}</p>
          <p className="muted small">{scheduleText(med)}</p>
        </div>
      </div>

      {todays.length > 0 && (
        <section className="card" aria-labelledby="today-doses">
          <h2 id="today-doses" className="h3">Today</h2>
          <div className="items">{todays.map((d) => <DoseCard key={d.key} dose={d} compact />)}</div>
        </section>
      )}

      <section className="card" aria-labelledby="history-title">
        <h2 id="history-title" className="h3"><History size={18} aria-hidden /> Dose history</h2>
        <ul className="legend" aria-label="Summary">
          {LEGEND.filter((s) => counts[s] > 0).map((s) => (
            <li key={s}><StatusBadge status={s} /> <span className="muted">× {counts[s]}</span></li>
          ))}
        </ul>
        {days.length === 0 ? (
          <p className="muted">No past doses yet. History starts after the first day.</p>
        ) : (
          <div className="history">
            {days.map((day) => (
              <div key={day} className="history-day">
                <h3 className="history-date">{formatDate(day, { weekday: true })}</h3>
                <ul>
                  {past.filter((d) => d.date === day).sort((a, b) => a.slot - b.slot).map((d) => (
                    <li key={d.key} className={`history-row status-${d.status}`}>
                      <span className="history-slot">{d.slotName} · {hourLabel(d.hour)}</span>
                      <StatusBadge status={d.status} label={d.status === 'given' ? `Given · logged ${formatTime(d.loggedAt)}` : undefined} />
                      {d.status !== 'given' && (
                        <button type="button" className="link-btn" onClick={() => give(d)}>
                          <Check size={14} aria-hidden /> Record as given
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
