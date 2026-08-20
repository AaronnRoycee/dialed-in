'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewBeanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [roaster, setRoaster] = useState('')
  const [coffeeName, setCoffeeName] = useState('')
  const [origin, setOrigin] = useState('')
  const [roastLevel, setRoastLevel] = useState('')
  const [roastDate, setRoastDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth/sign-in')
        return
      }
      supabase
        .from('profiles')
        .select('id, household_id')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (!data?.household_id) router.push('/setup')
          else {
            setHouseholdId(data.household_id)
            setProfileId(data.id)
          }
        })
    })
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!householdId || !profileId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('beans')
      .insert({
        household_id: householdId,
        roaster,
        coffee_name: coffeeName,
        origin,
        roast_level: roastLevel,
        roast_date: roastDate || null,
        notes,
        created_by: profileId,
      })
      .select('id')
      .single()

    setLoading(false)
    if (error) {
      alert(error.message)
      return
    }

    router.push(`/beans/${data.id}`)
  }

  return (
    <main className="min-h-screen p-6 pb-24 pt-12">
      <h1 className="text-2xl font-semibold text-espresso-100">Add a bean</h1>
      <form onSubmit={submit} className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="text-sm text-espresso-300">Roaster</label>
          <input
            type="text"
            placeholder="e.g. Counter Culture"
            value={roaster}
            onChange={(e) => setRoaster(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
            required
          />
        </div>
        <div>
          <label className="text-sm text-espresso-300">Bean name</label>
          <input
            type="text"
            placeholder="e.g. Hologram"
            value={coffeeName}
            onChange={(e) => setCoffeeName(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
            required
          />
        </div>
        <div>
          <label className="text-sm text-espresso-300">Origin</label>
          <input
            type="text"
            placeholder="e.g. Ethiopia"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
          />
        </div>
        <div>
          <label className="text-sm text-espresso-300">Roast level</label>
          <select
            value={roastLevel}
            onChange={(e) => setRoastLevel(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none focus:ring-2 focus:ring-espresso-300"
          >
            <option value="">Select</option>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="medium-dark">Medium-dark</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-espresso-300">Roast date</label>
          <input
            type="date"
            value={roastDate}
            onChange={(e) => setRoastDate(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 outline-none focus:ring-2 focus:ring-espresso-300"
          />
        </div>
        <div>
          <label className="text-sm text-espresso-300">Notes</label>
          <textarea
            placeholder="Flavors, purchase notes, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl bg-espresso-800 p-3 text-espresso-100 placeholder-espresso-500 outline-none focus:ring-2 focus:ring-espresso-300"
            rows={4}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Add bean'}
        </button>
      </form>
    </main>
  )
}
