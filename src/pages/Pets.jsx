import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PawPrint, Plus } from 'lucide-react'
import * as store from '../data/store'
import { ageLabel, formatDate, todayISO } from '../data/dates'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/Toasts'
import { Breadcrumbs, ComingSoonButton, EmptyState, Field, Loading, PetAvatar } from '../components/ui'

export default function Pets() {
  const { pets, selectedPetId, selectPet } = useApp()
  const navigate = useNavigate()
  if (!pets) return <Loading />
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your pets</h1>
          <p className="lead">Choose a pet to see their dashboard, records, medications and weight.</p>
        </div>
        <div className="head-actions">
          <Link className="btn btn-primary" to="/pets/new"><Plus size={18} aria-hidden /> Add pet</Link>
        </div>
      </div>
      {pets.length === 0 ? (
        <EmptyState icon={PawPrint} title="No pets yet" action={<Link className="btn btn-primary" to="/pets/new">Add your first pet</Link>}>
          Add your cat or dog to start their care log.
        </EmptyState>
      ) : (
        <ul className="pet-grid">
          {pets.map((p) => (
            <li key={p.id} className={`card pet-card ${p.id === selectedPetId ? 'selected' : ''}`}>
              <PetAvatar species={p.species} size="lg" />
              <div>
                <h2 className="h3">{p.name}</h2>
                <p className="muted">{p.species === 'dog' ? 'Dog' : 'Cat'} · {ageLabel(p.birthDate)}</p>
                {p.birthDate && <p className="muted small">Born {formatDate(p.birthDate)}</p>}
              </div>
              <div className="pet-actions">
                {p.id === selectedPetId ? (
                  <span className="badge badge-done">Currently selected</span>
                ) : (
                  <button type="button" className="btn btn-small" onClick={() => { selectPet(p.id); navigate('/') }}>
                    View {p.name}’s dashboard
                  </button>
                )}
                <ComingSoonButton className="btn btn-small btn-ghost" feature="Editing pet profiles">Edit profile</ComingSoonButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function NewPet() {
  const { refresh, selectPet } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [f, setF] = useState({ name: '', species: '', birthDate: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value })
    if (errors[k]) setErrors({ ...errors, [k]: undefined })
  }

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!f.name.trim()) errs.name = 'Enter your pet’s name.'
    else if (f.name.trim().length > 40) errs.name = 'Keep the name under 40 characters.'
    if (!f.species) errs.species = 'Choose cat or dog.'
    if (f.birthDate && f.birthDate > todayISO()) errs.birthDate = 'The birth date can’t be in the future.'
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.querySelector('[aria-invalid="true"], .has-error input')?.focus()
      return
    }
    setBusy(true)
    const pet = await store.createPet(f)
    selectPet(pet.id)
    refresh()
    toast({ message: `${pet.name} added! Next, add a vet visit or vaccination.`, link: { label: 'Add record', to: '/records/new' } })
    navigate('/')
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Pets', to: '/pets' }, { label: 'Add pet' }]} />
      <h1>Add a pet</h1>
      <form className="card form narrow" onSubmit={submit} noValidate>
        <Field label="Name" error={errors.name}>
          {(p) => <input {...p} placeholder="e.g. Miso" value={f.name} onChange={set('name')} />}
        </Field>
        <fieldset className={`segmented-field${errors.species ? ' has-error' : ''}`}>
          <legend>Species</legend>
          <div className="segmented">
            {[['cat', '🐱 Cat'], ['dog', '🐶 Dog']].map(([value, label]) => (
              <label key={value} className={f.species === value ? 'on' : ''}>
                <input type="radio" name="species" value={value} checked={f.species === value} onChange={set('species')} aria-invalid={errors.species ? true : undefined} /> {label}
              </label>
            ))}
          </div>
          {errors.species && <p className="error">{errors.species}</p>}
        </fieldset>
        <Field label="Birth date" optional error={errors.birthDate} hint="An estimate is fine. Used to show your pet’s age.">
          {(p) => <input {...p} type="date" max={todayISO()} value={f.birthDate} onChange={set('birthDate')} />}
        </Field>
        <div className="form-actions">
          <Link className="btn" to="/pets">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add pet'}</button>
        </div>
      </form>
    </>
  )
}
