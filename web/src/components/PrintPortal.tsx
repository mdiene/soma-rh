import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Document à imprimer, rendu hors de l'application (sous <body>) : invisible à l'écran,
 * seul visible à l'impression. Permet d'imprimer le contenu d'une fenêtre popup sans le reste de la page.
 */
export function PrintPortal({ children }: { children: ReactNode }) {
  const [host] = useState(() => {
    const el = document.createElement('div')
    el.className = 'print-portal'
    return el
  })
  useEffect(() => {
    document.body.appendChild(host)
    return () => { document.body.removeChild(host) }
  }, [host])
  return createPortal(children, host)
}

/** Lance l'impression du seul contenu des PrintPortal. */
export function printPortal() {
  const cls = 'printing-portal'
  document.body.classList.add(cls)
  const done = () => { document.body.classList.remove(cls); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  window.print()
}
