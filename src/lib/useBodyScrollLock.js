import { useEffect } from 'react'

/**
 * Prevents the page background from scrolling while a modal is open.
 * Restores scroll when the modal unmounts.
 */
export function useBodyScrollLock() {
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])
}
