'use client'

import { useEffect, useState } from 'react'
import { IoCalendarOutline, IoCheckmarkCircle, IoCloseCircleOutline } from 'react-icons/io5'

type NoticeAccent = 'sky' | 'red'

type Notice = {
  key: string
  title: string
  points: string[]
  accent: NoticeAccent
  icon: 'calendar' | 'close'
}

const NOTICES: Notice[] = [
  {
    key: 'pedri.notice.ical-export.v1',
    title: 'Airbnb y Booking ya leen Pedri',
    accent: 'sky',
    icon: 'calendar',
    points: [
      'Si bloqueabas en Pedri, no se bloqueaba en Airbnb ni en Booking. Ya quedó arreglado.',
      'No tenés que cambiar las URLs que ya pegaste.',
      'Puede tardar unas horas. Si en alguna plataforma el calendario de Pedri figura con error, volvé a importar la misma URL.',
    ],
  },
  {
    key: 'pedri.notice.canceladas-inicio.v1',
    title: 'Las canceladas ya no se mezclan',
    accent: 'red',
    icon: 'close',
    points: [
      'En Inicio no aparecen por defecto.',
      'Entre el calendario y la primera reserva hay un botón Canceladas con la cantidad del día.',
      'Al tocarlo se ven en el lugar que les corresponde y el botón queda en rojo. Al tocarlo de nuevo se ocultan.',
    ],
  },
]

function isUnread(key: string) {
  try {
    return !localStorage.getItem(key)
  } catch {
    return true
  }
}

const accentClass: Record<
  NoticeAccent,
  { wash: string; badge: string; label: string; check: string }
> = {
  sky: {
    wash: 'from-sky-500/15 via-gray-950 to-gray-950',
    badge: 'bg-sky-500/15 ring-sky-500/30',
    label: 'text-sky-300',
    check: 'text-sky-400',
  },
  red: {
    wash: 'from-red-500/15 via-gray-950 to-gray-950',
    badge: 'bg-red-500/15 ring-red-500/30',
    label: 'text-red-300',
    check: 'text-red-400',
  },
}

export default function OneTimeNotice() {
  const [index, setIndex] = useState<number | null>(null)

  useEffect(() => {
    const next = NOTICES.findIndex((notice) => isUnread(notice.key))
    setIndex(next === -1 ? null : next)
  }, [])

  const dismiss = () => {
    if (index === null) return
    const current = NOTICES[index]
    try {
      localStorage.setItem(current.key, '1')
    } catch {}
    const next = NOTICES.findIndex((notice, i) => i > index && isUnread(notice.key))
    setIndex(next === -1 ? null : next)
  }

  useEffect(() => {
    if (index === null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [index])

  if (index === null) return null

  const notice = NOTICES[index]
  const accent = accentClass[notice.accent]
  const Icon = notice.icon === 'calendar' ? IoCalendarOutline : IoCloseCircleOutline

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pedri-notice-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`border-b border-gray-800 bg-gradient-to-br ${accent.wash} px-6 pb-5 pt-6`}>
          <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ring-1 ${accent.badge}`}>
            <Icon className={`text-xl ${accent.label}`} />
          </div>
          <p className={`text-xs font-medium uppercase tracking-wide ${accent.label}`}>Actualización</p>
          <h2 id="pedri-notice-title" className="mt-1 text-xl font-semibold text-white">
            {notice.title}
          </h2>
        </div>

        <ul className="space-y-3 px-6 py-5">
          {notice.points.map((texto) => (
            <li key={texto} className="flex gap-3 text-sm leading-relaxed text-gray-300">
              <IoCheckmarkCircle className={`mt-0.5 flex-shrink-0 text-lg ${accent.check}`} />
              <span>{texto}</span>
            </li>
          ))}
        </ul>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-xl bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-gray-200"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
