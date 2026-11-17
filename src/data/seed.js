// Demo data, built relative to today so Overdue / Today / Upcoming are always correct.
import { addDays } from './dates'

export const DEMO_EMAIL = 'demo@pawlog.app'

function at(iso, hour, minute) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute).toISOString()
}

export function emptyAccount(user) {
  return { user, pets: [], records: [], weights: [], tasks: [], meds: [], doseLogs: [] }
}

export function makeSeed(today, user = { name: 'Alex', email: DEMO_EMAIL }) {
  const d = (n) => addDays(today, n)
  const created = at(d(-400), 9, 0)

  const pets = [
    { id: 'pet_miso', name: 'Miso', species: 'cat', birthDate: d(-430), createdAt: created },
    { id: 'pet_biscuit', name: 'Biscuit', species: 'dog', birthDate: d(-1110), createdAt: created },
  ]

  const records = [
    {
      id: 'rec_miso_fvrcp', petId: 'pet_miso', type: 'vaccination', date: d(-369),
      title: 'FVRCP vaccine (kitten series, final dose)', clinic: 'Prairie Paws Veterinary Clinic',
      notes: 'Final kitten dose. Vet said the next booster is due in one year.',
      followUpTaskId: 'task_miso_booster', createdAt: at(d(-369), 11, 0),
    },
    {
      id: 'rec_miso_spay', petId: 'pet_miso', type: 'visit', date: d(-140),
      title: 'Post-spay recheck', clinic: 'Prairie Paws Veterinary Clinic',
      notes: 'Incision healed well. Cleared to stop wearing the cone.',
      weightId: 'w_miso_2', createdAt: at(d(-140), 15, 30),
    },
    {
      id: 'rec_miso_checkup', petId: 'pet_miso', type: 'visit', date: d(-21),
      title: 'Annual checkup', clinic: 'Prairie Paws Veterinary Clinic',
      notes: 'Healthy overall. Teeth look good. Weight gain is on track for her age. Mentioned mild wax in the left ear; prescribed ear drops if scratching continues.',
      weightId: 'w_miso_5', createdAt: at(d(-21), 10, 15),
    },
    {
      id: 'rec_biscuit_rabies', petId: 'pet_biscuit', type: 'vaccination', date: d(-355),
      title: 'Rabies vaccine (1-year)', clinic: 'Prairie Paws Veterinary Clinic',
      notes: 'No reaction. Booster due in about a year; vet will confirm the date.',
      followUpTaskId: 'task_biscuit_rabies', createdAt: at(d(-355), 14, 0),
    },
    {
      id: 'rec_biscuit_dental', petId: 'pet_biscuit', type: 'visit', date: d(-60),
      title: 'Dental cleaning', clinic: 'Champaign Animal Hospital',
      notes: 'Routine cleaning under anesthesia. One small tartar spot on a back molar.',
      weightId: 'w_biscuit_2', createdAt: at(d(-60), 9, 30),
    },
  ]

  const weights = [
    { id: 'w_miso_1', petId: 'pet_miso', date: d(-150), value: 3.9, unit: 'kg' },
    { id: 'w_miso_2', petId: 'pet_miso', date: d(-140), value: 4.0, unit: 'kg', sourceRecordId: 'rec_miso_spay' },
    { id: 'w_miso_3', petId: 'pet_miso', date: d(-95), value: 4.2, unit: 'kg' },
    { id: 'w_miso_4', petId: 'pet_miso', date: d(-60), value: 4.3, unit: 'kg' },
    { id: 'w_miso_5', petId: 'pet_miso', date: d(-21), value: 4.5, unit: 'kg', sourceRecordId: 'rec_miso_checkup' },
    { id: 'w_miso_6', petId: 'pet_miso', date: d(-6), value: 4.6, unit: 'kg' },
    { id: 'w_biscuit_1', petId: 'pet_biscuit', date: d(-120), value: 52.4, unit: 'lb' },
    { id: 'w_biscuit_2', petId: 'pet_biscuit', date: d(-60), value: 53.1, unit: 'lb', sourceRecordId: 'rec_biscuit_dental' },
    { id: 'w_biscuit_3', petId: 'pet_biscuit', date: d(-12), value: 52.8, unit: 'lb' },
  ].map((w) => ({ ...w, createdAt: at(w.date, 18, 0) }))

  const tasks = [
    {
      id: 'task_miso_booster', petId: 'pet_miso', title: 'FVRCP booster vaccine', kind: 'vaccine',
      dueDate: d(-4), sourceRecordId: 'rec_miso_fvrcp', completedAt: null, createdAt: at(d(-369), 11, 0),
    },
    {
      id: 'task_miso_flea', petId: 'pet_miso', title: 'Apply monthly flea prevention', kind: 'care',
      dueDate: d(6), sourceRecordId: null, completedAt: null, createdAt: at(d(-24), 12, 0),
    },
    {
      id: 'task_biscuit_rabies', petId: 'pet_biscuit', title: 'Rabies booster vaccine', kind: 'vaccine',
      dueDate: d(10), sourceRecordId: 'rec_biscuit_rabies', completedAt: null, createdAt: at(d(-355), 14, 0),
    },
  ]

  const meds = [
    {
      id: 'med_miso_ear', petId: 'pet_miso', name: 'Ear drops',
      instructions: '2 drops in the left ear, twice daily. Gently massage the base of the ear afterwards.',
      timesPerDay: 2, startDate: d(-5), endDate: d(9), createdAt: at(d(-5), 8, 0),
    },
  ]

  // Past doses: mostly given, one missed (2 days ago, evening), one dismissed (yesterday, evening)
  const doseLogs = []
  for (let n = -5; n <= -1; n++) {
    for (const slot of [0, 1]) {
      if (n === -2 && slot === 1) continue
      const dismissed = n === -1 && slot === 1
      doseLogs.push({
        id: `dose_${n}_${slot}`, medicationId: 'med_miso_ear', key: `${d(n)}#${slot}`,
        status: dismissed ? 'dismissed' : 'given',
        at: at(d(n), slot === 0 ? 8 : 20, slot === 0 ? 12 : 4),
      })
    }
  }

  return { user, pets, records, weights, tasks, meds, doseLogs }
}
