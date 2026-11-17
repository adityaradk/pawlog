import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChevronDown, ClipboardList, Home, LogOut, PawPrint, Pill, RotateCcw, Scale, Settings } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { useToast } from '../state/Toasts'
import * as store from '../data/store'
import { ConfirmDialog } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: Home, end: true },
  { to: '/timeline', label: 'Health timeline', short: 'Timeline', icon: ClipboardList },
  { to: '/medications', label: 'Medications', short: 'Meds', icon: Pill },
  { to: '/weight', label: 'Weight', short: 'Weight', icon: Scale },
  { to: '/pets', label: 'Pets', short: 'Pets', icon: PawPrint },
]

function PetSwitcher() {
  const { pets, selectedPetId, selectPet } = useApp()
  const navigate = useNavigate()
  if (!pets) return null
  if (pets.length === 0) {
    return <Link className="btn btn-small" to="/pets/new">+ Add a pet</Link>
  }
  return (
    <div className="pet-switcher">
      <label htmlFor="pet-switcher">Pet</label>
      <select
        id="pet-switcher"
        value={selectedPetId}
        onChange={(e) => (e.target.value === '__add' ? navigate('/pets/new') : selectPet(e.target.value))}
      >
        {pets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.species === 'dog' ? '🐶' : '🐱'} {p.name}
          </option>
        ))}
        <option value="all">🐾 All pets</option>
        <option value="__add">＋ Add a pet…</option>
      </select>
    </div>
  )
}

function AccountMenu() {
  const { user, setUser, refresh } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function signOut() {
    setOpen(false)
    await store.signOut()
    setUser(null)
    navigate('/signin')
  }

  async function reset() {
    setBusy(true)
    await store.resetDemoData()
    setBusy(false)
    setConfirmReset(false)
    refresh()
    navigate('/')
    toast({ message: 'Demo data restored: Miso and Biscuit are back with their original records.' })
  }

  return (
    <div className="account" ref={ref}>
      <button type="button" className="account-btn" aria-label={`Account menu (${user.name})`} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="avatar" aria-hidden>{user.name[0]}</span>
        <span className="account-name">{user.name}</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open && (
        <div className="menu">
          <p className="menu-email">Signed in as<br /><strong>{user.email}</strong></p>
          <Link to="/settings" onClick={() => setOpen(false)}>
            <Settings size={16} aria-hidden /> Settings
          </Link>
          <button type="button" onClick={() => { setOpen(false); setConfirmReset(true) }}>
            <RotateCcw size={16} aria-hidden /> Reset demo data
          </button>
          <button type="button" onClick={signOut}>
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        confirmLabel="Reset demo data"
        busy={busy}
        onCancel={() => setConfirmReset(false)}
        onConfirm={reset}
      >
        <p>All changes in this account will be replaced with the original demo pets, records, medications and weights. This can’t be undone.</p>
      </ConfirmDialog>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <Link to="/" className="logo" aria-label="PawLog home">
          <PawPrint size={22} aria-hidden /> <span>PawLog</span>
        </Link>
        <div className="topbar-right">
          <PetSwitcher />
          <AccountMenu />
        </div>
      </header>
      <nav className="sidebar" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link">
            <Icon size={20} aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {NAV.map(({ to, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="bottom-link">
            <Icon size={22} aria-hidden />
            <span>{short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
