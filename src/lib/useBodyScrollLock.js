import { useEffect } from 'react'

/**
 * Prevents the page background from scrolling while a modal is open.
 * Restores scroll when the modal unmounts or isLocked becomes false.
 *
 * @param {boolean} [isLocked=true] - Pass false to conditionally disable locking.
 *   Useful in components that host modals but aren't modals themselves.
 */
export function useBodyScrollLock(isLocked = true) {
  useEffect(() => {
    if (!isLocked) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isLocked])
}
