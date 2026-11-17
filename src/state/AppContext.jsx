import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as store from '../data/store'

const AppContext = createContext(null)
const PET_KEY = 'pawlog:selectedPet'

function readPetPref() {
  try {
    return localStorage.getItem(PET_KEY)
  } catch {
    return null
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => store.currentUser())
  const [version, setVersion] = useState(0)
  const [pets, setPets] = useState(null)
  const [petPref, setPetPref] = useState(readPetPref)

  // Bump the version after any change so every screen re-reads its data
  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!user) {
      setPets(null)
      return
    }
    let live = true
    store.getPets().then((p) => live && setPets(p)).catch(() => live && setPets([]))
    return () => {
      live = false
    }
  }, [user, version])

  const selectPet = useCallback((id) => {
    setPetPref(id)
    try {
      localStorage.setItem(PET_KEY, id)
    } catch {
      // ignore
    }
  }, [])

  // Fall back to the first pet when the saved choice no longer exists
  const selectedPetId = useMemo(() => {
    if (!pets || pets.length === 0) return null
    if (petPref === 'all' || pets.some((p) => p.id === petPref)) return petPref
    return pets[0].id
  }, [pets, petPref])

  const selectedPet = pets?.find((p) => p.id === selectedPetId) ?? null

  const value = { user, setUser, version, refresh, pets, selectedPetId, selectedPet, selectPet }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}

// Runs an async store call and re-runs it whenever data changes.
// Keeps showing the previous data while reloading, so screens don't flicker.
export function useQuery(fn, deps) {
  const { version } = useApp()
  const [state, setState] = useState({ data: undefined, error: null, loading: true })
  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true }))
    fn()
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: undefined, error, loading: false }))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps])
  return state
}
