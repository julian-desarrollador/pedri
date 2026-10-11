'use client'

import { useState, useEffect } from 'react'
import { IoAdd, IoPencil } from 'react-icons/io5'
import GastoModal, { GastoFormValues } from '@/components/GastoModal'
import { useModal } from '@/contexts/ModalContext'

interface Gasto {
  id: string
  mes: string
  tipoGasto: string
  propiedad: string
  monto: number
  nota?: string
  moneda: 'ARS' | 'USD'
}

function humanizeCategoria(c: string) {
  const x = (c || '').toLowerCase()
  if (x === 'limpieza') return 'Limpieza'
  if (x === 'mantenimiento') return 'Mantenimiento'
  if (x === 'servicios') return 'Servicios'
  if (x === 'impuestos') return 'Impuestos'
  return 'Otros'
}

function mapCategoria(t: string): 'limpieza' | 'mantenimiento' | 'servicios' | 'impuestos' | 'otros' {
  const norm = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  const m = norm(t)
  if (m.includes('limpieza')) return 'limpieza'
  if (m.includes('reparac') || m.includes('mantenimiento')) return 'mantenimiento'
  if (m.includes('wifi') || m.includes('cable') || m.includes('servicio')) return 'servicios'
  if (m.includes('impuesto')) return 'impuestos'
  if (m.includes('comision') && m.includes('plataforma')) return 'servicios'
  return 'otros'
}

