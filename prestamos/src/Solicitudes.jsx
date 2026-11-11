import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const VACIO = {
  fecha: '',
  hora_inicio: '',
  hora_fin: '',
  salon: '',
  grupo: '',
  observaciones: '',
}

function hoy() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + mes + '-' + dia
}

function fechaBonita(fecha) {
  return fecha.split('-').reverse().join('/')
}

export default function Solicitudes({ esAdmin, usuarioId }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [equipos, setEquipos] = useState([])
  const [form, setForm] = useState(VACIO)
  const [seleccion, setSeleccion] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    async function cargar() {
      let consulta = supabase
        .from('solicitudes')
        .select('*, usuarios(nombre), solicitud_equipos(equipos(numero, tipo, marca))')
        .order('fecha', { ascending: false })
        .order('id', { ascending: false })
      if (!esAdmin) consulta = consulta.eq('profesor_id', usuarioId)

      const [resSol, resEq] = await Promise.all([
        consulta,
        supabase
          .from('equipos')
          .select('id, numero, tipo, marca, modelo')
          .neq('estado', 'mantenimiento')
          .order('numero'),
      ])
      if (resSol.error) setError(resSol.error.message)
      else setSolicitudes(resSol.data)
      if (resEq.error) setError(resEq.error.message)
      else setEquipos(resEq.data)
      setCargando(false)
    }
    cargar()
  }, [version, esAdmin, usuarioId])

  function cambiar(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function alternar(id) {
    setSeleccion((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    )
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setAviso('')

    if (seleccion.length === 0) {
      setError('Elige al menos un equipo.')
      return
    }
    if (form.hora_inicio >= form.hora_fin) {
      setError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }

    setGuardando(true)

    // Revisar que los equipos no estén pedidos en un horario que se cruce
    const { data: ocupados, error: errOcupados } = await supabase
      .from('solicitud_equipos')
      .select('equipo_id, solicitudes!inner(fecha, hora_inicio, hora_fin, estado)')
      .in('equipo_id', seleccion)
      .eq('solicitudes.fecha', form.fecha)
      .in('solicitudes.estado', ['pendiente', 'autorizada'])

    if (errOcupados) {
      setError(errOcupados.message)
      setGuardando(false)
      return
    }

    const choques = ocupados.filter((o) => {
      const ini = (o.solicitudes.hora_inicio || '00:00').slice(0, 5)
      const fin = (o.solicitudes.hora_fin || '23:59').slice(0, 5)
      return form.hora_inicio < fin && ini < form.hora_fin
    })

    if (choques.length > 0) {
      const nombres = [
        ...new Set(
          choques.map(
            (c) => equipos.find((q) => q.id === c.equipo_id)?.numero || c.equipo_id
          )
        ),
      ]
      setError('Estos equipos ya están solicitados en ese horario: ' + nombres.join(', '))
      setGuardando(false)
      return
    }

    const { data: nueva, error: errSol } = await supabase
      .from('solicitudes')
      .insert({
        profesor_id: usuarioId,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        salon: form.salon.trim() || null,
        grupo: form.grupo.trim() || null,
        observaciones: form.observaciones.trim() || null,
      })
      .select('id')
      .single()

    if (errSol) {
      setError(errSol.message)
      setGuardando(false)
      return
    }

    const { error: errEq } = await supabase
      .from('solicitud_equipos')
      .insert(seleccion.map((id) => ({ solicitud_id: nueva.id, equipo_id: id })))

    if (errEq) {
      await supabase.from('solicitudes').update({ estado: 'cancelada' }).eq('id', nueva.id)
      setError('No se pudieron guardar los equipos de la solicitud: ' + errEq.message)
      setGuardando(false)
      return
    }

    setForm(VACIO)
    setSeleccion([])
    setAviso('Solicitud enviada. Queda pendiente de autorización.')
    setVersion((v) => v + 1)
    setGuardando(false)
  }

  async function cambiarEstado(id, estado) {
    setError('')
    setAviso('')
    const { error } = await supabase.from('solicitudes').update({ estado }).eq('id', id)
    if (error) setError(error.message)
    else setVersion((v) => v + 1)
  }

  return (
    <section className="tarjeta">
      <h2>Solicitudes</h2>

      <form className="formulario" onSubmit={guardar}>
        <label className="campo">
          Fecha
          <input
            type="date"
            name="fecha"
            min={hoy()}
            value={form.fecha}
            onChange={cambiar}
            required
          />
        </label>
        <label className="campo">
          Hora de inicio
          <input
            type="time"
            name="hora_inicio"
            value={form.hora_inicio}
            onChange={cambiar}
            required
          />
        </label>
        <label className="campo">
          Hora de fin
          <input
            type="time"
            name="hora_fin"
            value={form.hora_fin}
            onChange={cambiar}
            required
          />
        </label>
        <label className="campo">
          Salón
          <input name="salon" value={form.salon} onChange={cambiar} required />
        </label>
        <label className="campo">
          Grupo
          <input name="grupo" value={form.grupo} onChange={cambiar} required />
        </label>
        <label className="campo">
          Observaciones
          <input name="observaciones" value={form.observaciones} onChange={cambiar} />
        </label>

        <div className="campo campo-ancho">
          Equipos que necesitas
          <div className="checks">
            {equipos.map((e) => (
              <label key={e.id} className="check">
                <input
                  type="checkbox"
                  checked={seleccion.includes(e.id)}
                  onChange={() => alternar(e.id)}
                />
                {e.numero} · {e.tipo} {e.marca}
              </label>
            ))}
          </div>
        </div>

        <div className="acciones-form">
          <button className="boton" type="submit" disabled={guardando}>
            {guardando ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </form>

      {error && <p className="mensaje">{error}</p>}
      {aviso && <p className="aviso">{aviso}</p>}
      {cargando && <p>Cargando...</p>}
      {!cargando && solicitudes.length === 0 && <p>No hay solicitudes todavía.</p>}

      {!cargando && solicitudes.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Salón / Grupo</th>
              <th>Equipos</th>
              {esAdmin && <th>Solicitante</th>}
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id}>
                <td>{'SOL-' + String(s.id).padStart(5, '0')}</td>
                <td>{fechaBonita(s.fecha)}</td>
                <td>
                  {(s.hora_inicio || '').slice(0, 5)} - {(s.hora_fin || '').slice(0, 5)}
                </td>
                <td>
                  {s.salon} / {s.grupo}
                </td>
                <td>
                  {s.solicitud_equipos.map((x) => x.equipos?.numero).join(', ')}
                </td>
                {esAdmin && <td>{s.usuarios?.nombre}</td>}
                <td>
                  <span className={'etiqueta ' + s.estado}>{s.estado}</span>
                </td>
                <td>
                  {esAdmin && s.estado === 'pendiente' && (
                    <>
                      <button
                        className="boton-chico"
                        onClick={() => cambiarEstado(s.id, 'autorizada')}
                      >
                        Autorizar
                      </button>
                      <button
                        className="boton-chico peligro"
                        onClick={() => cambiarEstado(s.id, 'rechazada')}
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {(s.estado === 'pendiente' ||
                    (esAdmin && s.estado === 'autorizada')) && (
                    <button
                      className="boton-chico"
                      onClick={() => cambiarEstado(s.id, 'cancelada')}
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}