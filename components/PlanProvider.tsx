'use client'
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'

const PlanContext = createContext<{ isASDUser: boolean }>({ isASDUser: false })

// Inner component — only rendered when ClerkProvider is present (production)
function ClerkPlanLoader({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const isASDUser = user?.publicMetadata?.plan === 'asd_user'
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
