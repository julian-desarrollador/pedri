'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IoClose } from 'react-icons/io5'

interface RangeDatePickerProps {
  startDate: string // formato YYYY-MM-DD
  endDate: string // formato YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void
  trigger?: 'single' | 'split'
  placeholder?: string
  placeholderStart?: string
  placeholderEnd?: string
  /** Si true, el calendario no se cierra hasta elegir inicio y fin. */
  requireBothDates?: boolean
  /** Fecha mínima seleccionable (YYYY-MM-DD). */
  minDate?: string
  /** Clases del/los botón(es) disparador(es). */
  triggerClassName?: string
  hintStart?: string
  hintEnd?: string
}

export default function RangeDatePicker({
  startDate,
  endDate,
  onChange,
  trigger = 'single',
  placeholder = 'Seleccionar periodo',
  placeholderStart = 'Fecha inicio',
  placeholderEnd = 'Fecha fin',
  requireBothDates = false,
  minDate,
  triggerClassName,
  hintStart = 'Seleccioná la fecha de ingreso',
  hintEnd = 'Seleccioná la fecha de salida',
}: RangeDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pickMode, setPickMode] = useState<'range' | 'start' | 'end'>('range')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tempStartDate, setTempStartDate] = useState<string>('')
  const [tempEndDate, setTempEndDate] = useState<string>('')
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  const minSwipeDistance = 50

  useEffect(() => {
    setMounted(true)
  }, [])

  const defaultTriggerClass =
    'w-full bg-zinc-800 text-white border border-gray-700 rounded-lg px-4 py-3 text-left focus:outline-none focus:border-blue-500 flex items-center justify-between'
  const triggerBtnClass = triggerClassName || defaultTriggerClass

  // Con requireBothDates siempre usamos flujo de rango (aunque abran desde Ingreso/Salida).
  const effectivePickMode = requireBothDates ? 'range' : pickMode

  useEffect(() => {
    if (isOpen) {
      setTempStartDate(startDate)
      setTempEndDate(endDate)
      const base = (pickMode === 'end' ? endDate : startDate) || startDate || endDate || minDate
      if (base) {
        setCurrentDate(new Date(base + 'T00:00:00'))
      }
    }
  }, [isOpen, startDate, endDate, pickMode, minDate])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]

  const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString + 'T00:00:00')
    const day = date.getDate()
    const month = monthNames[date.getMonth()].slice(0, 3)
    return `${day} ${month}`
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days = []

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        month,
        year,
        isCurrentMonth: true,
      })
    }

    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      })
    }

    return days
  }

  const toYmd = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const isDateDisabled = (year: number, month: number, day: number) => {
    if (!minDate) return false
    return toYmd(year, month, day) < minDate
  }

  const isDateInRange = (year: number, month: number, day: number) => {
    if (!tempStartDate || !tempEndDate) return false
    const dateToCheck = new Date(year, month, day)
    const start = new Date(tempStartDate + 'T00:00:00')
    const end = new Date(tempEndDate + 'T00:00:00')
    return dateToCheck > start && dateToCheck < end
  }

  const isDateSelected = (year: number, month: number, day: number, type: 'start' | 'end') => {
    const dateToCheck = type === 'start' ? tempStartDate : tempEndDate
    if (!dateToCheck) return false
    const selectedDate = new Date(dateToCheck + 'T00:00:00')
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    )
  }

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  const handleDayClick = (year: number, month: number, day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return
    if (isDateDisabled(year, month, day)) return

    const dateString = toYmd(year, month, day)
    const clickedDate = new Date(year, month, day)

    // Modo selección simple (sin requireBothDates): setear ese campo y cerrar
    if (effectivePickMode === 'start') {
      const nextStart = dateString
      let nextEnd = tempEndDate
      if (nextEnd) {
        const startObj = new Date(nextStart + 'T00:00:00')
        const endObj = new Date(nextEnd + 'T00:00:00')
        if (endObj <= startObj) nextEnd = ''
      }
      setTempStartDate(nextStart)
      setTempEndDate(nextEnd)
      onChange(nextStart, nextEnd)
      setIsOpen(false)
      return
    }

    if (effectivePickMode === 'end') {
      const nextEnd = dateString
      setTempEndDate(nextEnd)
      onChange(tempStartDate, nextEnd)
      setIsOpen(false)
      return
    }

    // Flujo rango: no cerrar hasta tener inicio y fin
    if (!tempStartDate) {
      setTempStartDate(dateString)
      return
    }

    if (tempStartDate && !tempEndDate) {
      const startDateObj = new Date(tempStartDate + 'T00:00:00')

      if (clickedDate < startDateObj) {
        setTempStartDate(dateString)
        setTempEndDate('')
        return
      }

      if (clickedDate > startDateObj) {
        setTempEndDate(dateString)
        onChange(tempStartDate, dateString)
        setIsOpen(false)
        return
      }

      return
    }

    if (tempStartDate && tempEndDate) {
      setTempStartDate(dateString)
      setTempEndDate('')
    }
  }

  const handleClear = () => {
    setTempStartDate('')
    setTempEndDate('')
    onChange('', '')
  }

  const openPicker = (mode: 'range' | 'start' | 'end') => {
    setPickMode(requireBothDates ? 'range' : mode)
    setIsOpen(true)
  }

  const closePicker = () => {
    setIsOpen(false)
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
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

  return (
    <div className="relative w-full">
      {trigger === 'split' ? (
        <div className="grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openPicker('start')}
            className={triggerBtnClass}
          >
            {startDate ? (
              <span>{formatDisplayDate(startDate)}</span>
            ) : (
              <span className="text-gray-500">{placeholderStart}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => openPicker('end')}
            className={triggerBtnClass}
          >
            {endDate ? (
              <span>{formatDisplayDate(endDate)}</span>
            ) : (
              <span className="text-gray-500">{placeholderEnd}</span>
            )}

            {(startDate || endDate) && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    handleClear()
                  }
                }}
                className="ml-2 p-1 hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Limpiar selección"
              >
                <IoClose className="text-lg" />
              </span>
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (isOpen) closePicker()
            else openPicker('range')
          }}
          className={triggerBtnClass}
        >
          {startDate && endDate ? (
            <span>{formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}</span>
          ) : startDate ? (
            <span>{formatDisplayDate(startDate)} - <span className="text-gray-500">...</span></span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          {(startDate || endDate) && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleClear()
                }
              }}
              className="ml-2 p-1 hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Limpiar selección"
            >
              <IoClose className="text-lg" />
            </span>
          )}
        </button>
      )}

      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closePicker()
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closePicker()
            }}
            onTouchEnd={(e) => {
              if (e.target === e.currentTarget) closePicker()
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-gray-700 bg-zinc-900 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              role="dialog"
              aria-modal="true"
              aria-label="Elegir fechas"
            >
              <div className="flex flex-col items-center justify-center gap-1 border-b border-gray-700 px-6 py-4">
                <div className="flex w-full items-center justify-between">
                  <button
                    type="button"
                    onClick={previousMonth}
                    className="rounded-full p-2 text-white hover:bg-gray-800"
                    aria-label="Mes anterior"
                  >
                    ‹
                  </button>
                  <h3 className="text-xl font-semibold capitalize text-white">
                    {monthName} {year}
                  </h3>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded-full p-2 text-white hover:bg-gray-800"
                    aria-label="Mes siguiente"
                  >
                    ›
                  </button>
                </div>
                {requireBothDates && (
                  <p className="text-sm text-gray-400">
                    {!tempStartDate
                      ? hintStart
                      : !tempEndDate
                        ? hintEnd
                        : `${formatDisplayDate(tempStartDate)} - ${formatDisplayDate(tempEndDate)}`}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-7 gap-0 px-4">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-sm font-medium text-gray-400"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 p-4 pb-6">
                {days.map((dayInfo, index) => {
                  const isStart = isDateSelected(dayInfo.year, dayInfo.month, dayInfo.day, 'start')
                  const isEnd = isDateSelected(dayInfo.year, dayInfo.month, dayInfo.day, 'end')
                  const inRange = isDateInRange(dayInfo.year, dayInfo.month, dayInfo.day)
                  const today = isToday(dayInfo.year, dayInfo.month, dayInfo.day)
                  const disabled =
                    !dayInfo.isCurrentMonth || isDateDisabled(dayInfo.year, dayInfo.month, dayInfo.day)

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        handleDayClick(dayInfo.year, dayInfo.month, dayInfo.day, dayInfo.isCurrentMonth)
                      }
                      disabled={disabled}
                      className={`
                        relative flex aspect-square items-center justify-center rounded-full text-base font-medium transition-all
                        ${disabled ? 'cursor-not-allowed text-gray-600' : 'cursor-pointer text-white'}
                        ${isStart ? 'z-10 scale-110 bg-blue-600 font-bold text-white' : ''}
                        ${isEnd ? 'z-10 scale-110 bg-gray-500 font-bold text-white' : ''}
                        ${inRange ? 'bg-gray-800/50' : ''}
                        ${today && !isStart && !isEnd && !disabled ? 'bg-orange-500 text-white' : ''}
                        ${!isStart && !isEnd && !today && !disabled ? 'hover:bg-gray-800 active:scale-95' : ''}
                      `}
                    >
                      {dayInfo.day}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