function mapGasto(g: any): Gasto {
  const fecha = g.fecha ? new Date(g.fecha) : null
  const mes = fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : ''
  const tipoGuardado = typeof g.tipo === 'string' ? g.tipo.trim() : ''
  return {
    id: String(g._id),
    mes,
    tipoGasto: tipoGuardado || humanizeCategoria(g.categoria),
    propiedad: g.propiedadId?.nombre || '',
    monto: Number(g.monto || 0),
    nota: g.nota || g.notas || '',
    moneda: g.moneda === 'USD' ? 'USD' : 'ARS',
  }
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [propiedades, setPropiedades] = useState<Array<{ id: string; nombre: string }>>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Gasto | null>(null)
  const { setIsModalOpen: setGlobalModalOpen } = useModal()
  const [orderBy, setOrderBy] = useState<'mes' | 'costo'>('mes')
  const [openOrder, setOpenOrder] = useState(false)
  const [hasCustomOrder, setHasCustomOrder] = useState(false)

  // Sincronizar estado local con contexto global
  useEffect(() => {
    setGlobalModalOpen(isModalOpen)
  }, [isModalOpen, setGlobalModalOpen])

  // Helper de orden
  const sortGastos = (arr: Gasto[]) => {
    const copy = [...arr]
    if (orderBy === 'costo') {
      return copy.sort((a, b) => b.monto - a.monto)
    }
    // orderBy === 'mes' -> más recientes primero
    const parseMes = (m: string) => {
      const [y, mo] = (m || '0000-00').split('-').map((n) => parseInt(n, 10) || 0)
      return y * 100 + mo
    }
    return copy.sort((a, b) => parseMes(b.mes) - parseMes(a.mes))
  }

  // Cargar propiedades y gastos
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setErrorMsg(null)
        const [resProps, resGastos] = await Promise.all([
          fetch('/api/propiedades'),
          fetch('/api/gastos'),
        ])
        if (!resProps.ok) throw new Error('props')
        const propsJson = await resProps.json()
        const propsList: Array<{ _id: string; nombre: string }> = Array.isArray(propsJson?.propiedades) ? propsJson.propiedades : []
        setPropiedades(propsList.map(p => ({ id: String(p._id), nombre: p.nombre })))

        const gastosJson = await resGastos.json()
        const list: any[] = Array.isArray(gastosJson?.gastos) ? gastosJson.gastos : []
        setGastos(sortGastos(list.map(mapGasto)))
      } catch (e) {
        setErrorMsg('No se pudieron cargar los gastos.')
        setGastos([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Reordenar cuando cambia el criterio
  useEffect(() => {
    setGastos((prev) => sortGastos(prev))
  }, [orderBy])

  const formatearMes = (mes: string) => {
    const [año, mesNum] = mes.split('-')
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    return `${meses[parseInt(mesNum) - 1]} ${año}`
  }

  const formatearMonto = (monto: number, moneda: 'ARS' | 'USD' = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(monto)
  }

  const cerrarModal = () => {
    setIsModalOpen(false)
    setEditing(null)
  }

  const handleGuardarGasto = async (form: GastoFormValues) => {
    const editandoId = editing?.id
    try {
      const categoria = mapCategoria(form.tipoGasto)
      const prop = propiedades.find(p => p.nombre === form.propiedad)
      if (!prop) {
        setErrorMsg('Propiedad no encontrada. Actualizá la lista de propiedades.')
        return
      }
      const [y, m] = form.mes.split('-').map(Number)
      const fecha = new Date(y, (m || 1) - 1, 1).toISOString()
      const payload = {
        propiedadId: prop.id,
        categoria,
        tipo: form.tipoGasto,
        fecha,
        monto: Number(form.monto || 0),
        moneda: form.moneda || 'ARS',
        nota: (form.nota || '').trim(),
      }
      const res = await fetch(editandoId ? `/api/gastos/${editandoId}` : '/api/gastos', {
        method: editandoId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(String(res.status))
      const resList = await fetch('/api/gastos')
      const json = await resList.json()
      const list: any[] = Array.isArray(json?.gastos) ? json.gastos : []
      setGastos(sortGastos(list.map(mapGasto)))
      setErrorMsg(null)
    } catch (e) {
      setErrorMsg(editandoId ? 'No se pudo actualizar el gasto.' : 'No se pudo guardar el gasto.')
    }
  }

  return (
    <main className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="px-4 py-6">
        {errorMsg && <div className="mb-3 text-xs text-red-400">{errorMsg}</div>}
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Gastos</h1>
          <div className="flex items-start justify-between">
            <p className="text-sm text-zinc-400">Registro de todos los gastos</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenOrder((v) => !v)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white hover:bg-zinc-800 transition-colors"
              >
                {hasCustomOrder ? (orderBy === 'mes' ? 'Mes' : 'Costo') : 'Orden'}
              </button>
              {openOrder && (
                <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-10 min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => { setOrderBy('mes'); setHasCustomOrder(true); setOpenOrder(false) }}
                    className={`w-full text-left px-4 py-2 text-sm ${orderBy === 'mes' ? 'bg-zinc-800 text-white' : 'text-zinc-200 hover:bg-zinc-800'}`}
                  >
                    Mes
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOrderBy('costo'); setHasCustomOrder(true); setOpenOrder(false) }}
                    className={`w-full text-left px-4 py-2 text-sm ${orderBy === 'costo' ? 'bg-zinc-800 text-white' : 'text-zinc-200 hover:bg-zinc-800'}`}
                  >
                    Costo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>



        {/* Lista de gastos */}
        {loading ? (
          <div className="text-gray-400 text-sm">Cargando...</div>
        ) : (
        <div className="space-y-4">
          {gastos.map((gasto) => (
            <div
              key={gasto.id}
              className="bg-zinc-900 rounded-xl border border-zinc-800 p-4"
            >
              {/* Mes y tipo de gasto */}
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-1.5">
                  <span className="text-xs font-medium text-zinc-200 capitalize">
                    {formatearMes(gasto.mes)}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-zinc-400 truncate">
                    {gasto.tipoGasto}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null)
                      setEditing(gasto)
                      setIsModalOpen(true)
                    }}
                    className="shrink-0 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    title="Editar gasto"
                    aria-label="Editar gasto"
                  >
                    <IoPencil className="text-white" />
                  </button>
                </div>
              </div>

              {/* Propiedad y monto (minimalista) alineados con el chip del mes */}
              <div className="pl-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white truncate pr-3">{gasto.propiedad}</h3>
                <p className="text-md font-bold text-red-400">{formatearMonto(gasto.monto, gasto.moneda)}</p>
              </div>

              {/* Nota (si existe) alineada con el chip del mes */}
              {gasto.nota ? (
                <p className="pl-4 mt-2 text-sm text-zinc-300 whitespace-pre-wrap">{gasto.nota}</p>
              ) : null}
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Botón flotante de agregar */}
      <button
        onClick={() => {
          setEditing(null)
          setIsModalOpen(true)
        }}
        className="fixed bottom-20 right-4 md:bottom-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-[80]"
      >
        <IoAdd className="text-3xl" />
      </button>

      {/* Modal de nuevo gasto */}
      <GastoModal
        key={editing?.id || 'nuevo'}
        isOpen={isModalOpen}
        onClose={cerrarModal}
        onSubmit={handleGuardarGasto}
        propertyNames={propiedades.map(p => p.nombre)}
        mode={editing ? 'edit' : 'create'}
        initial={editing ? {
          mes: editing.mes,
          tipoGasto: editing.tipoGasto,
          propiedad: editing.propiedad,
          monto: editing.monto,
          nota: editing.nota,
          moneda: editing.moneda,
        } : undefined}
      />
    </main>
  )
}

