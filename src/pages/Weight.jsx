import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Pencil, Scale, Trash2 } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as store from '../data/store'
import { diffDays, formatDate, todayISO } from '../data/dates'
import { convert, formatWeight, maxWeight } from '../data/units'
import { useApp, useQuery } from '../state/AppContext'
import { useToast } from '../state/Toasts'
import { ConfirmDialog, EmptyState, Field, Loading, PetGate } from '../components/ui'

const UNIT_KEY = 'pawlog:unit'

function readUnit(pet) {
  try {
    const u = localStorage.getItem(`${UNIT_KEY}:${pet.id}`)
    if (u === 'kg' || u === 'lb') return u
  } catch {
    // ignore
  }
  return pet.species === 'dog' ? 'lb' : 'kg'
}

function WeightForm({ pet, unit, editing, onDone }) {
  const { refresh } = useApp()
  const toast = useToast()
  const blank = { date: todayISO(), value: '', unit }
  const [f, setF] = useState(editing ? { date: editing.date, value: String(editing.value), unit: editing.unit } : blank)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value })
    if (errors[k]) setErrors({ ...errors, [k]: undefined })
  }

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    const v = Number(f.value)
    if (!f.date) errs.date = 'Enter the date you weighed your pet.'
    else if (f.date > todayISO()) errs.date = 'This date is in the future. Log a weight on or after the day you measure it.'
    if (f.value === '') errs.value = 'Enter the weight.'
    else if (!(v > 0)) errs.value = 'The weight must be above 0.'
    else if (v > maxWeight(pet.species, f.unit)) errs.value = `That’s more than ${maxWeight(pet.species, f.unit)} ${f.unit}, which is unusual for a ${pet.species}. Check the number and the unit.`
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    if (editing) await store.updateWeight(editing.id, f)
    else await store.createWeight({ petId: pet.id, ...f })
    refresh()
    toast({ message: `${editing ? 'Updated' : 'Logged'} ${formatWeight(v, f.unit)} for ${pet.name} on ${formatDate(f.date)}.` })
    setBusy(false)
    if (editing) onDone()
    else setF({ ...blank, unit: f.unit })
  }

  return (
    <form className="card form weight-form" onSubmit={submit} noValidate aria-labelledby="wf-title">
      <h2 id="wf-title" className="h3">{editing ? `Edit entry from ${formatDate(editing.date)}` : 'Log a weight'}</h2>
      <div className="row row-3">
        <Field label="Date" error={errors.date}>
          {(p) => <input {...p} type="date" max={todayISO()} value={f.date} onChange={set('date')} />}
        </Field>
        <Field label="Weight" error={errors.value}>
          {(p) => <input {...p} type="number" inputMode="decimal" step="0.1" min="0" placeholder={f.unit === 'kg' ? 'e.g. 4.6' : 'e.g. 10.2'} value={f.value} onChange={set('value')} />}
        </Field>
        <Field label="Unit">
          {(p) => (
            <select {...p} value={f.unit} onChange={set('unit')}>
              <option value="kg">kg (kilograms)</option>
              <option value="lb">lb (pounds)</option>
            </select>
          )}
        </Field>
      </div>
      <div className="form-actions start">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Log weight'}</button>
        {editing && <button type="button" className="btn" onClick={onDone}>Cancel</button>}
      </div>
    </form>
  )
}

