import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bell } from 'lucide-react'
import * as store from '../data/store'
import { formatDate, todayISO } from '../data/dates'
import { maxWeight } from '../data/units'
import { useApp, useQuery } from '../state/AppContext'
import { useToast } from '../state/Toasts'
import { Breadcrumbs, Field, Loading, PetAvatar, PetGate } from '../components/ui'

const TYPE_LABEL = { visit: 'Vet visit', vaccination: 'Vaccination' }

function validate(f, originalFuDate, species) {
  const today = todayISO()
  const e = {}
  if (!f.date) e.date = 'Enter the date of the visit.'
  else if (f.date > today) e.date = 'This date is in the future. Records are for care that already happened. To plan ahead, add a follow-up reminder instead.'
  if (!f.title.trim()) e.title = f.type === 'vaccination' ? 'Enter the vaccine name, e.g. “Rabies”.' : 'Enter the reason for the visit, e.g. “Annual checkup”.'
  if (f.weightValue !== '') {
    const v = Number(f.weightValue)
    if (!(v > 0)) e.weightValue = 'Enter a weight above 0, or leave it empty.'
    else if (v > maxWeight(species, f.weightUnit)) e.weightValue = `That’s more than ${maxWeight(species, f.weightUnit)} ${f.weightUnit}, which is unusual for a ${species}. Check the number and the unit.`
  }
  if (f.followUp) {
    if (!f.fuTitle.trim()) e.fuTitle = 'Describe the follow-up, e.g. “Recheck ears”.'
    if (!f.fuDate) e.fuDate = 'Enter the date the vet gave you.'
    else if (f.fuDate === originalFuDate) {
      // unchanged existing follow-up: don't block other edits
    } else if (f.fuDate < today) e.fuDate = 'This date has already passed. Choose today or a later date.'
    else if (f.date && f.fuDate <= f.date) e.fuDate = 'The follow-up should be after the visit date.'
  }
  return e
}

