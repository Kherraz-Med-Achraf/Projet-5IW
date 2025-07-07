import { ref, nextTick } from 'vue'

export function useFocusManagement() {
  const focusableElementsSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
    'input[type="radio"]:not([disabled])',
    'input[type="checkbox"]:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ')

  let previousActiveElement: HTMLElement | null = null

  const trapFocus = (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(focusableElementsSelector) as NodeListOf<HTMLElement>
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    element.addEventListener('keydown', handleTabKey)
    return () => element.removeEventListener('keydown', handleTabKey)
  }

  const setInitialFocus = async (element: HTMLElement) => {
    await nextTick()
    const focusableElements = element.querySelectorAll(focusableElementsSelector) as NodeListOf<HTMLElement>
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }
  }

  const savePreviousFocus = () => {
    previousActiveElement = document.activeElement as HTMLElement
  }

  const restorePreviousFocus = () => {
    if (previousActiveElement) {
      previousActiveElement.focus()
      previousActiveElement = null
    }
  }

  return {
    trapFocus,
    setInitialFocus,
    savePreviousFocus,
    restorePreviousFocus
  }
} 