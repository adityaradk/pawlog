import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PawPrint } from 'lucide-react'
import * as store from '../data/store'
import { useApp } from '../state/AppContext'
import { Field } from '../components/ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <PawPrint size={28} aria-hidden /> PawLog
        </div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="prototype-note">Prototype: any email and password work. No real account is created.</p>
      </div>
    </div>
  )
}

function useFinishSignIn() {
  const { setUser } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  return (user) => {
    setUser(user)
    navigate(location.state?.from || '/', { replace: true })
  }
}

export function SignIn() {
  const finish = useFinishSignIn()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter an email address like name@example.com.'
    if (!form.password) errs.password = 'Enter your password.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    finish(await store.signIn(form))
  }

  async function demo() {
    setBusy(true)
    finish(await store.signInDemo())
  }

  return (
    <AuthShell title="Welcome back" subtitle="Keep track of your pet’s care and what’s coming up next.">
      <button type="button" className="btn btn-primary btn-block btn-large" onClick={demo} disabled={busy}>
        Continue with demo account
      </button>
      <div className="divider"><span>or sign in with email</span></div>
      <form onSubmit={submit} noValidate>
        <Field label="Email" error={errors.email}>
          {(p) => <input {...p} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(p) => <input {...p} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
        </Field>
        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="auth-switch">
        New to PawLog? <Link to="/signup">Create an account</Link>
      </p>
    </AuthShell>
  )
}

export function SignUp() {
  const finish = useFinishSignIn()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Enter your name.'
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter an email address like name@example.com.'
    if (form.password.length < 8) errs.password = 'Use at least 8 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      finish(await store.signUp(form))
    } catch (err) {
      setErrors({ email: err.message })
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start a care log for your cat or dog. It takes a minute.">
      <form onSubmit={submit} noValidate>
        <Field label="Your name" error={errors.name}>
          {(p) => <input {...p} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {(p) => <input {...p} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters.">
          {(p) => <input {...p} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </AuthShell>
  )
}
