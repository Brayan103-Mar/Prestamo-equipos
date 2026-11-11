import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import './App.css'
import { supabase } from './supabase'
import Login from './Login'
import Equipos from './Equipos'
import Accesorios from './Accesorios'
import Solicitudes from './Solicitudes'
import Prestamos from './Prestamos'
import Incidencias from './Incidencias'

const secciones = [
  { ruta: '/', nombre: 'Inicio', texto: 'Sistema general de préstamo de equipos de cómputo ,Bienvenido usuario, recordar que el préstamo de equipo se hace desde un día antes para tener su solicitud.' },
  { ruta: '/equipos', nombre: 'Equipos', texto: 'Aquí se registrarán y consultarán los equipos de cómputo.' },
  { ruta: '/solicitudes', nombre: 'Solicitudes', texto: 'Aquí se registrarán las solicitudes de préstamo.' },
  { ruta: '/prestamos', nombre: 'Préstamos', texto: 'Aquí se controlarán los préstamos y las devoluciones.' },
  { ruta: '/accesorios', nombre: 'Accesorios', texto: 'Aquí se registrarán los accesorios de los equipos.' },
  { ruta: '/incidencias', nombre: 'Incidencias', texto: 'Aquí se reportarán las incidencias de los equipos.' },
]

function Pagina({ titulo, texto }) {
  return (
    <section className="tarjeta">
      <h2>{titulo}</h2>
      <p>{texto}</p>
    </section>
  )
}

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargandoSesion(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sesion) return
    supabase
      .from('usuarios')
      .select('nombre, rol')
      .eq('id', sesion.user.id)
      .single()
      .then(({ data }) => setPerfil(data))
  }, [sesion])

  if (cargandoSesion) {
    return <p style={{ padding: 24 }}>Cargando...</p>
  }

  if (!sesion) {
    return <Login />
  }

  const esAdmin = perfil?.rol === 'administrador'
  const usuarioId = sesion.user.id

  return (
    <BrowserRouter>
      <div className="app">
        <aside className="menu">
          <div className="menu-marca">
            <img src="/logo.png" alt="Logo" />
            <span>Préstamo de equipos</span>
          </div>
          <nav>
            {secciones.map((s) => (
              <NavLink key={s.ruta} to={s.ruta} end={s.ruta === '/'}>
                {s.nombre}
              </NavLink>
            ))}
          </nav>

          <div className="menu-usuario">
            <strong>{perfil?.nombre || sesion.user.email}</strong>
            <div className="rol">{perfil?.rol || ''}</div>
            <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
          </div>
        </aside>

        <main className="contenido">
          <Routes>
            {secciones.map((s) => (
              <Route
                key={s.ruta}
                path={s.ruta}
                element={
                  s.ruta === '/equipos' ? (
                    <Equipos esAdmin={esAdmin} />
                  ) : s.ruta === '/accesorios' ? (
                    <Accesorios esAdmin={esAdmin} />
                  ) : s.ruta === '/solicitudes' ? (
                    <Solicitudes esAdmin={esAdmin} usuarioId={usuarioId} />
                  ) : s.ruta === '/prestamos' ? (
                    <Prestamos esAdmin={esAdmin} />
                  ) : s.ruta === '/incidencias' ? (
                    <Incidencias esAdmin={esAdmin} usuarioId={usuarioId} />
                  ) : (
                    <Pagina titulo={s.nombre} texto={s.texto} />
                  )
                }
              />
            ))}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}