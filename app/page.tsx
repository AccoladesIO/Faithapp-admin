"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingScreen } from '@/components/layout/loading'
import { authService } from '@/utils/auth/auth'
import LoginPage from '@/components/layout/login-page'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

const Page = () => {
  const router = useRouter()
  const [status, setStatus] = useState<AuthStatus>('checking')

  useEffect(() => {
    authService.checkUserSession((isActive) => {
      setStatus(isActive ? 'authenticated' : 'unauthenticated')
    })
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      router.push("/home")
    }
  }, [status, router])

  if (status === 'checking' || status === 'authenticated') {
    return <LoadingScreen />
  }

  return <LoginPage />
}

export default Page