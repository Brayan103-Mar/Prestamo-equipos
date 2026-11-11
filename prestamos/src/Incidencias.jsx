import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function fechaHora(valor) {
  if (!valor) return ''
  return new Date(valor).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const NOMBRES_ESTADO = {
  abierta: 'abierta',
  en_seguimiento: 'en seguimiento',
  resuelta: 'resuelta',
}

export default function Incidencias({ esAdmin, usuarioId }) {
  const [incidencias, setIncidencias] = useState([])
  const [equipos, setEquipos] = useState([])
  const [form, setForm] = useState({ equipo_id: '', descripcion: '' })
  const [mantenimiento, setMantenimiento] = useState(false)
  const [editando, setEditando] = useState(null)
  const [estadoNuevo, setEstadoNuevo] = useState('abierta')
  const [notas, setNotas] = useState('')
  const [liberar, setLiberar] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    async function cargar() {
      const [resInc, resEq] = await Promise.all([
        supabase
          .from('incidencias')
          .select(
            '*, equipos(numero, tipo, marca, estado), reportante:usuarios!reportado_por(nombre)'
          )
          .order('id', { ascending: false }),
        supabase.from('equipos').select('id, numero, tipo, marca').order('numero'),
      ])
      if (resInc.error) setError(resInc.error.message)
      else setIncidencias(resInc.data)
      if (resEq.error) setError(resEq.error.message)
      else setEquipos(resEq.data)
      setCargando(false)
    }
    cargar()
  }, [version])

  async function reportar(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    setTrabajando(true)
    const equipoId = form.equipo_id ? Number(form.equipo_id) : null

    const { error } = await supabase.from('incidencias').insert({
      descripcion: form.descripcion.trim(),
      equipo_id: equipoId,
      reportado_por: usuarioId,
    })
    if (error) {
      setError(error.message)
      setTrabajando(false)
      return
    }

    let mensaje = 'Incidencia registrada.'
    if (esAdmin && mantenimiento && equipoId) {
      const { error: errEq } = await supabase
        .from('equipos')
        .update({ estado: 'mantenimiento' })
        .eq('id', equipoId)
      if (errEq) {
        setError(
          'La incidencia se guardó, pero no se pudo poner el equipo en mantenimiento: ' +
            errEq.message
        )
        mensaje = ''
      } else {
        mensaje = 'Incidencia registrada. El equipo quedó en mantenimiento.'
      }
    }

    setForm({ equipo_id: '', descripcion: '' })
    setMantenimiento(false)
    setAviso(mensaje)
    setVersion((v) => v + 1)
    setTrabajando(false)
  }

  function empezarSeguimiento(incidencia) {
    setError('')
    setAviso('')
    setEditando(incidencia)
    setEstadoNuevo(incidencia.estado)
    setNotas(incidencia.seguimiento || '')
    setLiberar(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function guardarSeguimiento(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    setTrabajando(true)

    const { error } = await supabase
      .from('incidencias')
      .update({ estado: estadoNuevo, seguimiento: notas.trim() || null })
      .eq('id', editando.id)
    if (error) {
      setError(error.message)
      setTrabajando(false)
      return
    }

    let mensaje = 'Seguimiento guardado.'
    if (liberar && editando.equipo_id) {
      const { error: errEq } = await supabase
        .from('equipos')
        .update({ estado: 'disponible' })
        .eq('id', editando.equipo_id)
      if (errEq) {
        setError(
          'El seguimiento se guardó, pero no se pudo liberar el equipo: ' + errEq.message
        )
        mensaje = ''
      } else {
        mensaje = 'Seguimiento guardado. El equipo quedó disponible.'
      }
    }

    setEditando(null)
    setAviso(mensaje)
    setVersion((v) => v + 1)
    setTrabajando(false)
  }

  const puedeLiberar =
    editando &&
    editando.equipo_id &&
    editando.equipos?.estado === 'mantenimiento' &&
    estadoNuevo === 'resuelta'

  return (
    <section className="tarjeta">
      <h2>Incidencias</h2>

      {esAdmin && editando && (
        <form className="formulario" onSubmit={guardarSeguimiento}>
          <div className="campo campo-ancho">
            <strong>
              Seguimiento de {'INC-' + String(editando.id).padStart(5, '0')}
            </strong>
            <span>{editando.descripcion}</span>
          </div>
          <label className="campo">
            Estado
            <select value={estadoNuevo} onChange={(e) => setEstadoNuevo(e.target.value)}>
              <option value="abierta">abierta</option>
              <option value="en_seguimiento">en seguimiento</option>
              <option value="resuelta">resuelta</option>
            </select>
          </label>
          <label className="campo campo-ancho">
            Seguimiento
            <textarea
              rows="3"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Qué se hizo, quién lo atiende, cuándo se resolvió..."
            />
          </label>
          {puedeLiberar && (
            <label className="check-simple campo-ancho">
              <input
                type="checkbox"
                checked={liberar}
                onChange={(e) => setLiberar(e.target.checked)}
              />
              Dejar el equipo {editando.equipos?.numero} como disponible
            </label>
          )}
          <div className="acciones-form">
            <button className="boton" type="submit" disabled={trabajando}>
              {trabajando ? 'Guardando...' : 'Guardar seguimiento'}
            </button>
            <button type="button" className="boton-chico" onClick={() => setEditando(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <form className="formulario" onSubmit={reportar}>
        <label className="campo">
          Equipo
          <select
            value={form.equipo_id}
            onChange={(e) => setForm({ ...form, equipo_id: e.target.value })}
          >
            <option value="">Sin equipo (accesorio u otro)</option>
            {equipos.map((q) => (
              <option key={q.id} value={q.id}>
                {q.numero} · {q.tipo} {q.marca}
              </option>
            ))}
          </select>
        </label>
        <label className="campo campo-ancho">
          Descripción
          <textarea
            rows="3"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Ej. La pantalla tiene una línea vertical / Faltó un Cable HDMI"
            required
          />
        </label>
        {esAdmin && (
          <label className="check-simple campo-ancho">
            <input
              type="checkbox"
              checked={mantenimiento}
              onChange={(e) => setMantenimiento(e.target.checked)}
            />
            Poner el equipo en mantenimiento
          </label>
        )}
        <div className="acciones-form">
          <button className="boton" type="submit" disabled={trabajando}>
            {trabajando ? 'Guardando...' : 'Registrar incidencia'}
          </button>
        </div>
      </form>

      {error && <p className="mensaje">{error}</p>}
      {aviso && <p className="aviso">{aviso}</p>}
      {cargando && <p>Cargando...</p>}
      {!cargando && incidencias.length === 0 && <p>No hay incidencias registradas.</p>}

      {!cargando && incidencias.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Equipo</th>
              <th>Descripción</th>
              {esAdmin && <th>Reportó</th>}
              <th>Estado</th>
              <th>Seguimiento</th>
              {esAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {incidencias.map((i) => (
              <tr key={i.id}>
                <td>{'INC-' + String(i.id).padStart(5, '0')}</td>
                <td>{fechaHora(i.fecha)}</td>
                <td>{i.equipos?.numero || 'Sin equipo'}</td>
                <td>{i.descripcion}</td>
                {esAdmin && <td>{i.reportante?.nombre}</td>}
                <td>
                  <span className={'etiqueta ' + i.estado}>{NOMBRES_ESTADO[i.estado]}</span>
                </td>
                <td>{i.seguimiento}</td>
                {esAdmin && (
                  <td>
                    <button className="boton-chico" onClick={() => empezarSeguimiento(i)}>
                      Dar seguimiento
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}