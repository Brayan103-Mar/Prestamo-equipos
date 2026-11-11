import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [modo, setModo] = useState('entrar')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setMensaje('')
    setCargando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({
          email: correo,
          password: clave,
        })
        if (error) setMensaje(error.message)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: correo,
          password: clave,
          options: { data: { nombre } },
        })
        if (error) {
          setMensaje(error.message)
        } else if (!data.session) {
          setMensaje('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.')
        }
      }
    } catch (err) {
      setMensaje(String(err.message || err))
    }
    setCargando(false)
  }

  return (
    <div className="login-pagina">
      <form className="login-caja" onSubmit={enviar}>
        <img src="/logo.png" alt="Logo" />
        <h2>{modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

        {modo === 'registro' && (
          <label className="campo">
            Nombre completo
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </label>
        )}

        <label className="campo">
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
        </label>

        <label className="campo">
          Contraseña
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            minLength={6}
            required
          />
        </label>

        {mensaje && <p className="mensaje">{mensaje}</p>}

        <button className="boton" type="submit" disabled={cargando}>
          {cargando ? 'Espere...' : modo === 'entrar' ? 'Entrar' : 'Registrarme'}
        </button>

        <button
          type="button"
          className="enlace"
          onClick={() => {
            setModo(modo === 'entrar' ? 'registro' : 'entrar')
            setMensaje('')
          }}
        >
          {modo === 'entrar'
            ? '¿No tienes cuenta? Regístrate'
            : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </form>
    </div>
  )
}