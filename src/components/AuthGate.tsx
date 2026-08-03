import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { KeyRound, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

type AuthView = 'login' | 'forgot' | 'recovery'

export function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null>()
  const [view, setView] = useState<AuthView>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        setView('recovery')
        setMessage('')
        setSuccess(false)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setSuccess(false)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setMessage('No se pudo ingresar. Revisá el correo y la contraseña.')
  }

  const submitRecoveryEmail = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setSuccess(false)
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    setBusy(false)
    if (error) {
      setMessage('No se pudo enviar el correo. Intentá nuevamente en unos minutos.')
      return
    }
    setSuccess(true)
    setMessage('Si el correo está registrado, vas a recibir un enlace para cambiar la contraseña.')
  }

  const submitNewPassword = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setSuccess(false)
    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== passwordConfirmation) {
      setMessage('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setMessage('No se pudo cambiar la contraseña. Solicitá un enlace nuevo.')
      return
    }
    setPassword('')
    setPasswordConfirmation('')
    setSuccess(true)
    setMessage('Contraseña actualizada. Ya podés continuar.')
    setView('login')
  }

  const showLogin = () => {
    setView('login')
    setMessage('')
    setSuccess(false)
    setPassword('')
  }

  if (user === undefined) return <div className="auth-loading">Conectando de forma segura…</div>

  if (view === 'recovery') {
    return <main className="auth-screen"><form className="auth-card" onSubmit={submitNewPassword}><KeyRound /><span>RECUPERAR ACCESO</span><h1>Nueva contraseña</h1><p>Elegí una contraseña nueva para tu cuenta.</p><label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label><label>Repetir contraseña<input type="password" autoComplete="new-password" minLength={8} required value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} /></label>{message && <div role="alert" className={success ? 'auth-success' : 'auth-error'}>{message}</div>}<button disabled={busy}>{busy ? 'Guardando…' : 'GUARDAR CONTRASEÑA'}</button></form></main>
  }

  if (user) return <>{children(user)}</>

  if (view === 'forgot') {
    return <main className="auth-screen"><form className="auth-card" onSubmit={submitRecoveryEmail}><Mail /><span>RECUPERAR ACCESO</span><h1>Olvidé mi contraseña</h1><p>Ingresá tu correo y te enviaremos un enlace para crear una contraseña nueva.</p><label>Correo<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label>{message && <div role="alert" className={success ? 'auth-success' : 'auth-error'}>{message}</div>}<button disabled={busy}>{busy ? 'Enviando…' : 'ENVIAR ENLACE'}</button><button className="auth-secondary" type="button" onClick={showLogin}>VOLVER AL INGRESO</button></form></main>
  }

  return <main className="auth-screen"><form className="auth-card" onSubmit={submitLogin}><LockKeyhole /><span>ACCESO DE OPERADOR</span><h1>Ingresar a Pista</h1><p>Los datos privados del festival están protegidos por cuenta.</p><label>Correo<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label><label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label><button className="auth-link" type="button" onClick={() => { setView('forgot'); setMessage(''); setSuccess(false) }}>¿Olvidaste tu contraseña?</button>{message && <div role="alert" className="auth-error">{message}</div>}<button disabled={busy}>{busy ? 'Ingresando…' : 'INGRESAR'}</button></form></main>
}
