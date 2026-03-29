'use client'
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'

const PlanContext = createContext<{ isASDUser: boolean }>({ isASDUser: false })

// Inner component — only rendered when ClerkProvider is present (production).
// Uses Clerk Billing's has({ plan }) check against live session claims — no webhook needed.
function ClerkPlanLoader({ children }: { children: ReactNode }) {
  const { has, isLoaded } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isASDUser = isLoaded ? !!(has?.({ plan: 'asd_user' } as any)) : false
  return <PlanContext.Provider value={{ isASDUser }}>{children}</PlanContext.Provider>
}

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

export function PlanProvider({ children }: { children: ReactNode }) {
  if (devBypass) {
    return <PlanContext.Provider value={{ isASDUser: true }}>{children}</PlanContext.Provider>
  }
  return <ClerkPlanLoader>{children}</ClerkPlanLoader>
}

export function usePlan() {
  return useContext(PlanContext)
}
