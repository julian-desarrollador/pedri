'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { IoChevronDown, IoClose, IoPencil, IoTrashOutline } from 'react-icons/io5'
import RangeDatePicker from '@/components/RangeDatePicker'

interface ReservaItem {
  id: string
  desde: string
  hasta: string
  propiedadId?: string
  propiedad: string
  huesped: string
  telefono: string
  valorTotal: number
  sena: number
  comision: number
  propietario: number
  plataforma: 'Airbnb' | 'Booking' | 'Particular' | string
  numeroHuespedes?: number
  estado?: string
  externalUid?: string
  externalSource?: string
}

interface PropiedadItem {
  _id: string
  nombre: string
}

export default function ReservasPage() {
  const [reservas, setReservas] = useState<ReservaItem[]>([])
  const [propiedadesCatalogo, setPropiedadesCatalogo] = useState<PropiedadItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editDeleting, setEditDeleting] = useState(false)
  const [openFiltro, setOpenFiltro] = useState(false)
  const [propiedadFiltro, setPropiedadFiltro] = useState<string>('Todas')
  const [fechaIngresoDesde, setFechaIngresoDesde] = useState('')
  const [fechaIngresoHasta, setFechaIngresoHasta] = useState('')
  const propiedades = Array.from(new Set(reservas.map(r => r.propiedad)))
  const filtroRef = useRef<HTMLDivElement | null>(null)

  const emitirCambioReservas = () => {
    try {
      localStorage.setItem('reservasUpdatedAt', String(Date.now()))
    } catch {}
    try {
      window.dispatchEvent(new Event('reservas:changed'))
    } catch {}
  }

  // Parse seguro para fechas "YYYY-MM-DD" sin desfase por timezone.
  // Evita el bug de `new Date('YYYY-MM-DD')` que se interpreta en UTC y en AR (UTC-3) cae en el día anterior.
  const parseFechaYMD = (value: string) => {
    const [y, m, d] = (value || '').slice(0, 10).split('-')
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  const toMiddayUtcIso = (ymd: string) => {
    if (!ymd) return ''
    return new Date(`${ymd}T12:00:00Z`).toISOString()
  }

  const mapReservasFromApi = (list: any[]): ReservaItem[] => {
    const safeList = Array.isArray(list) ? list : []
    const filtered = safeList.filter((r: any) => {
      const st = String(r?.estado || '').toLowerCase()
      return st !== 'cancelada'
    })
    return filtered.map((r: any) => {
      const origen = r.origen || 'Particular'
      const valorTotal = Number(r.precioTotal || 0)
      const sena = Math.max(0, Number(r.sena || 0) || 0)
      const pct = (r.propiedadId && typeof (r.propiedadId as any).comisionPorcentaje === 'number')
        ? (r.propiedadId as any).comisionPorcentaje
        : 10
      const comision = Math.round((valorTotal * pct) / 100)
      const propietario = Math.max(0, valorTotal - comision)
      const propNombre = r.propiedadId?.nombre || r.propiedad || '—'
      const toYMD = (d: string | Date | undefined) => {
        if (!d) return ''
        if (typeof d === 'string') return d.slice(0, 10)
        const dt = new Date(d)
        if (isNaN(dt.getTime())) return ''
        return dt.toISOString().slice(0, 10)
      }
      return {
        id: String(r._id),
        desde: toYMD(r.fechaInicio),
        hasta: toYMD(r.fechaFin),
        propiedadId: r.propiedadId?._id ? String(r.propiedadId._id) : (r.propiedadId ? String(r.propiedadId) : ''),
        propiedad: propNombre,
        huesped: r.nombreHuesped || '',
        telefono: r.telefonoHuesped || '',
        valorTotal,
        sena,
        comision,
        propietario,
        plataforma: origen,
        numeroHuespedes: typeof r.numeroHuespedes === 'number' ? r.numeroHuespedes : undefined,
        estado: String(r.estado || ''),
        externalUid: r.externalUid ? String(r.externalUid) : undefined,
        externalSource: r.externalSource ? String(r.externalSource) : undefined,
      }
    })
  }

  // Modal editar reserva
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<{
    id: string
    propiedadId: string
    desde: string
    hasta: string
    huesped: string
    telefono: string
    plataforma: string
    valorTotal: string
    sena: string
    numeroHuespedes: string
    estado?: string
    externalUid?: string
  } | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (openFiltro && filtroRef.current && !filtroRef.current.contains(target)) {
        setOpenFiltro(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openFiltro])

  useEffect(() => {
    const loadProps = async () => {
      try {
        const res = await fetch('/api/propiedades?activo=true')
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        const list: any[] = Array.isArray(json?.propiedades) ? json.propiedades : []
        setPropiedadesCatalogo(list.map((p) => ({ _id: String(p._id), nombre: p.nombre })))
      } catch {
        setPropiedadesCatalogo([])
      }
    }
    loadProps()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setErrorMsg(null)
        const res = await fetch('/api/reservas')
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        const list = Array.isArray(json?.reservas) ? json.reservas : []
        setReservas(mapReservasFromApi(list))
      } catch (e) {
        setErrorMsg('No se pudieron cargar las reservas.')
        setReservas([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatearFecha = (fecha: string) => {
    if (!fecha) return ''
    const date = parseFechaYMD(fecha)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(monto)
  }

  const getPlataformaColor = (plataforma: string) => {
    switch (plataforma) {
      case 'Airbnb':
        return 'bg-pink-500'
      case 'Booking':
        return 'bg-blue-500'
      case 'Particular':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const esSyncIcal = (r: Pick<ReservaItem, 'estado' | 'externalUid'>) =>
    Boolean(r.externalUid) || String(r.estado || '').toLowerCase() === 'bloqueo'

  const labelSync = (r: Pick<ReservaItem, 'plataforma' | 'externalSource'>) => {
    const src = (r.externalSource || '').toLowerCase()
    if (src === 'airbnb' || r.plataforma === 'Airbnb') return 'Airbnb · sync'
    if (src === 'booking' || r.plataforma === 'Booking') return 'Booking · sync'
    return 'OTA · sync'
  }

  const abrirEdicion = (r: ReservaItem) => {
    setErrorMsg(null)
    setEditForm({
      id: r.id,
      propiedadId: r.propiedadId || '',
      desde: r.desde,
      hasta: r.hasta,
      huesped: r.huesped,
      telefono: r.telefono,
      plataforma: r.plataforma || 'Particular',
      valorTotal: r.valorTotal > 0 ? String(r.valorTotal) : '',
      sena: r.sena > 0 ? String(r.sena) : '',
      numeroHuespedes: String(r.numeroHuespedes ?? 1),
      estado: r.estado,
      externalUid: r.externalUid,
    })
    setIsEditOpen(true)
  }

  const guardarEdicion = async () => {
    if (!editForm) return
    try {
      setEditSaving(true)
      setErrorMsg(null)
      const eraBloqueo = String(editForm.estado || '').toLowerCase() === 'bloqueo'
      const payload: Record<string, unknown> = {
        propiedadId: editForm.propiedadId,
        nombreHuesped: editForm.huesped,
        telefonoHuesped: editForm.telefono,
        fechaInicio: toMiddayUtcIso(editForm.desde),
        fechaFin: toMiddayUtcIso(editForm.hasta),
        numeroHuespedes: Math.max(1, Number(editForm.numeroHuespedes || 1)),
        precioTotal: Math.max(0, Number(editForm.valorTotal || 0)),
        sena: Math.max(0, Number(editForm.sena || 0) || 0),
        origen: editForm.plataforma || 'Particular',
      }
      // Completar datos de un sync iCal: pasa a confirmada sin perder externalUid
      if (eraBloqueo || editForm.externalUid) {
        payload.estado = 'confirmada'
      }

      const res = await fetch(`/api/reservas/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let msg = `No se pudo actualizar la reserva (HTTP ${res.status}).`
        try {
          const j = await res.json()
          if (j?.error) msg = j.error
        } catch {}
        throw new Error(msg)
      }

      setIsEditOpen(false)
      setEditForm(null)

      // Refrescar listado
      const rr = await fetch('/api/reservas')
      if (rr.ok) {
        const json = await rr.json()
        const list = Array.isArray(json?.reservas) ? json.reservas : []
        setReservas(mapReservasFromApi(list))
      }

      // Notificar a otras pantallas (Inicio/Calendario) para que refetch
      emitirCambioReservas()
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudo actualizar la reserva.')
    } finally {
      setEditSaving(false)
    }
  }

  const eliminarReserva = async () => {
    if (!editForm) return
    const ok = typeof window !== 'undefined'
      ? window.confirm('¿Eliminar la reserva?\n\nEsto la marcará como cancelada.')
      : true
    if (!ok) return

    try {
      setEditDeleting(true)
      setErrorMsg(null)
      const res = await fetch(`/api/reservas/${editForm.id}`, { method: 'DELETE' })
      if (!res.ok) {
        let msg = `No se pudo eliminar la reserva (HTTP ${res.status}).`
        try {
          const j = await res.json()
          if (j?.error) msg = j.error
        } catch {}
        throw new Error(msg)
      }

      setIsEditOpen(false)
      setEditForm(null)

      // Refrescar listado (en /reservas no mostramos canceladas)
      const rr = await fetch('/api/reservas')
      if (rr.ok) {
        const json = await rr.json()
        const list = Array.isArray(json?.reservas) ? json.reservas : []
        setReservas(mapReservasFromApi(list))
      } else {
        // Fallback: sacar del listado actual
        setReservas((prev) => prev.filter((r) => r.id !== editForm.id))
      }

      emitirCambioReservas()
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudo eliminar la reserva.')
    } finally {
      setEditDeleting(false)
    }
  }

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r) => {
      if (propiedadFiltro !== 'Todas' && r.propiedad !== propiedadFiltro) return false
      if (fechaIngresoDesde && r.desde < fechaIngresoDesde) return false
      if (fechaIngresoHasta && r.desde > fechaIngresoHasta) return false
      return true
    })
  }, [reservas, propiedadFiltro, fechaIngresoDesde, fechaIngresoHasta])

  return (
    <main className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="px-4 py-6">
        {errorMsg && (
          <div className="mb-3 text-xs text-red-400">{errorMsg}</div>
        )}
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Reservas</h1>
          <p className="text-sm text-gray-400">Registro de todas las reservas</p>
        </div>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div ref={filtroRef} className="relative">
            <button
              type="button"
              onClick={() => setOpenFiltro((v) => !v)}
              className="bg-gray-900/70 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white hover:bg-gray-800 min-w-[180px] text-left"
            >
              {`Propiedad: ${propiedadFiltro}`}
            </button>
            {openFiltro && (
              <div className="absolute left-0 top-full mt-2 w-60 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-30 max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setPropiedadFiltro('Todas'); setOpenFiltro(false) }}
                  className={`w-full text-left px-3 py-2 text-sm ${propiedadFiltro === 'Todas' ? 'bg-gray-800 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
                >
                  Todas
                </button>
                {propiedades.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPropiedadFiltro(p); setOpenFiltro(false) }}
                    className={`w-full text-left px-3 py-2 text-sm ${propiedadFiltro === p ? 'bg-gray-800 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-full min-w-[220px] sm:w-[260px]">
            <RangeDatePicker
              startDate={fechaIngresoDesde}
              endDate={fechaIngresoHasta}
              onChange={(start, end) => {
                setFechaIngresoDesde(start)
                setFechaIngresoHasta(end)
              }}
              requireBothDates
              placeholder="Fecha de ingreso"
              hintStart="Seleccioná desde"
              hintEnd="Seleccioná hasta"
              triggerClassName="w-full bg-gray-900/70 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white hover:bg-gray-800 text-left flex items-center justify-between"
            />
          </div>
        </div>

        {/* Lista de reservas */}
        {loading ? (
          <div className="text-gray-400 text-sm">Cargando...</div>
        ) : reservasFiltradas.length === 0 ? (
          <div className="text-gray-400 text-sm">No hay reservas con esos filtros.</div>
        ) : (
        <div className="space-y-4">
          {reservasFiltradas.map((reserva) => (
            <div
              key={reserva.id}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
            >
              {/* Fechas y plataforma */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {formatearFecha(reserva.desde)}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="text-sm font-medium text-white">
                    {formatearFecha(reserva.hasta)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEdicion(reserva)}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    title="Editar reserva"
                    aria-label="Editar reserva"
                  >
                    <IoPencil className="text-white" />
                  </button>
                  {esSyncIcal(reserva) ? (
                    <div className="bg-sky-500/20 ring-1 ring-sky-500/40 px-3 py-1.5 rounded-full">
                      <span className="text-xs font-medium text-sky-300">
                        {labelSync(reserva)}
                      </span>
                    </div>
                  ) : (
                    <div className="bg-gray-800 px-4 py-1.5 rounded-full">
                      <span className="text-xs font-medium text-white">
                        {reserva.plataforma}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Propiedad */}
              <div className="mb-3">
                <h3 className="text-base font-semibold text-white">{reserva.propiedad}</h3>
                {esSyncIcal(reserva) && reserva.valorTotal <= 0 && !reserva.telefono.trim() ? (
                  <p className="text-xs text-sky-400 mt-1">Sin datos · completar</p>
                ) : null}
              </div>

              {/* Huésped */}
              <div className="mb-3 pb-3 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Huésped</p>
                    <p className="text-sm font-medium text-white">{reserva.huesped || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Teléfono</p>
                    <p className="text-sm font-medium text-white">{reserva.telefono || 'Sin datos'}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-400">Huéspedes</p>
                  <p className="text-sm font-medium text-white">{Math.max(1, Number(reserva.numeroHuespedes ?? 1))}</p>
                </div>
              </div>

              {/* Montos */}
              {reserva.valorTotal > 0 ? (
              <div className={`grid gap-3 ${reserva.sena > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total</p>
                  <p className="text-sm font-bold text-white">{formatearMonto(reserva.valorTotal)}</p>
                </div>
                {reserva.sena > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Seña</p>
                    <p className="text-sm font-medium text-sky-400">{formatearMonto(reserva.sena)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-1">Comisión</p>
                  <p className="text-sm font-medium text-orange-400">{formatearMonto(reserva.comision)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Propietario</p>
                  <p className="text-sm font-medium text-green-400">{formatearMonto(reserva.propietario)}</p>
                </div>
              </div>
              ) : (
                <p className="text-xs text-gray-500">Sin total cargado todavía</p>
              )}
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Modal editar reserva */}
      {isEditOpen && editForm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[95] flex items-center justify-center px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditOpen(false)
              setEditForm(null)
            }
          }}
        >
          <div
            className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Editar reserva</h3>
                {editForm.externalUid || String(editForm.estado || '').toLowerCase() === 'bloqueo' ? (
                  <p className="text-xs text-sky-400 mt-1">
                    Sync iCal — completá huésped, teléfono, total y seña.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => { setIsEditOpen(false); setEditForm(null) }}
                className="p-2 rounded-full hover:bg-gray-800"
                aria-label="Cerrar"
              >
                <IoClose className="text-xl text-white" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <select
                  value={editForm.propiedadId}
                  onChange={(e) => setEditForm((p) => p ? ({ ...p, propiedadId: e.target.value }) : p)}
                  className="w-full appearance-none bg-gray-800 text-white border border-gray-700 rounded-lg px-4 pr-12 py-3 focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>Seleccionar alojamiento</option>
                  {propiedadesCatalogo.map((p) => (
                    <option key={p._id} value={p._id}>{p.nombre}</option>
                  ))}
                </select>
                <IoChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              <input
                type="text"
                value={editForm.huesped}
                onChange={(e) => setEditForm((p) => p ? ({ ...p, huesped: e.target.value }) : p)}
                placeholder="Nombre del huésped"
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              />

              <input
                type="text"
                value={editForm.telefono}
                onChange={(e) => setEditForm((p) => p ? ({ ...p, telefono: e.target.value }) : p)}
                placeholder="Teléfono"
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              />

              <RangeDatePicker
                startDate={editForm.desde}
                endDate={editForm.hasta}
                onChange={(start, end) => setEditForm((p) => p ? ({ ...p, desde: start, hasta: end }) : p)}
                trigger="split"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  value={editForm.numeroHuespedes}
                  onChange={(e) => setEditForm((p) => p ? ({ ...p, numeroHuespedes: e.target.value }) : p)}
                  placeholder="Huéspedes"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  min={0}
                  value={editForm.valorTotal}
                  onChange={(e) => setEditForm((p) => p ? ({ ...p, valorTotal: e.target.value }) : p)}
                  placeholder="Total"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                />
              </div>
              <input
                type="number"
                min={0}
                value={editForm.sena}
                onChange={(e) => setEditForm((p) => p ? ({ ...p, sena: e.target.value }) : p)}
                placeholder="Seña"
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              />

              <div className="relative">
                <select
                  value={editForm.plataforma}
                  onChange={(e) => setEditForm((p) => p ? ({ ...p, plataforma: e.target.value }) : p)}
                  className="w-full appearance-none bg-gray-800 text-white border border-gray-700 rounded-lg px-4 pr-12 py-3 focus:outline-none focus:border-blue-500"
                >
                  {['Airbnb', 'Booking', 'Facebook', 'Mercado Libre', 'Recomendado', 'Particular', 'Otro'].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <IoChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={eliminarReserva}
                disabled={editSaving || editDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white border border-gray-700 hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <IoTrashOutline className="text-lg text-white" />
                {editDeleting ? 'Eliminando…' : 'Eliminar'}
              </button>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={editSaving || editDeleting}
                onClick={() => { setIsEditOpen(false); setEditForm(null) }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-200 border border-gray-700 hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="button"
                  disabled={editSaving || editDeleting}
                onClick={guardarEdicion}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                  {editSaving ? 'Guardando…' : 'Guardar'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

