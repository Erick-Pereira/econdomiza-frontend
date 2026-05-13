'use client'
import React from 'react'

export interface ErrorNotification {
  id: string
  message: string
  type: 'error' | 'warning' | 'info' | 'success'
}

export interface ErrorContextValue {
  showNotification: (message: string, type?: 'error' | 'warning' | 'info' | 'success') => void
  clearError: () => void
  isLoading: boolean
}

export const ErrorContext = React.createContext<ErrorContextValue | null>(null)

export const ErrorProvider = (props: {
  children: React.ReactNode
  maxErrors?: number
  autoDismiss?: boolean
  autoDismissDuration?: number
}) => {
  const {
    children,
    maxErrors = 3,
    autoDismiss = true,
    autoDismissDuration = 5000,
  } = props

  const [, setErrors] = React.useState<ErrorNotification[]>([])
  const [isLoading] = React.useState(false)

  const showErrorNotification = React.useCallback(
    (message: string, type = 'error') => {
      const id = Date.now().toString(36)
      const newError = { id, message, type } as ErrorNotification
      setErrors((prev) => [...prev, newError].slice(-maxErrors))

      if (autoDismiss) {
        setTimeout(() => {
          setErrors((prev) => prev.filter((e) => e.id !== id))
        }, autoDismissDuration)
      }

      console.error('[ErrorNotification]', message)
    },
    [maxErrors, autoDismiss, autoDismissDuration]
  )

  const clearError = React.useCallback(() => {
    setErrors([])
  }, [])

  const contextValue = React.useMemo<ErrorContextValue>(
    () => ({
      showNotification: showErrorNotification,
      clearError,
      isLoading,
    }),
    [showErrorNotification, clearError, isLoading]
  )

  const ErrorContextComponent = React.createElement(ErrorContext.Provider, { value: contextValue }, children)
  return ErrorContextComponent
}

export const useErrorNotification = () => {
  const context = React.useContext(ErrorContext)
  if (!context) {
    throw new Error('useErrorNotification must be used within an ErrorProvider')
  }
  return context
}
