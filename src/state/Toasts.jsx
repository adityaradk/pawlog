import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  // toast({ message, tone: 'success' | 'info', action: { label, onClick }, link: { label, to } })
  const show = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list.slice(-2), { ...toast, id }])
    timers.current[id] = setTimeout(() => dismiss(id), toast.action || toast.link ? 9000 : 5000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone || 'success'}`}>
            {t.tone === 'info' ? <Info size={18} aria-hidden /> : <CheckCircle2 size={18} aria-hidden />}
            <span className="toast-msg">{t.message}</span>
            {t.link && (
              <Link className="toast-btn" to={t.link.to} onClick={() => dismiss(t.id)}>
                {t.link.label}
              </Link>
            )}
            {t.action && (
              <button
                type="button"
                className="toast-btn"
                onClick={() => {
                  t.action.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="toast-close" aria-label="Close notification" onClick={() => dismiss(t.id)}>
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
