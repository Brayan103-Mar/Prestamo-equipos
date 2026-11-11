import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Equipos from './Equipos'
import Accesorios from './Accesorios'
import Solicitudes from './Solicitudes'
import Prestamos from './Prestamos'
import Incidencias from './Incidencias'

const secciones = [
  { 
    nombre: 'Sistema General de Préstamo', 
    texto: '¡Bienvenido usuario! Recuerda que el préstamo de equipos debe realizarse con al menos 24 horas de anticipación del día que lo requieras.' 
  },
  { nombre: 'Equipos', texto: 'Aquí se registrarán y consultarán los equipos de cómputo.' },
  { nombre: 'Solicitudes', texto: 'Aquí se registrarán las solicitudes de préstamo.' },
  { nombre: 'Préstamos', texto: 'Aquí se me controlarán los préstamos y las devoluciones.' },
  { nombre: 'Accesorios', texto: 'Aquí se registrarán los accesorios de los equipos.' },
  { nombre: 'Incidencias', texto: 'Aquí se reportarán las incidencias de los equipos.' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [seccionActual, setSeccionActual] = useState('Sistema General de Préstamo')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return <Login />
  }

  const renderContenido = () => {
    switch (seccionActual) {
      case 'Equipos':
        return <Equipos />
      case 'Accesorios':
        return <Accesorios />
      case 'Solicitudes':
        return <Solicitudes />
      case 'Préstamos':
        return <Prestamos />
      case 'Incidencias':
        return <Incidencias />
      default:
        const seccionInicio = secciones.find(s => s.nombre === 'Sistema General de Préstamo')
        return (
          <div className="tarjeta">
            <h2>{seccionInicio?.nombre}</h2>
            <p>{seccionInicio?.texto}</p>
          </div>
        )
    }
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="Logo" className="logo" />
          <h2>Préstamo de equipos</h2>
        </div>
        <nav className="menu">
          {secciones.map((sec) => (
            <button
              key={sec.nombre}
              className={`menu-item ${seccionActual === sec.nombre ? 'activo' : ''}`}
              onClick={() => setSeccionActual(sec.nombre)}
            >
              {sec.nombre === 'Sistema General de Préstamo' ? 'Inicio' : sec.nombre}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="usuario-nombre">{session.user.email}</p>
          <button className="btn-logout" onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="contenido">{renderContenido()}</main>
    </div>
  )
}