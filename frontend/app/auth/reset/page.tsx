'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/reset-confirm` }
    )

    if (resetError) {
      setError(resetError.message)
      return
    }

    setMessage('If this account exists, a reset email has been sent.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-espresso-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-espresso-800 rounded-2xl p-6 shadow-xl"
      >
        <h1 className="text-2xl font-semibold text-espresso-100">Reset password</h1>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {message && <p className="mt-2 text-sm text-espresso-300">{message}</p>}
        <div className="mt-4 space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
            required
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900"
          >
            Send reset email
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-espresso-300">
          <Link href="/auth/sign-in" className="underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
