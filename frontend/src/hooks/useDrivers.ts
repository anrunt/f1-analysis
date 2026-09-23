import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ApiErrorSchema, DriversSchema } from '../types'
import type { Driver } from '../types'

export function useDrivers(sessionId: number) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [driversLoading, setDriversLoading] = useState(true)
  const [driversError, setDriversError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDrivers() {
      setDriversLoading(true)
      setDriversError(null)

      try {
        const response = await fetch(`/api/drivers?session_id=${sessionId}`, { signal: controller.signal })
        const data: unknown = await response.json()

        if (!response.ok) {
          const apiError = ApiErrorSchema.safeParse(data)
          throw new Error(apiError.success ? apiError.data.detail : 'Could not load drivers.')
        }

        const availableDrivers = DriversSchema.parse(data)
        if (!controller.signal.aborted) {
          setDrivers(availableDrivers)
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setDriversError(
            caughtError instanceof z.ZodError || caughtError instanceof SyntaxError
              ? 'Received an invalid driver list from the server.'
              : caughtError instanceof Error
                ? caughtError.message
                : 'Could not load drivers.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setDriversLoading(false)
        }
      }
    }

    void loadDrivers()
    return () => controller.abort()
  }, [sessionId])

  return { drivers, driversLoading, driversError }
}
