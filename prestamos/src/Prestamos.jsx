import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function fechaBonita(fecha) {
  return fecha.split('-').reverse().join('/')
}

function fechaHora(valor) {
  if (!valor) return ''
  return new Date(valor).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function traducir(mensaje) {
  if (mensaje.includes('un_equipo_activo')) {
    return 'Alguno de los equipos ya está en un préstamo activo y todavía no se ha devuelto.'
  }
  return mensaje
}

export default function Prestamos({ esAdmin }) {
  const [pendientes, setPendientes] = useState([])
  const [prestamos, setPrestamos] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [enUso, setEnUso] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [entregando, setEntregando] = useState(null)
  const [cantidades, setCantidades] = useState({})
  const [devolviendo, setDevolviendo] = useState(null)
  const [recibidas, setRecibidas] = useState({})
  const [obs, setObs] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    async function cargar() {
      const resPrestamos = await supabase
        .from('prestamos')
        .select(
          '*, profesor:usuarios!profesor_id(nombre), prestamo_equipos(equipos(numero)), accesorios(id, cantidad_entregada, cantidad_recibida, catalogo_accesorios(nombre))'
        )
        .order('id', { ascending: false })
      if (resPrestamos.error) setError(resPrestamos.error.message)
      else setPrestamos(resPrestamos.data)

      if (esAdmin) {
        const [resSol, resCat, resUso] = await Promise.all([
          supabase
            .from('solicitudes')
            .select(
              '*, usuarios(nombre), solicitud_equipos(equipos(numero)), prestamos(id)'
            )
            .eq('estado', 'autorizada')
            .order('fecha'),
          supabase.from('catalogo_accesorios').select('*').order('nombre'),
          supabase
            .from('accesorios')
            .select('catalogo_id, cantidad_entregada, prestamos!inner(estado)')
            .eq('prestamos.estado', 'activo'),
        ])
        if (resSol.error) setError(resSol.error.message)
        else setPendientes(resSol.data.filter((s) => s.prestamos.length === 0))
        if (resCat.error) setError(resCat.error.message)
        else setCatalogo(resCat.data)
        if (resUso.error) {
          setError(resUso.error.message)
        } else {
          const mapa = {}
          resUso.data.forEach((a) => {
            mapa[a.catalogo_id] = (mapa[a.catalogo_id] || 0) + a.cantidad_entregada
          })
          setEnUso(mapa)
        }
      }
      setCargando(false)
    }
    cargar()
  }, [version, esAdmin])

  function empezarEntrega(solicitud) {
    setError('')
    setAviso('')
    setDevolviendo(null)
    setEntregando(solicitud)
    setCantidades({})
    setObs('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function confirmarEntrega(e) {
    e.preventDefault()
    setTrabajando(true)
    setError('')
    const lista = Object.entries(cantidades)
      .map(([id, c]) => ({ catalogo_id: Number(id), cantidad: Number(c) }))
      .filter((x) => x.cantidad > 0)
    const { error } = await supabase.rpc('entregar_prestamo', {
      p_solicitud_id: entregando.id,
      p_accesorios: lista,
      p_obs: obs,
    })
    if (error) {
      setError(traducir(error.message))
    } else {
      setEntregando(null)
      setAviso('Entrega registrada. Los equipos quedaron como "prestado".')
      setVersion((v) => v + 1)
    }
    setTrabajando(false)
  }

  function empezarDevolucion(prestamo) {
    setError('')
    setAviso('')
    setEntregando(null)
    const inicial = {}
    prestamo.accesorios.forEach((a) => {
      inicial[a.id] = a.cantidad_entregada
    })
    setDevolviendo(prestamo)
    setRecibidas(inicial)
    setObs('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function confirmarDevolucion(e) {
    e.preventDefault()
    setTrabajando(true)
    setError('')
    const lista = devolviendo.accesorios.map((a) => ({
      id: a.id,
      recibida: Number(recibidas[a.id]),
    }))
    const faltantes = devolviendo.accesorios
      .filter((a) => Number(recibidas[a.id]) < a.cantidad_entregada)
      .map(
        (a) =>
          a.catalogo_accesorios?.nombre +
          ' (faltan ' +
          (a.cantidad_entregada - Number(recibidas[a.id])) +
          ')'
      )
    const { error } = await supabase.rpc('devolver_prestamo', {
      p_prestamo_id: devolviendo.id,
      p_accesorios: lista,
      p_obs: obs,
    })
    if (error) {
      setError(traducir(error.message))
    } else {
      setDevolviendo(null)
      setAviso(
        faltantes.length > 0
          ? 'Devolución registrada. Faltantes: ' + faltantes.join(', ')
          : 'Devolución registrada. Todo se recibió completo.'
      )
      setVersion((v) => v + 1)
    }
    setTrabajando(false)
  }

  return (
    <section className="tarjeta">
      <h2>Préstamos</h2>

      {error && <p className="mensaje">{error}</p>}
      {aviso && <p className="aviso">{aviso}</p>}

      {esAdmin && entregando && (
        <form className="formulario" onSubmit={confirmarEntrega}>
          <div className="campo campo-ancho">
            <strong>
              Entregar {'SOL-' + String(entregando.id).padStart(5, '0')} a{' '}
              {entregando.usuarios?.nombre}
            </strong>
            <span>
              Equipos:{' '}
              {entregando.solicitud_equipos.map((x) => x.equipos?.numero).join(', ')}
            </span>
          </div>

          <div className="campo campo-ancho">
            Accesorios a entregar
            <div className="accesorios-lista">
              {catalogo.map((c) => {
                const disponibles = c.cantidad_total - (enUso[c.id] || 0)
                return (
                  <label key={c.id} className="accesorio-fila">
                    <span>
                      {c.nombre} <small>(disponibles: {disponibles})</small>
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={disponibles}
                      disabled={disponibles <= 0}
                      value={cantidades[c.id] ?? 0}
                      onChange={(e) =>
                        setCantidades({ ...cantidades, [c.id]: e.target.value })
                      }
                    />
                  </label>
                )
              })}
            </div>
          </div>

          <label className="campo campo-ancho">
            Observaciones de la entrega
            <input value={obs} onChange={(e) => setObs(e.target.value)} />
          </label>

          <div className="acciones-form">
            <button className="boton" type="submit" disabled={trabajando}>
              {trabajando ? 'Guardando...' : 'Confirmar entrega'}
            </button>
            <button
              type="button"
              className="boton-chico"
              onClick={() => setEntregando(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {esAdmin && devolviendo && (
        <form className="formulario" onSubmit={confirmarDevolucion}>
          <div className="campo campo-ancho">
            <strong>
              Devolución de {'PRE-' + String(devolviendo.id).padStart(5, '0')}
            </strong>
            <span>
              Equipos:{' '}
              {devolviendo.prestamo_equipos.map((x) => x.equipos?.numero).join(', ')}
            </span>
          </div>

          <div className="campo campo-ancho">
            Accesorios recibidos
            {devolviendo.accesorios.length === 0 && (
              <span>Este préstamo no incluyó accesorios.</span>
            )}
            <div className="accesorios-lista">
              {devolviendo.accesorios.map((a) => (
                <label key={a.id} className="accesorio-fila">
                  <span>
                    {a.catalogo_accesorios?.nombre}{' '}
                    <small>(entregados: {a.cantidad_entregada})</small>
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={recibidas[a.id] ?? 0}
                    onChange={(e) =>
                      setRecibidas({ ...recibidas, [a.id]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="campo campo-ancho">
            Observaciones de la devolución
            <input value={obs} onChange={(e) => setObs(e.target.value)} />
          </label>

          <div className="acciones-form">
            <button className="boton" type="submit" disabled={trabajando}>
              {trabajando ? 'Guardando...' : 'Confirmar devolución'}
            </button>
            <button
              type="button"
              className="boton-chico"
              onClick={() => setDevolviendo(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando && <p>Cargando...</p>}

      {esAdmin && !cargando && (
        <>
          <h3 className="seccion-titulo">Pendientes de entrega</h3>
          {pendientes.length === 0 ? (
            <p>No hay solicitudes autorizadas pendientes de entrega.</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Salón / Grupo</th>
                  <th>Equipos</th>
                  <th>Solicitante</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((s) => (
                  <tr key={s.id}>
                    <td>{'SOL-' + String(s.id).padStart(5, '0')}</td>
                    <td>{fechaBonita(s.fecha)}</td>
                    <td>
                      {(s.hora_inicio || '').slice(0, 5)} - {(s.hora_fin || '').slice(0, 5)}
                    </td>
                    <td>
                      {s.salon} / {s.grupo}
                    </td>
                    <td>{s.solicitud_equipos.map((x) => x.equipos?.numero).join(', ')}</td>
                    <td>{s.usuarios?.nombre}</td>
                    <td>
                      <button className="boton-chico" onClick={() => empezarEntrega(s)}>
                        Entregar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {!cargando && (
        <>
          <h3 className="seccion-titulo">Historial de préstamos</h3>
          {prestamos.length === 0 ? (
            <p>Todavía no hay préstamos registrados.</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  {esAdmin && <th>Solicitante</th>}
                  <th>Equipos</th>
                  <th>Accesorios</th>
                  <th>Entrega</th>
                  <th>Devolución</th>
                  <th>Estado</th>
                  {esAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {prestamos.map((p) => (
                  <tr key={p.id}>
                    <td>{'PRE-' + String(p.id).padStart(5, '0')}</td>
                    {esAdmin && <td>{p.profesor?.nombre}</td>}
                    <td>{p.prestamo_equipos.map((x) => x.equipos?.numero).join(', ')}</td>
                    <td>
                      {p.accesorios.length === 0 && 'Ninguno'}
                      {p.accesorios.map((a) => {
                        const falta =
                          a.cantidad_recibida !== null &&
                          a.cantidad_recibida < a.cantidad_entregada
                        return (
                          <div key={a.id} className={falta ? 'faltante' : ''}>
                            {a.catalogo_accesorios?.nombre} ×{a.cantidad_entregada}
                            {a.cantidad_recibida !== null &&
                              ' (recibidos: ' + a.cantidad_recibida + ')'}
                          </div>
                        )
                      })}
                    </td>
                    <td>{fechaHora(p.fecha_entrega)}</td>
                    <td>{fechaHora(p.fecha_devolucion)}</td>
                    <td>
                      <span className={'etiqueta ' + p.estado}>{p.estado}</span>
                    </td>
                    {esAdmin && (
                      <td>
                        {p.estado === 'activo' && (
                          <button
                            className="boton-chico"
                            onClick={() => empezarDevolucion(p)}
                          >
                            Registrar devolución
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}