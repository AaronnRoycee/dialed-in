'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MachinePage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/profile')
  }, [router])

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <p className="text-espresso-300">Redirecting to settings...</p>
    </main>
  )
}
