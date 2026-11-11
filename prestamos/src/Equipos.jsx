import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const TIPOS = ['Laptop', 'Computadora de escritorio', 'Proyector', 'Otro']
const ESTADOS = ['disponible', 'solicitado', 'prestado', 'mantenimiento']
const VACIO = {
  numero: '',
  tipo: 'Laptop',
  marca: '',
  modelo: '',
  numero_serie: '',
  estado: 'disponible',
}

export default function Equipos({ esAdmin }) {
  const [equipos, setEquipos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('numero')
      if (error) {
        setError(error.message)
      } else {
        setEquipos(data)
      }
      setCargando(false)
    }
    cargar()
  }, [version])

  function cambiar(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    const datos = {
      numero: form.numero.trim(),
      tipo: form.tipo,
      marca: form.marca.trim(),
      modelo: form.modelo.trim() || null,
      numero_serie: form.numero_serie.trim() || null,
      estado: form.estado,
    }
    const { error } = editandoId
      ? await supabase.from('equipos').update(datos).eq('id', editandoId)
      : await supabase.from('equipos').insert(datos)
    if (error) {
      setError(error.message)
    } else {
      setForm(VACIO)
      setEditandoId(null)
      setVersion((v) => v + 1)
    }
    setGuardando(false)
  }

  function editar(equipo) {
    setError('')
    setEditandoId(equipo.id)
    setForm({
      numero: equipo.numero,
      tipo: equipo.tipo,
      marca: equipo.marca,
      modelo: equipo.modelo || '',
      numero_serie: equipo.numero_serie || '',
      estado: equipo.estado,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    setEditandoId(null)
    setForm(VACIO)
    setError('')
  }

  async function eliminar(equipo) {
    if (!window.confirm('¿Eliminar el equipo ' + equipo.numero + '?')) return
    setError('')
    const { error } = await supabase.from('equipos').delete().eq('id', equipo.id)
    if (error) {
      setError(
        'No se pudo eliminar. Si el equipo ya tiene préstamos, cámbiale el estado a "mantenimiento" en lugar de eliminarlo. Detalle: ' +
          error.message
      )
    } else {
      setVersion((v) => v + 1)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Equipos</h2>

      {esAdmin && (
        <form className="formulario" onSubmit={guardar}>
          <label className="campo">
            Número
            <input name="numero" value={form.numero} onChange={cambiar} required />
          </label>
          <label className="campo">
            Tipo
            <select name="tipo" value={form.tipo} onChange={cambiar}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            Marca
            <input name="marca" value={form.marca} onChange={cambiar} required />
          </label>
          <label className="campo">
            Modelo
            <input name="modelo" value={form.modelo} onChange={cambiar} />
          </label>
          <label className="campo">
            Número de serie
            <input name="numero_serie" value={form.numero_serie} onChange={cambiar} />
          </label>
          <label className="campo">
            Estado
            <select name="estado" value={form.estado} onChange={cambiar}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="acciones-form">
            <button className="boton" type="submit" disabled={guardando}>
              {editandoId ? 'Guardar cambios' : 'Agregar equipo'}
            </button>
            {editandoId && (
              <button type="button" className="boton-chico" onClick={cancelar}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {error && <p className="mensaje">{error}</p>}
      {cargando && <p>Cargando...</p>}

      {!cargando && equipos.length === 0 && <p>No hay equipos registrados.</p>}

      {!cargando && equipos.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Número</th>
              <th>Tipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Serie</th>
              <th>Estado</th>
              {esAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {equipos.map((e) => (
              <tr key={e.id}>
                <td>{e.numero}</td>
                <td>{e.tipo}</td>
                <td>{e.marca}</td>
                <td>{e.modelo}</td>
                <td>{e.numero_serie}</td>
                <td>
                  <span className={'etiqueta ' + e.estado}>{e.estado}</span>
                </td>
                {esAdmin && (
                  <td>
                    <button className="boton-chico" onClick={() => editar(e)}>
                      Editar
                    </button>
                    <button className="boton-chico peligro" onClick={() => eliminar(e)}>
                      Eliminar
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