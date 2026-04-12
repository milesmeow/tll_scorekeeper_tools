import { useEffect } from 'react'

/**
 * Prevents the page background from scrolling while a modal is open.
 * Scrolls the page to the top when the modal opens.
 * Restores scroll when the modal unmounts.
 */
export function useBodyScrollLock() {
  useEffect(() => {
    const original = document.body.style.overflow
    window.scrollTo(0, 0)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])
}
