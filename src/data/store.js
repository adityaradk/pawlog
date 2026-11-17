/*
 * PawLog data access layer.
 *
 * Every screen reads and writes data ONLY through the async functions in this file.
 * Today they use localStorage with mock latency. To connect the real backend,
 * replace each function body with a REST call (e.g. getPets -> GET /api/pets)
 * and keep the same names, arguments and return shapes.
 */
import { makeSeed, emptyAccount, DEMO_EMAIL } from './seed'
import { todayISO, addDays } from './dates'

const KEY = 'pawlog:v1'
const LATENCY_MS = 120

const wait = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms))
const copy = (x) => (x === undefined ? undefined : structuredClone(x))
const newId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // storage unavailable or corrupt: start fresh
  }
  return { session: null, accounts: {} }
}

let db = load()

function commit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // ignore: data still lives in memory for this tab
  }
}

function acct() {
  const a = db.session && db.accounts[db.session]
  if (!a) throw new Error('Please sign in again.')
  return a
}

function petName(a, petId) {
  return a.pets.find((p) => p.id === petId)?.name ?? 'Unknown pet'
}

const matchesPet = (petId) => (x) => !petId || petId === 'all' || x.petId === petId

/* ---------- Auth (mock: any input works) ---------- */

export function currentUser() {
  const a = db.session && db.accounts[db.session]
  return a ? copy(a.user) : null
}

function nameFromEmail(email) {
  const base = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  return base ? base[0].toUpperCase() + base.slice(1) : 'Friend'
}

export async function signIn({ email }) {
  await wait()
  const key = email.trim().toLowerCase()
  if (!db.accounts[key]) {
    // Unknown email: give it the demo pets so evaluators can explore right away
    db.accounts[key] = makeSeed(todayISO(), { name: nameFromEmail(key), email: key })
  }
  db.session = key
  commit()
  return copy(db.accounts[key].user)
}

export async function signInDemo() {
  await wait()
  if (!db.accounts[DEMO_EMAIL]) db.accounts[DEMO_EMAIL] = makeSeed(todayISO())
  db.session = DEMO_EMAIL
  commit()
  return copy(db.accounts[DEMO_EMAIL].user)
}

export async function signUp({ name, email }) {
  await wait()
  const key = email.trim().toLowerCase()
  if (db.accounts[key]) throw new Error('An account with this email already exists. Sign in instead.')
  db.accounts[key] = emptyAccount({ name: name.trim(), email: key })
  db.session = key
  commit()
  return copy(db.accounts[key].user)
}

export async function signOut() {
  await wait(60)
  db.session = null
  commit()
}

export async function resetDemoData() {
  await wait()
  const user = acct().user
  db.accounts[db.session] = makeSeed(todayISO(), user)
  commit()
}

/* ---------- Pets ---------- */

export async function getPets() {
  await wait()
  return copy(acct().pets)
}

export async function createPet({ name, species, birthDate }) {
  await wait()
  const pet = { id: newId('pet'), name: name.trim(), species, birthDate: birthDate || null, createdAt: new Date().toISOString() }
  acct().pets.push(pet)
  commit()
  return copy(pet)
}

/* ---------- Health records (vet visits, vaccinations) ---------- */

export async function getRecord(id) {
  await wait()
  const a = acct()
  const record = a.records.find((r) => r.id === id)
  if (!record) return null
  return copy({
    ...record,
    petName: petName(a, record.petId),
    weight: a.weights.find((w) => w.id === record.weightId) ?? null,
    followUp: a.tasks.find((t) => t.sourceRecordId === id) ?? null,
  })
}

// Timeline: records plus weight entries, newest first
export async function getTimeline(petId) {
  await wait()
  const a = acct()
  const items = [
    ...a.records.filter(matchesPet(petId)).map((r) => ({
      ...r,
      kind: r.type,
      followUp: a.tasks.find((t) => t.sourceRecordId === r.id) ?? null,
      weight: a.weights.find((w) => w.id === r.weightId) ?? null,
    })),
    ...a.weights.filter(matchesPet(petId)).map((w) => ({ ...w, kind: 'weight' })),
  ]
  items.sort((x, y) => (x.date === y.date ? (y.createdAt || '').localeCompare(x.createdAt || '') : y.date.localeCompare(x.date)))
  return copy(items)
}

