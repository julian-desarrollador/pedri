'use client'

import { useState, useEffect, useRef } from 'react'
import Calendar from '@/components/Calendar'
import ReservationModal, { ReservationFormData } from '@/components/ReservationModal'
import ReservationCard from '@/components/ReservationCard'
import AvailabilityModal from '@/components/AvailabilityModal'
import { IoAdd, IoHelpCircle } from 'react-icons/io5'
import { useModal } from '@/contexts/ModalContext'

interface Reservation {
  id: string
  propiedad: string
  huesped: string
  checkIn: string
  checkOut: string
  checkInDay: number
  checkInMonth: number
  checkInYear: number
  checkOutDay: number
  checkOutMonth: number
  checkOutYear: number
  noches: number
  clientes: number
  estado: 'Confirmada' | 'Cancelada' | 'Check-out' | 'Check-in' | 'Pendiente' | 'Sync'
  telefono: string
  total: string
  sena: string
  origen?: string
  externalUid?: string
  needsCompletar?: boolean
}

function mapEstadoReservaUi(estadoBack: string): Reservation['estado'] {
  const s = (estadoBack || '').toLowerCase()
  if (s === 'cancelada') return 'Cancelada'
  if (s === 'pendiente') return 'Pendiente'
  if (s === 'bloqueo') return 'Sync'
  return 'Confirmada'
}

