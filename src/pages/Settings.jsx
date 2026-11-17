import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Mail, RotateCcw } from 'lucide-react'
import * as store from '../data/store'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/Toasts'
import { ComingSoonButton, ConfirmDialog } from '../components/ui'

export default function Settings() {
  const { user, setUser, refresh } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function reset() {
    setBusy(true)
    await store.resetDemoData()
    setBusy(false)
    setConfirming(false)
    refresh()
    navigate('/')
    toast({ message: 'Demo data restored: Miso and Biscuit are back with their original records.' })
  }

  return (
    <>
      <h1>Settings</h1>
      <section className="card">
        <h2 className="h3">Account</h2>
        <dl className="facts">
          <div><dt>Name</dt><dd>{user.name}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
        </dl>
        <button type="button" className="btn" onClick={async () => { await store.signOut(); setUser(null); navigate('/signin') }}>
          <LogOut size={16} aria-hidden /> Sign out
        </button>
      </section>
      <section className="card">
        <h2 className="h3">Reminders</h2>
        <p className="muted">Reminders appear on your dashboard whenever you open PawLog.</p>
        <ComingSoonButton feature="Email reminders"><Mail size={16} aria-hidden /> Turn on email reminders</ComingSoonButton>
      </section>
      <section className="card">
        <h2 className="h3">Demo data</h2>
        <p className="muted">Restore the original demo pets (Miso and Biscuit) and their records. Useful between test sessions.</p>
        <button type="button" className="btn btn-danger-outline" onClick={() => setConfirming(true)}>
          <RotateCcw size={16} aria-hidden /> Reset demo data
        </button>
      </section>
      <p className="muted small">PawLog prototype for CS409. <Link to="/">Back to dashboard</Link></p>
      <ConfirmDialog open={confirming} title="Reset demo data?" confirmLabel="Reset demo data" busy={busy} onCancel={() => setConfirming(false)} onConfirm={reset}>
        <p>All changes in this account will be replaced with the original demo pets, records, medications and weights. This can’t be undone.</p>
      </ConfirmDialog>
    </>
  )
}

export function NotFound() {
  return (
    <div className="card">
      <h1>Page not found</h1>
      <p>We couldn’t find that page.</p>
      <Link className="btn btn-primary" to="/">Go to dashboard</Link>
    </div>
  )
}