function WeightFor({ pet }) {
  const { refresh } = useApp()
  const toast = useToast()
  const { data } = useQuery(() => store.getWeights(pet.id), [pet.id])
  const [unit, setUnitState] = useState(() => readUnit(pet))
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const setUnit = (u) => {
    setUnitState(u)
    try {
      localStorage.setItem(`${UNIT_KEY}:${pet.id}`, u)
    } catch {
      // ignore
    }
  }
  const show = (w) => convert(w.value, w.unit, unit)

  async function remove() {
    setBusy(true)
    await store.deleteWeight(deleting.id)
    refresh()
    toast({ message: `Deleted the ${formatWeight(deleting.value, deleting.unit)} entry from ${formatDate(deleting.date)}.` })
    setBusy(false)
    setDeleting(null)
  }

  if (!data) return <Loading label="Loading weights…" />

  const latest = data[data.length - 1]
  const previous = data[data.length - 2]
  const change = latest && previous ? show(latest) - show(previous) : null
  const rounded = change === null ? null : Math.round(change * 10) / 10
  const ChangeIcon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : ArrowRight
  const changeWord = rounded > 0 ? 'Up' : rounded < 0 ? 'Down' : 'No change'
  const chartData = data.map((w) => ({ date: formatDate(w.date), value: Math.round(show(w) * 10) / 10 }))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{pet.name}’s weight</h1>
          <p className="lead">Weigh regularly and compare against earlier entries.</p>
        </div>
        <div className="unit-toggle" role="group" aria-label="Display unit">
          {['kg', 'lb'].map((u) => (
            <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}>
              {u === 'kg' ? 'kg' : 'lb'}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <>
          <EmptyState icon={Scale} title={`No weights for ${pet.name} yet`}>
            Log a weight below. After two entries you’ll see the change and a trend chart.
          </EmptyState>
          <WeightForm pet={pet} unit={unit} />
        </>
      ) : (
        <>
          <div className="stats" aria-label="Weight summary">
            <div className="stat">
              <p className="stat-label">Latest</p>
              <p className="stat-value">{formatWeight(show(latest), unit)}</p>
              <p className="muted small">{formatDate(latest.date, { weekday: true })}</p>
            </div>
            <div className="stat">
              <p className="stat-label">Previous entry</p>
              {previous ? (
                <>
                  <p className="stat-value">{formatWeight(show(previous), unit)}</p>
                  <p className="muted small">{formatDate(previous.date, { weekday: true })} ({diffDays(latest.date, previous.date)} days earlier)</p>
                </>
              ) : <p className="muted">Only one entry so far</p>}
            </div>
            <div className={`stat stat-change ${rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'}`}>
              <p className="stat-label">Change since previous</p>
              {rounded !== null ? (
                <>
                  <p className="stat-value"><ChangeIcon size={22} aria-hidden /> {rounded > 0 ? '+' : ''}{rounded.toFixed(1)} {unit}</p>
                  <p className="muted small">{changeWord}{rounded !== 0 && ` ${Math.abs(rounded).toFixed(1)} ${unit}`} since {formatDate(previous.date)}</p>
                </>
              ) : <p className="muted">Log another weight to compare</p>}
            </div>
          </div>

          {data.length > 1 && (
            <section className="card" aria-labelledby="chart-title">
              <h2 id="chart-title" className="h3">Trend ({unit})</h2>
              <div className="chart" role="img" aria-label={`Line chart of ${pet.name}'s weight from ${chartData[0].value} ${unit} to ${chartData[chartData.length - 1].value} ${unit}`}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted)' }} tickLine={false} axisLine={false} minTickGap={16} />
                    <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 12, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => v.toFixed(1)} />
                    <Tooltip formatter={(v) => [`${v.toFixed(1)} ${unit}`, 'Weight']} />
                    <Line isAnimationActive={false} type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--primary)' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <WeightForm key={editing?.id || 'new'} pet={pet} unit={unit} editing={editing} onDone={() => setEditing(null)} />

          <section className="card" aria-labelledby="entries-title">
            <h2 id="entries-title" className="h3">All entries</h2>
            <ul className="entries">
              {[...data].reverse().map((w, i, arr) => {
                const prev = arr[i + 1]
                const delta = prev ? Math.round((show(w) - show(prev)) * 10) / 10 : null
                return (
                  <li key={w.id} className="entry">
                    <div className="entry-main">
                      <span className="entry-date">{formatDate(w.date, { weekday: true })}</span>
                      <span className="entry-value">{formatWeight(show(w), unit)}</span>
                      {w.unit !== unit && <span className="muted small">entered as {formatWeight(w.value, w.unit)}</span>}
                      {delta !== null && <span className="muted small">{delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit} vs. previous</span>}
                      {w.sourceRecordId && <Link className="small" to={`/records/${w.sourceRecordId}`}>From vet record</Link>}
                    </div>
                    <div className="entry-actions">
                      <button type="button" className="btn btn-small" onClick={() => { setEditing(w); setTimeout(() => document.getElementById('wf-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0) }} aria-label={`Edit entry from ${formatDate(w.date)}`}>
                        <Pencil size={14} aria-hidden /> Edit
                      </button>
                      <button type="button" className="btn btn-small btn-danger-outline" onClick={() => setDeleting(w)} aria-label={`Delete entry from ${formatDate(w.date)}`}>
                        <Trash2 size={14} aria-hidden /> Delete
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this weight entry?"
        confirmLabel="Delete entry"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      >
        {deleting && <p>{formatWeight(deleting.value, deleting.unit)} from {formatDate(deleting.date)} will be removed from {pet.name}’s history. This can’t be undone.</p>}
      </ConfirmDialog>
    </>
  )
}

export default function Weight() {
  return <PetGate what="weights">{(pet) => <WeightFor key={pet.id} pet={pet} />}</PetGate>
}
