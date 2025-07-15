import { ref } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

const toasts = ref<Toast[]>([])

export function useToast() {
  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      id,
      duration: 4000,
      ...toast
    }
    
    toasts.value.push(newToast)
    
    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
    
    return id
  }
  
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const success = (title: string, message?: string) => {
    return showToast({ type: 'success', title, message })
  }
  
  const error = (title: string, message?: string) => {
    return showToast({ type: 'error', title, message, duration: 6000 })
  }
  
  const info = (title: string, message?: string) => {
    return showToast({ type: 'info', title, message })
  }
  
  const warning = (title: string, message?: string) => {
    return showToast({ type: 'warning', title, message })
  }
  
  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
    warning
  }
} 