function RecordFormInner({ pet, initial, existing }) {
  const navigate = useNavigate()
  const { refresh } = useApp()
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((prev) => ({ ...prev, [k]: value }))
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }))
  }
  const hasLinkedTask = Boolean(existing?.followUp)
  const typeLabel = TYPE_LABEL[f.type]

  async function submit(e) {
    e.preventDefault()
    const errs = validate(f, existing?.followUp?.dueDate, pet.species)
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    setBusy(true)
    const data = {
      petId: pet.id, type: f.type, date: f.date, title: f.title, clinic: f.clinic, notes: f.notes,
      weight: f.weightValue !== '' ? { value: f.weightValue, unit: f.weightUnit } : null,
    }
    const followUp = f.followUp ? { title: f.fuTitle, dueDate: f.fuDate } : null
    const result = existing ? await store.updateHealthEvent(existing.id, data, followUp) : await store.createHealthEvent(data, followUp)
    refresh()
    const id = existing ? existing.id : result.record.id
    const fuText = followUp ? ` · Follow-up “${followUp.title.trim()}” ${existing && hasLinkedTask ? 'updated' : 'added'} for ${formatDate(followUp.dueDate)}` : ''
    toast({
      message: `${typeLabel} ${existing ? 'updated' : 'saved'}${fuText}`,
      link: result.task ? { label: 'View task', to: `/tasks/${result.task.id}` } : undefined,
    })
    navigate(`/records/${id}`)
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Timeline', to: '/timeline' }, ...(existing ? [{ label: existing.title, to: `/records/${existing.id}` }] : []), { label: existing ? 'Edit' : 'Add record' }]} />
      <h1>{existing ? `Edit ${typeLabel.toLowerCase()}` : 'Add a vet visit or vaccination'}</h1>
      <p className="for-pet">
        <PetAvatar species={pet.species} size="sm" /> For <strong>{pet.name}</strong>
        {!existing && <span className="muted small"> · Change the pet in the top bar</span>}
      </p>

      <form className="card form" onSubmit={submit} noValidate>
        <fieldset className="segmented-field">
          <legend>Type of record</legend>
          <div className="segmented">
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <label key={value} className={f.type === value ? 'on' : ''}>
                <input type="radio" name="type" value={value} checked={f.type === value} onChange={set('type')} /> {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="row">
          <Field label={f.type === 'vaccination' ? 'Date given' : 'Visit date'} error={errors.date}>
            {(p) => <input {...p} type="date" max={todayISO()} value={f.date} onChange={set('date')} />}
          </Field>
          <Field label="Clinic" optional>
            {(p) => <input {...p} placeholder="e.g. Prairie Paws Veterinary Clinic" value={f.clinic} onChange={set('clinic')} />}
          </Field>
        </div>

        <Field label={f.type === 'vaccination' ? 'Vaccine name' : 'Reason for visit'} error={errors.title}>
          {(p) => <input {...p} placeholder={f.type === 'vaccination' ? 'e.g. FVRCP booster' : 'e.g. Ear check'} value={f.title} onChange={set('title')} />}
        </Field>

        <Field label="Notes" optional hint="What the vet said, test results, instructions…">
          {(p) => <textarea {...p} rows={4} value={f.notes} onChange={set('notes')} />}
        </Field>

        <div className="row row-weight">
          <Field label="Weight at this visit" optional error={errors.weightValue}>
            {(p) => <input {...p} type="number" inputMode="decimal" step="0.1" min="0" value={f.weightValue} onChange={set('weightValue')} />}
          </Field>
          <Field label="Unit">
            {(p) => (
              <select {...p} value={f.weightUnit} onChange={set('weightUnit')}>
                <option value="kg">kg (kilograms)</option>
                <option value="lb">lb (pounds)</option>
              </select>
            )}
          </Field>
        </div>

        <div className={`followup ${f.followUp ? 'on' : ''}`}>
          <label className="switch">
            <input type="checkbox" role="switch" checked={f.followUp} disabled={hasLinkedTask} onChange={set('followUp')} />
            <span className="switch-track" aria-hidden />
            <span>
              <Bell size={16} aria-hidden /> <strong>Create a follow-up reminder</strong>
              <span className="hint-inline">{hasLinkedTask ? 'This record already has a follow-up. Edit it below.' : 'Shows up on your dashboard on the date you choose.'}</span>
            </span>
          </label>
          {f.followUp && (
            <div className="row">
              <Field label="What needs to happen?" error={errors.fuTitle}>
                {(p) => <input {...p} placeholder="e.g. Recheck ears" value={f.fuTitle} onChange={set('fuTitle')} />}
              </Field>
              <Field label="Due date" error={errors.fuDate} hint="Use the date from your vet. PawLog never suggests medical dates.">
                {(p) => <input {...p} type="date" min={todayISO()} value={f.fuDate} onChange={set('fuDate')} />}
              </Field>
            </div>
          )}
        </div>

        <div className="form-actions">
          <Link className="btn" to={existing ? `/records/${existing.id}` : '/timeline'}>Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : existing ? 'Save changes' : `Save ${typeLabel.toLowerCase()}`}
          </button>
        </div>
      </form>
    </>
  )
}

function defaultUnit(pet) {
  return pet.species === 'dog' ? 'lb' : 'kg'
}

function NewRecord({ pet }) {
  const [params] = useSearchParams()
  const type = params.get('type') === 'vaccination' ? 'vaccination' : 'visit'
  const initial = {
    type, date: todayISO(), title: '', clinic: '', notes: '', weightValue: '', weightUnit: defaultUnit(pet),
    followUp: false, fuTitle: '', fuDate: '',
  }
  return <RecordFormInner key={pet.id} pet={pet} initial={initial} />
}

export function NewRecordPage() {
  return <PetGate what="health records">{(pet) => <NewRecord pet={pet} />}</PetGate>
}

export function EditRecordPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { pets } = useApp()
  const { data: record, loading } = useQuery(() => store.getRecord(id), [id])
  if (record === undefined || !pets) return <Loading />
  if (!record) return <MissingRecord />
  if (loading && !record) return <Loading />
  const pet = pets.find((p) => p.id === record.petId)
  const fu = record.followUp
  const initial = {
    type: record.type, date: record.date, title: record.title, clinic: record.clinic, notes: record.notes,
    weightValue: record.weight ? String(record.weight.value) : '', weightUnit: record.weight?.unit || defaultUnit(pet),
    followUp: Boolean(fu) || params.get('followup') === '1', fuTitle: fu?.title || '', fuDate: fu?.dueDate || '',
  }
  return <RecordFormInner key={record.id} pet={pet} initial={initial} existing={record} />
}

export function MissingRecord() {
  return (
    <div className="card">
      <h1>Record not found</h1>
      <p>This record may have been deleted.</p>
      <Link className="btn" to="/timeline">Back to timeline</Link>
    </div>
  )
}
