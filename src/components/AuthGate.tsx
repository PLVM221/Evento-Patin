import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { LockKeyhole } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setMessage('No se pudo ingresar. Revisá el correo y la contraseña.')
  }

  if (user === undefined) return <div className="auth-loading">Conectando de forma segura…</div>
  if (user) return <>{children(user)}</>
  return <main className="auth-screen"><form className="auth-card" onSubmit={submit}><LockKeyhole /><span>ACCESO DE OPERADOR</span><h1>Ingresar a Pista</h1><p>Los datos privados del festival están protegidos por cuenta.</p><label>Correo<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label><label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{message && <div role="alert" className="auth-error">{message}</div>}<button disabled={busy}>{busy ? 'Ingresando…' : 'INGRESAR'}</button></form></main>
}