// followUp: { title, dueDate } or null. weight: { value, unit } or null.
export async function createHealthEvent({ petId, type, date, title, clinic, notes, weight }, followUp) {
  await wait()
  const a = acct()
  const now = new Date().toISOString()
  const record = { id: newId('rec'), petId, type, date, title: title.trim(), clinic: clinic?.trim() || '', notes: notes?.trim() || '', createdAt: now }
  let weightEntry = null
  let task = null
  if (weight) {
    weightEntry = { id: newId('w'), petId, date, value: Number(weight.value), unit: weight.unit, sourceRecordId: record.id, createdAt: now }
    record.weightId = weightEntry.id
    a.weights.push(weightEntry)
  }
  if (followUp) {
    task = {
      id: newId('task'), petId, title: followUp.title.trim(), kind: 'follow-up', dueDate: followUp.dueDate,
      sourceRecordId: record.id, completedAt: null, createdAt: now,
    }
    record.followUpTaskId = task.id
    a.tasks.push(task)
  }
  a.records.push(record)
  commit()
  return copy({ record, task, weight: weightEntry })
}

export async function updateHealthEvent(id, { type, date, title, clinic, notes, weight }, followUp) {
  await wait()
  const a = acct()
  const record = a.records.find((r) => r.id === id)
  if (!record) throw new Error('This record no longer exists.')
  Object.assign(record, { type, date, title: title.trim(), clinic: clinic?.trim() || '', notes: notes?.trim() || '' })

  const existingWeight = a.weights.find((w) => w.id === record.weightId)
  if (weight && existingWeight) {
    Object.assign(existingWeight, { date, value: Number(weight.value), unit: weight.unit })
  } else if (weight) {
    const w = { id: newId('w'), petId: record.petId, date, value: Number(weight.value), unit: weight.unit, sourceRecordId: id, createdAt: new Date().toISOString() }
    a.weights.push(w)
    record.weightId = w.id
  } else if (existingWeight) {
    a.weights = a.weights.filter((w) => w.id !== existingWeight.id)
    delete record.weightId
  }

  let task = a.tasks.find((t) => t.sourceRecordId === id) ?? null
  if (followUp && task) {
    Object.assign(task, { title: followUp.title.trim(), dueDate: followUp.dueDate })
  } else if (followUp) {
    task = { id: newId('task'), petId: record.petId, title: followUp.title.trim(), kind: 'follow-up', dueDate: followUp.dueDate, sourceRecordId: id, completedAt: null, createdAt: new Date().toISOString() }
    record.followUpTaskId = task.id
    a.tasks.push(task)
  }
  commit()
  return copy({ record, task })
}

// Deletes the record and its linked follow-up. A weight logged with it is kept.
export async function deleteHealthEvent(id) {
  await wait()
  const a = acct()
  a.records = a.records.filter((r) => r.id !== id)
  a.tasks = a.tasks.filter((t) => t.sourceRecordId !== id)
  for (const w of a.weights) if (w.sourceRecordId === id) delete w.sourceRecordId
  commit()
}

/* ---------- Tasks (follow-ups and reminders) ---------- */

export async function getTasks(petId) {
  await wait()
  const a = acct()
  return copy(a.tasks.filter(matchesPet(petId)).map((t) => ({ ...t, petName: petName(a, t.petId) })))
}

export async function getTask(id) {
  await wait()
  const a = acct()
  const task = a.tasks.find((t) => t.id === id)
  if (!task) return null
  return copy({ ...task, petName: petName(a, task.petId), source: a.records.find((r) => r.id === task.sourceRecordId) ?? null })
}

// Idempotent: completing an already-completed task changes nothing
export async function completeTask(id) {
  await wait()
  const task = acct().tasks.find((t) => t.id === id)
  if (!task) throw new Error('This task no longer exists.')
  if (!task.completedAt) task.completedAt = new Date().toISOString()
  commit()
  return copy(task)
}

export async function reopenTask(id) {
  await wait()
  const task = acct().tasks.find((t) => t.id === id)
  if (task) task.completedAt = null
  commit()
  return copy(task)
}

/* ---------- Medications and doses ---------- */

// Fixed dose times for each schedule
export const SLOT_HOURS = { 1: [9], 2: [8, 20], 3: [8, 14, 20], 4: [8, 12, 16, 20] }
export const SLOT_NAMES = { 1: ['Daily'], 2: ['Morning', 'Evening'], 3: ['Morning', 'Afternoon', 'Evening'], 4: ['Morning', 'Midday', 'Afternoon', 'Evening'] }

