import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const VACIO = { nombre: '', cantidad_total: 0 }

export default function Accesorios({ esAdmin }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('catalogo_accesorios')
        .select('*')
        .order('nombre')
      if (error) {
        setError(error.message)
      } else {
        setLista(data)
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
      nombre: form.nombre.trim(),
      cantidad_total: Number(form.cantidad_total),
    }
    const { error } = editandoId
      ? await supabase.from('catalogo_accesorios').update(datos).eq('id', editandoId)
      : await supabase.from('catalogo_accesorios').insert(datos)
    if (error) {
      setError(error.message)
    } else {
      setForm(VACIO)
      setEditandoId(null)
      setVersion((v) => v + 1)
    }
    setGuardando(false)
  }

  function editar(item) {
    setError('')
    setEditandoId(item.id)
    setForm({ nombre: item.nombre, cantidad_total: item.cantidad_total })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    setEditandoId(null)
    setForm(VACIO)
    setError('')
  }

  async function eliminar(item) {
    if (!window.confirm('¿Eliminar "' + item.nombre + '" del catálogo?')) return
    setError('')
    const { error } = await supabase
      .from('catalogo_accesorios')
      .delete()
      .eq('id', item.id)
    if (error) {
      setError(
        'No se pudo eliminar. Si ya se usó en algún préstamo, cambia su cantidad a 0 en lugar de eliminarlo. Detalle: ' +
          error.message
      )
    } else {
      setVersion((v) => v + 1)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Accesorios</h2>

      {esAdmin && (
        <form className="formulario" onSubmit={guardar}>
          <label className="campo">
            Nombre del accesorio
            <input
              name="nombre"
              value={form.nombre}
              onChange={cambiar}
              placeholder="Ej. Cable HDMI"
              required
            />
          </label>
          <label className="campo">
            Cantidad total
            <input
              name="cantidad_total"
              type="number"
              min="0"
              value={form.cantidad_total}
              onChange={cambiar}
              required
            />
          </label>
          <div className="acciones-form">
            <button className="boton" type="submit" disabled={guardando}>
              {editandoId ? 'Guardar cambios' : 'Agregar accesorio'}
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
      {!cargando && lista.length === 0 && <p>No hay accesorios registrados.</p>}

      {!cargando && lista.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Accesorio</th>
              <th>Cantidad total</th>
              {esAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id}>
                <td>{a.nombre}</td>
                <td>{a.cantidad_total}</td>
                {esAdmin && (
                  <td>
                    <button className="boton-chico" onClick={() => editar(a)}>
                      Editar
                    </button>
                    <button className="boton-chico peligro" onClick={() => eliminar(a)}>
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