function mapReservaFromApi(r: any, currentMonth: number, currentYear: number): Reservation {
  const inicio = r.fechaInicio ? new Date(r.fechaInicio) : null
  const fin = r.fechaFin ? new Date(r.fechaFin) : null
  const checkInDay = inicio ? inicio.getDate() : 1
  const checkInMonth = inicio ? inicio.getMonth() : currentMonth
  const checkInYear = inicio ? inicio.getFullYear() : currentYear
  const checkOutDay = fin ? fin.getDate() : checkInDay
  const checkOutMonth = fin ? fin.getMonth() : checkInMonth
  const checkOutYear = fin ? fin.getFullYear() : checkInYear
  const noches = (inicio && fin) ? Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const short = (d: Date | null) => d ? `${d.getDate()} ${d.toLocaleDateString('es', { month: 'short' })}` : ''
  const estadoBack = (r.estado || '').toLowerCase()
  const estado = mapEstadoReservaUi(estadoBack)
  const origen = r.origen || ''
  const externalUid = r.externalUid ? String(r.externalUid) : undefined
  const totalNum = Number(r.precioTotal || 0)
  const needsCompletar =
    estadoBack === 'bloqueo' ||
    (Boolean(externalUid) && totalNum <= 0 && !String(r.telefonoHuesped || '').trim())

  return {
    id: String(r._id),
    propiedad: r.propiedadId?.nombre || '',
    huesped: r.nombreHuesped || '',
    checkIn: short(inicio),
    checkOut: short(fin),
    checkInDay,
    checkInMonth,
    checkInYear,
    checkOutDay,
    checkOutMonth,
    checkOutYear,
    noches,
    clientes: Math.max(1, Number(r.numeroHuespedes || 1)),
    estado,
    telefono: r.telefonoHuesped || '',
    total: String(r.precioTotal || ''),
    sena: r.sena != null && Number(r.sena) > 0 ? String(r.sena) : '',
    origen,
    externalUid,
    needsCompletar,
  }
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
  const { setIsModalOpen: setGlobalModalOpen } = useModal()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastOk, setToastOk] = useState<string | null>(null)
  
  // Sincronizar estado local con contexto global
  useEffect(() => {
    setGlobalModalOpen(isModalOpen || isAvailabilityModalOpen)
  }, [isModalOpen, isAvailabilityModalOpen, setGlobalModalOpen])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [reservationsLoading, setReservationsLoading] = useState<boolean>(true)
  const [reservationsError, setReservationsError] = useState<string | null>(null)
  const [reservasVersion, setReservasVersion] = useState(0)
  const lastReservasUpdatedAtRef = useRef<string>('')

  // Escuchar cambios de reservas (ediciones desde /reservas, etc.) y forzar refetch del mes visible
  useEffect(() => {
    const KEY = 'reservasUpdatedAt'
    const bump = () => setReservasVersion((v) => v + 1)

    const syncFromStorage = () => {
      try {
        const v = localStorage.getItem(KEY) || ''
        if (v && v !== lastReservasUpdatedAtRef.current) {
          lastReservasUpdatedAtRef.current = v
          bump()
        }
      } catch {}
    }

    const onCustom = () => bump()
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        lastReservasUpdatedAtRef.current = e.newValue || ''
        bump()
      }
    }
    const onFocus = () => syncFromStorage()
    const onVisibility = () => {
      if (!document.hidden) syncFromStorage()
    }

    syncFromStorage()
    window.addEventListener('reservas:changed', onCustom as any)
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('reservas:changed', onCustom as any)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Cargar reservas reales para el mes visible
  useEffect(() => {
    const load = async () => {
      try {
        setReservationsLoading(true)
        setReservationsError(null)
        const first = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0).toISOString()
        const last = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString()
        const res = await fetch(`/api/reservas?from=${encodeURIComponent(first)}&to=${encodeURIComponent(last)}`)
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        const list: any[] = Array.isArray(json?.reservas) ? json.reservas : []
        const mapped: Reservation[] = list.map((r) => mapReservaFromApi(r, currentMonth, currentYear))
        setReservations(mapped)
      } catch {
        setReservations([])
        setReservationsError('No se pudieron cargar las reservas.')
      } finally {
        setReservationsLoading(false)
      }
    }
    load()
  }, [currentMonth, currentYear, reservasVersion])

  // Calcular indicadores de reservas por día para el mes actual del calendario
  const reservationIndicators: { [key: number]: { checkIn: boolean; checkOut: boolean } } = {}
  
  reservations.forEach((res) => {
    // Solo agregar indicadores si la reserva pertenece al mes actual del calendario
    if (res.checkInMonth === currentMonth && res.checkInYear === currentYear) {
      if (!reservationIndicators[res.checkInDay]) {
        reservationIndicators[res.checkInDay] = { checkIn: false, checkOut: false }
      }
      reservationIndicators[res.checkInDay].checkIn = true
    }

    if (res.checkOutMonth === currentMonth && res.checkOutYear === currentYear) {
      if (!reservationIndicators[res.checkOutDay]) {
        reservationIndicators[res.checkOutDay] = { checkIn: false, checkOut: false }
      }
      reservationIndicators[res.checkOutDay].checkOut = true
    }
  })

  // Obtener reservas del día ordenadas (salidas, entradas, estancias en curso)
  const getReservationsForDay = (day: number) => {
    // Usar el mes/año seleccionado o el actual del calendario
    const monthToUse = selectedMonth !== null ? selectedMonth : currentMonth
    const yearToUse = selectedYear !== null ? selectedYear : currentYear
    
    const dayReservations = reservations.filter((res) => {
      // Crear fechas completas para comparar
      const checkInDate = new Date(res.checkInYear, res.checkInMonth, res.checkInDay)
      const checkOutDate = new Date(res.checkOutYear, res.checkOutMonth, res.checkOutDay)
      const selectedDate = new Date(yearToUse, monthToUse, day)
      
      // Incluir si es check-in, check-out, o está en medio de la estancia
      return selectedDate >= checkInDate && selectedDate <= checkOutDate
    })

    // Ordenar: salidas primero, luego entradas, luego estancias en curso al final
    return dayReservations.sort((a, b) => {
      const aIsCheckOut = a.checkOutDay === day
      const bIsCheckOut = b.checkOutDay === day
      const aIsCheckIn = a.checkInDay === day
      const bIsCheckIn = b.checkInDay === day
      const aIsOngoing = !aIsCheckOut && !aIsCheckIn
      const bIsOngoing = !bIsCheckOut && !bIsCheckIn
      
      // Salidas primero
      if (aIsCheckOut && !bIsCheckOut) return -1
      if (!aIsCheckOut && bIsCheckOut) return 1
      
      // Luego entradas
      if (aIsCheckIn && !bIsCheckIn) return -1
      if (!aIsCheckIn && bIsCheckIn) return 1
      
      // Estancias en curso al final
      if (aIsOngoing && !bIsOngoing) return 1
      if (!aIsOngoing && bIsOngoing) return -1
      
      // Mantener orden si son del mismo tipo
      return 0
    })
  }

  const handleDayClick = (day: number) => {
    setSelectedDay(day)
    setSelectedMonth(currentMonth)
    setSelectedYear(currentYear)
    setMostrarCanceladas(false)
  }

  const handleMonthChange = (month: number, year: number) => {
    // Solo actualizar si realmente cambió el mes
    if (month !== currentMonth || year !== currentYear) {
      setCurrentMonth(month)
      setCurrentYear(year)
      setSelectedDay(null) // Limpiar selección solo si cambió el mes
    }
  }

  const handleViewNextReservations = () => {
    // Obtener la fecha actual completa
    const today = new Date()
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Buscar la reserva más cercana en el futuro
    let closestReservation: Reservation | null = null
    let closestDate: Date | null = null
    let isCheckIn: boolean = true

    reservations.forEach((res) => {
      if (res.estado === 'Cancelada') return
      const checkInDate = new Date(res.checkInYear, res.checkInMonth, res.checkInDay)
      const checkOutDate = new Date(res.checkOutYear, res.checkOutMonth, res.checkOutDay)

      // Verificar check-in futuro o actual
      if (checkInDate >= todayDate) {
        if (!closestDate || checkInDate < closestDate) {
          closestDate = checkInDate
          closestReservation = res
          isCheckIn = true
        }
      }
      
      // Verificar check-out futuro o actual
      if (checkOutDate >= todayDate) {
        if (!closestDate || checkOutDate < closestDate) {
          closestDate = checkOutDate
          closestReservation = res
          isCheckIn = false
        }
      }

      // Si estamos en medio de una estancia
      if (checkInDate <= todayDate && checkOutDate >= todayDate) {
        if (!closestDate || todayDate < closestDate) {
          closestDate = todayDate
          closestReservation = res
          isCheckIn = false
        }
      }
    })

    if (closestReservation) {
      // Establecer la selección sin cambiar el calendario visible
      const res = closestReservation as Reservation
      const targetMonth = isCheckIn ? res.checkInMonth : res.checkOutMonth
      const targetYear = isCheckIn ? res.checkInYear : res.checkOutYear
      const targetDay = isCheckIn ? res.checkInDay : res.checkOutDay
      
      setSelectedDay(targetDay)
      setSelectedMonth(targetMonth)
      setSelectedYear(targetYear)
    }
  }

  const handleCancelReservation = (reservationId: string) => {
    setReservations(reservations.map(res => 
      res.id === reservationId 
        ? { ...res, estado: 'Cancelada' as const }
        : res
    ))
  }

  const handleUncancelReservation = (reservationId: string) => {
    setReservations(reservations.map(res => 
      res.id === reservationId 
        ? { ...res, estado: 'Confirmada' as const }
        : res
    ))
  }

  const handleNewReservation = async (data: ReservationFormData) => {
    try {
      const toMiddayUtcIso = (ymd: string) => {
        if (!ymd) return ''
        // Forzar mediodía UTC para evitar desfases por huso horario
        return new Date(`${ymd}T12:00:00Z`).toISOString()
      }

      // Resolver propiedadId por nombre
      const propsRes = await fetch('/api/propiedades')
      if (!propsRes.ok) throw new Error('props')
      const propsJson = await propsRes.json()
      const propsList: any[] = Array.isArray(propsJson?.propiedades) ? propsJson.propiedades : []
      const norm = (s: string) =>
        (s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
      const target = norm(data.alojamiento || '')
      const prop =
        propsList.find((p) => norm(p?.nombre || '') === target) ||
        propsList.find((p) => norm(p?.nombre || '').includes(target)) ||
        null
      if (!prop?._id) {
        if (typeof window !== 'undefined') {
          window.alert('No se encontró la propiedad. Escribí el nombre tal como figura en Calendario.')
        }
        return
      }

      // Construir payload para backend
      const payload = {
        propiedadId: prop._id,
        nombreHuesped: data.huesped,
        telefonoHuesped: data.telefono,
        fechaInicio: toMiddayUtcIso(data.desde),
        fechaFin: toMiddayUtcIso(data.hasta),
        numeroHuespedes: Math.max(1, Number((data as any).numeroHuespedes || 1)),
        precioTotal: Number(data.total || 0),
        sena: Math.max(0, Number(data.sena || 0) || 0),
        origen: data.plataforma || 'Particular',
        estado: 'confirmada',
      }

      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        // Mostrar error del servidor en UI para entender el 400
        let serverMsg = ''
        try {
          const errJson = await res.json()
          serverMsg = errJson?.error || ''
        } catch {
          serverMsg = await res.text().catch(() => '')
        }
        setToastMsg(serverMsg || `No se pudo crear la reserva (HTTP ${res.status}).`)
        setTimeout(() => setToastMsg(null), 4000)
        return
      }

      // Notificar a otras pantallas para que se refresquen
      try {
        localStorage.setItem('reservasUpdatedAt', String(Date.now()))
      } catch {}
      try {
        window.dispatchEvent(new Event('reservas:changed'))
      } catch {}

      // Mostrar éxito inmediatamente y refrescar listado del mes visible
      setToastOk('Reserva agregada correctamente')
      setTimeout(() => setToastOk(null), 3000)

      // Refrescar listado del mes visible
      const first = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0).toISOString()
      const last = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString()
      const listRes = await fetch(`/api/reservas?from=${encodeURIComponent(first)}&to=${encodeURIComponent(last)}`)
      if (listRes.ok) {
        const json = await listRes.json()
        const list: any[] = Array.isArray(json?.reservas) ? json.reservas : []
        const mapped: Reservation[] = list.map((r) => mapReservaFromApi(r, currentMonth, currentYear))
        setReservations(mapped)
      }
    } catch (e) {
      // En caso de error, no hacer nada más; se podría mostrar un toast en el futuro
      console.error('Error creando reserva:', e)
    }
  }

  const reservasDelDia = selectedDay !== null ? getReservationsForDay(selectedDay) : []
  const activasDelDia = reservasDelDia.filter((res) => res.estado !== 'Cancelada')
  const canceladasDelDia = reservasDelDia.filter((res) => res.estado === 'Cancelada')
  const visiblesDelDia = mostrarCanceladas ? reservasDelDia : activasDelDia

  return (
    <main className="min-h-screen bg-black flex flex-col">
      {/* Calendario - 45% de la pantalla */}
      <Calendar 
        reservations={reservationIndicators} 
        onDayClick={handleDayClick}
        onMonthChange={handleMonthChange}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />

      {selectedDay !== null && !reservationsLoading && canceladasDelDia.length > 0 && (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() => setMostrarCanceladas((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              mostrarCanceladas
                ? 'border-red-500 bg-red-600 text-white shadow-md shadow-red-900/40'
                : 'border-gray-800 bg-gray-900/70 font-medium text-gray-300 hover:bg-gray-800'
            }`}
            aria-pressed={mostrarCanceladas}
          >
            {`Canceladas ${canceladasDelDia.length}`}
          </button>
        </div>
      )}

      {/* Área de eventos - 55% restante */}
      <div className="flex-1 bg-black overflow-y-auto px-4 py-4">
        {reservationsLoading ? (
          <div className="text-gray-400 text-sm">Cargando...</div>
        ) : selectedDay === null ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm mb-3">
              Selecciona un día para ver las reservas
            </p>
            <button 
              onClick={handleViewNextReservations}
              className="text-blue-500 text-sm font-medium hover:text-blue-400 transition-colors"
            >
              Ver las próximas reservas
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-3 pb-20 md:pb-4">
            {visiblesDelDia.length > 0 ? (
              visiblesDelDia.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  selectedDay={selectedDay}
                  onCancelReservation={handleCancelReservation}
                  onUncancelReservation={handleUncancelReservation}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-3">
                  Este día no llega ningún cliente
                </p>
                <button
                  onClick={handleViewNextReservations}
                  className="text-blue-500 text-sm font-medium hover:text-blue-400 transition-colors"
                >
                  Ver las próximas reservas
                </button>
              </div>
            )}
          </div>
        )}
        {reservationsError && <div className="text-xs text-red-400 mt-2">{reservationsError}</div>}
      </div>

      {/* Botón flotante de agregar */}
      {!isModalOpen && !isAvailabilityModalOpen && (
        <button
          onClick={() => setIsAvailabilityModalOpen(true)}
          className="fixed bottom-40 right-4 md:bottom-28 w-14 h-14 bg-[#EAB308] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#d4a307] transition-colors z-[80]"
          title="Buscar disponibilidad"
          aria-label="Buscar disponibilidad"
        >
          <IoHelpCircle className="text-3xl" />
        </button>
      )}

      {!isModalOpen && !isAvailabilityModalOpen && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-[80]"
        >
          <IoAdd className="text-3xl" />
        </button>
      )}

      {/* Toast de éxito estilizado */}
      {toastOk && (
        <div className="fixed left-4 right-4 bottom-[calc(7.5rem+var(--kb-inset,0px))] md:bottom-[8.5rem] z-[95]">
          <div className="bg-emerald-600/15 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm flex items-start gap-3">
            <div className="mt-[2px] w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></div>
            <div className="text-sm leading-5 flex-1">{toastOk}</div>
            <button
              type="button"
              onClick={() => setToastOk(null)}
              className="text-emerald-200/80 hover:text-emerald-100 transition-colors"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Toast de error estilizado */}
      {toastMsg && (
        <div className="fixed left-4 right-4 bottom-[calc(4.5rem+var(--kb-inset,0px))] md:bottom-6 z-[95]">
          <div className="bg-rose-600/15 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm flex items-start gap-3">
            <div className="mt-[2px] w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"></div>
            <div className="text-sm leading-5 flex-1">{toastMsg}</div>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-rose-200/80 hover:text-rose-100 transition-colors"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Modal de nueva reserva */}
      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleNewReservation}
      />

      <AvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
      />
    </main>
  )
}