function occurrences(med, from, to) {
  const start = med.startDate > from ? med.startDate : from
  const end = med.endDate && med.endDate < to ? med.endDate : to
  const list = []
  for (let day = start; day <= end; day = addDays(day, 1)) {
    SLOT_HOURS[med.timesPerDay].forEach((hour, slot) => {
      list.push({ key: `${day}#${slot}`, date: day, slot, hour, slotName: SLOT_NAMES[med.timesPerDay][slot] })
    })
  }
  return list
}

// given / dismissed come from logs; otherwise past days are missed, today is due
function withStatus(a, med, occ) {
  const today = todayISO()
  const log = a.doseLogs.find((l) => l.medicationId === med.id && l.key === occ.key)
  let status = log ? log.status : occ.date < today ? 'missed' : occ.date === today ? 'due' : 'upcoming'
  return { ...occ, medicationId: med.id, medName: med.name, instructions: med.instructions, petId: med.petId, petName: petName(a, med.petId), status, loggedAt: log?.at ?? null }
}

export async function getMedications(petId) {
  await wait()
  const a = acct()
  return copy(a.meds.filter(matchesPet(petId)).map((m) => ({ ...m, petName: petName(a, m.petId) })))
}

export async function getMedication(id) {
  await wait()
  const a = acct()
  const med = a.meds.find((m) => m.id === id)
  return med ? copy({ ...med, petName: petName(a, med.petId) }) : null
}

export async function createMedication({ petId, name, instructions, timesPerDay, startDate, endDate }) {
  await wait()
  const med = { id: newId('med'), petId, name: name.trim(), instructions: instructions.trim(), timesPerDay: Number(timesPerDay), startDate, endDate, createdAt: new Date().toISOString() }
  acct().meds.push(med)
  commit()
  return copy(med)
}

// All dose occurrences for a pet (or 'all') on one date
export async function getDosesForDate(petId, date = todayISO()) {
  await wait()
  const a = acct()
  const doses = a.meds.filter(matchesPet(petId)).flatMap((m) => occurrences(m, date, date).map((o) => withStatus(a, m, o)))
  return copy(doses.sort((x, y) => x.hour - y.hour))
}

// Every dose from the start date through today, newest first
export async function getDoseHistory(medicationId) {
  await wait()
  const a = acct()
  const med = a.meds.find((m) => m.id === medicationId)
  if (!med) return []
  const today = todayISO()
  return copy(occurrences(med, med.startDate, today).map((o) => withStatus(a, med, o)).reverse())
}

// Idempotent per dose occurrence: repeated calls never create a second log
export async function logDose(medicationId, key, status) {
  await wait()
  const a = acct()
  const existing = a.doseLogs.find((l) => l.medicationId === medicationId && l.key === key)
  if (existing) {
    if (existing.status !== status) {
      existing.status = status
      existing.at = new Date().toISOString()
    }
  } else {
    a.doseLogs.push({ id: newId('dose'), medicationId, key, status, at: new Date().toISOString() })
  }
  commit()
  return copy(a.doseLogs.find((l) => l.medicationId === medicationId && l.key === key))
}

// Undo: removes the log so the dose goes back to due / missed
export async function clearDose(medicationId, key) {
  await wait()
  const a = acct()
  a.doseLogs = a.doseLogs.filter((l) => !(l.medicationId === medicationId && l.key === key))
  commit()
}

/* ---------- Weights ---------- */

export async function getWeights(petId) {
  await wait()
  const a = acct()
  return copy(a.weights.filter(matchesPet(petId)).sort((x, y) => x.date.localeCompare(y.date) || (x.createdAt || '').localeCompare(y.createdAt || '')))
}

export async function createWeight({ petId, date, value, unit }) {
  await wait()
  const w = { id: newId('w'), petId, date, value: Number(value), unit, createdAt: new Date().toISOString() }
  acct().weights.push(w)
  commit()
  return copy(w)
}

export async function updateWeight(id, { date, value, unit }) {
  await wait()
  const w = acct().weights.find((x) => x.id === id)
  if (!w) throw new Error('This entry no longer exists.')
  Object.assign(w, { date, value: Number(value), unit })
  commit()
  return copy(w)
}

export async function deleteWeight(id) {
  await wait()
  const a = acct()
  a.weights = a.weights.filter((w) => w.id !== id)
  for (const r of a.records) if (r.weightId === id) delete r.weightId
  commit()
}
