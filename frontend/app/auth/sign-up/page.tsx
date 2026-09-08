'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setMessage('Account created. Please check your email to confirm before signing in.')
      return
    }

    router.push('/setup')
  }

  const signInWithApple = async () => {
    setError(null)
    const { error: appleError } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    })
    if (appleError) setError(appleError.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-espresso-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-espresso-800 rounded-2xl p-6 shadow-xl"
      >
        <h1 className="text-2xl font-semibold text-espresso-100">Create account</h1>
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
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
            required
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900"
          >
            Sign up
          </button>
          <div className="flex items-center gap-3 text-xs text-espresso-500">
            <div className="h-px flex-1 bg-espresso-700" />
            or
            <div className="h-px flex-1 bg-espresso-700" />
          </div>
          <button
            type="button"
            onClick={signInWithApple}
            className="w-full rounded-xl bg-espresso-100 py-3 font-semibold text-espresso-900"
          >
            Continue with Apple
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-espresso-300">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
