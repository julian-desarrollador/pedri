'use client'

import { useEffect, useState } from 'react'
import { IoCalendarOutline, IoCheckmarkCircle } from 'react-icons/io5'

const STORAGE_KEY = 'pedri.notice.ical-export.v1'

const puntos = [
  'Si bloqueabas en Pedri, no se bloqueaba en Airbnb ni en Booking. Ya quedó arreglado.',
  'No tenés que cambiar las URLs que ya pegaste.',
  'Puede tardar unas horas. Si en alguna plataforma el calendario de Pedri figura con error, volvé a importar la misma URL.',
]

export default function OneTimeNotice() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setOpen(false)
  }

  if (!open) return null

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
        <div className="border-b border-gray-800 bg-gradient-to-br from-sky-500/15 via-gray-950 to-gray-950 px-6 pb-5 pt-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/15 ring-1 ring-sky-500/30">
            <IoCalendarOutline className="text-xl text-sky-300" />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-300">Actualización</p>
          <h2 id="pedri-notice-title" className="mt-1 text-xl font-semibold text-white">
            Airbnb y Booking ya leen Pedri
          </h2>
        </div>

        <ul className="space-y-3 px-6 py-5">
          {puntos.map((texto) => (
            <li key={texto} className="flex gap-3 text-sm leading-relaxed text-gray-300">
              <IoCheckmarkCircle className="mt-0.5 flex-shrink-0 text-lg text-sky-400" />
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
