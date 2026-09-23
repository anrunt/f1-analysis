import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ApiErrorSchema, SessionsSchema } from '../types'
import type { Session } from '../types'

export function useSessions(year: number) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSessions() {
      setSessionsLoading(true)
      setSessionsError(null)

      try {
        const response = await fetch(`/api/sessions?year=${year}`, { signal: controller.signal })
        const data: unknown = await response.json()

        if (!response.ok) {
          const apiError = ApiErrorSchema.safeParse(data)
          throw new Error(apiError.success ? apiError.data.detail : 'Could not load sessions.')
        }

        const availableSessions = SessionsSchema.parse(data)
        if (!controller.signal.aborted) {
          setSessions(availableSessions)
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setSessionsError(
            caughtError instanceof z.ZodError || caughtError instanceof SyntaxError
              ? 'Received an invalid session list from the server.'
              : caughtError instanceof Error
                ? caughtError.message
                : 'Could not load sessions.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setSessionsLoading(false)
        }
      }
    }

    void loadSessions()
    return () => controller.abort()
  }, [year])

  return { sessions, sessionsLoading, sessionsError }
}
