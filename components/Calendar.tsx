'use client'

import { useState, useEffect } from 'react'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

interface CalendarProps {
  reservations?: { [key: string]: { checkIn: boolean; checkOut: boolean } } // día: tipo de reservas
  onDayClick?: (day: number) => void
  onMonthChange?: (month: number, year: number) => void
  currentMonth?: number
  currentYear?: number
}

export default function Calendar({ reservations = {}, onDayClick, onMonthChange, currentMonth: externalMonth, currentYear: externalYear }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [prevMonth, setPrevMonth] = useState(new Date().getMonth())
  const [prevYear, setPrevYear] = useState(new Date().getFullYear())

  // Sincronizar con mes/año externo
  useEffect(() => {
    if (externalMonth !== undefined && externalYear !== undefined) {
      const newDate = new Date(externalYear, externalMonth, 1)
      if (currentDate.getMonth() !== externalMonth || currentDate.getFullYear() !== externalYear) {
        setCurrentDate(newDate)
      }
    }
  }, [externalMonth, externalYear])

  // Notificar cambio de mes al componente padre solo cuando cambia localmente
  useEffect(() => {
    if (onMonthChange && mounted) {
      const month = currentDate.getMonth()
      const year = currentDate.getFullYear()
      
      if (month !== prevMonth || year !== prevYear) {
        onMonthChange(month, year)
        setPrevMonth(month)
        setPrevYear(year)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, mounted])

  // Distancia mínima para considerar un swipe
  const minSwipeDistance = 50

  useEffect(() => {
    setMounted(true)
  }, [])

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]

  const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days = []

    // Días del mes anterior
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      })
    }

    // Días del mes actual
    const today = new Date()
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      
      const dayReservations = reservations[day]
      const hasCheckIn = dayReservations?.checkIn || false
      const hasCheckOut = dayReservations?.checkOut || false
      
      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        isSelected: selectedDay === day,
        hasCheckIn,
        hasCheckOut,
      })
    }

    // Días del próximo mes
    const remainingDays = 42 - days.length // 6 semanas
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      })
    }

    return days
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
    setSelectedDay(null)
  }

  const handleDayClick = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return
    setSelectedDay(day)
    if (onDayClick) {
      onDayClick(day)
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) {
      nextMonth()
    } else if (isRightSwipe) {
      previousMonth()
    }
  }

  const days = getDaysInMonth(currentDate)
  const monthName = monthNames[currentDate.getMonth()]
  const year = currentDate.getFullYear()

  if (!mounted) {
    return (
      <div className="bg-black text-white h-[45vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="bg-black text-white h-[45vh] overflow-y-auto flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header con navegación del mes: flechas solo en desktop */}
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <button
          type="button"
          onClick={previousMonth}
          aria-label="Mes anterior"
          className="hidden md:flex w-10 h-10 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <IoChevronBack className="text-xl" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <h2 className="text-lg font-medium capitalize">{monthName}</h2>
          <span className="text-sm text-gray-400">{year}</span>
        </div>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Mes siguiente"
          className="hidden md:flex w-10 h-10 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <IoChevronForward className="text-xl" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-0 px-2 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-0 px-2 flex-1">
        {days.map((dayInfo, index) => (
          <div
            key={index}
            className="flex items-center justify-center relative"
          >
            <button
              onClick={() => handleDayClick(dayInfo.day, dayInfo.isCurrentMonth)}
              disabled={!dayInfo.isCurrentMonth}
              className={`w-10 h-10 rounded-full flex flex-col items-center justify-center relative transition-colors
                ${dayInfo.isCurrentMonth ? 'text-white' : 'text-gray-600'}
                ${dayInfo.isToday ? 'bg-orange-500 text-white' : ''}
                ${dayInfo.isSelected ? 'bg-blue-600 text-white' : ''}
                ${!dayInfo.isToday && !dayInfo.isSelected && dayInfo.isCurrentMonth ? 'active:bg-gray-900' : ''}
                ${!dayInfo.isCurrentMonth ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <span className="text-sm">{dayInfo.day}</span>
              {/* Indicador de reservas - Azul = check-in, Gris = check-out */}
              {!dayInfo.isSelected && !dayInfo.isToday && (dayInfo.hasCheckIn || dayInfo.hasCheckOut) && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {dayInfo.hasCheckIn && (
                    <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                  )}
                  {dayInfo.hasCheckOut && (
                    <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                  )}
                </div>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

