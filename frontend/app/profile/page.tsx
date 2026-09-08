'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Household = { id: string; name: string }
type Profile = {
  id: string
  display_name: string | null
  household_id: string | null
}
type Machine = {
  id: string
  name: string
  manufacturer: string | null
  model: string | null
}
type Grinder = {
  id: string
  name: string
  manufacturer: string | null
  model: string | null
  internal_burr_setting: number | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [grinders, setGrinders] = useState<Grinder[]>([])
  const [email, setEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push('/auth/sign-in')
        return
      }
      setEmail(userData.user.email ?? null)
      setUserId(userData.user.id)

      const { data: p } = await supabase
        .from('profiles')
        .select('id, display_name, household_id')
        .eq('user_id', userData.user.id)
        .single()

      if (!p) {
        router.push('/setup')
        return
      }

      const profileData = p as Profile
      setProfile(profileData)
      setDisplayName(profileData.display_name ?? '')

      if (profileData.household_id) {
        const [h, m, g] = await Promise.all([
          supabase
            .from('households')
            .select('id, name')
            .eq('id', profileData.household_id)
            .single(),
          supabase
            .from('machines')
            .select('id, name, manufacturer, model')
            .eq('household_id', profileData.household_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('grinders')
            .select('id, name, manufacturer, model, internal_burr_setting')
            .eq('household_id', profileData.household_id)
            .order('created_at', { ascending: false }),
        ])

        if (h.data) {
          const hData = h.data as Household
          setHousehold(hData)
          setHouseholdName(hData.name)
        }
        setMachines((m.data as Machine[]) ?? [])
        setGrinders((g.data as Grinder[]) ?? [])
      }

      setLoading(false)
    }

    load()
  }, [router])

  const save = async () => {
    if (!profile || !household) return
    const confirmed = window.confirm('Are you sure you want to save these changes?')
    if (!confirmed) return
    setSaving(true)

    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id)

    await supabase
      .from('households')
      .update({ name: householdName })
      .eq('id', household.id)

    for (const machine of machines) {
      await supabase
        .from('machines')
        .update({
          name: machine.name,
          manufacturer: machine.manufacturer,
          model: machine.model,
        })
        .eq('id', machine.id)
    }

    for (const grinder of grinders) {
      await supabase
        .from('grinders')
        .update({
          name: grinder.name,
          manufacturer: grinder.manufacturer,
          model: grinder.model,
          internal_burr_setting: Number(grinder.internal_burr_setting ?? 0),
        })
        .eq('id', grinder.id)
    }

    setSaving(false)
    window.location.reload()
  }

  const addMachine = async () => {
    if (!household || !profile) return
    const { data, error } = await supabase
      .from('machines')
      .insert({
        household_id: household.id,
        name: 'New Machine',
        manufacturer: '',
        model: '',
        created_by: profile.id,
      })
      .select('id, name, manufacturer, model')
      .single()

    if (!error && data) {
      setMachines((prev) => [data as Machine, ...prev])
    }
  }

  const addGrinder = async () => {
    if (!household || !profile) return
    const { data, error } = await supabase
      .from('grinders')
      .insert({
        household_id: household.id,
        name: 'New Grinder',
        manufacturer: '',
        model: '',
        internal_burr_setting: 0,
        created_by: profile.id,
      })
      .select('id, name, manufacturer, model, internal_burr_setting')
      .single()

    if (!error && data) {
      setGrinders((prev) => [data as Grinder, ...prev])
    }
  }

  const removeMachine = async (id: string) => {
    await supabase.from('machines').delete().eq('id', id)
    setMachines((prev) => prev.filter((m) => m.id !== id))
  }

  const removeGrinder = async (id: string) => {
    await supabase.from('grinders').delete().eq('id', id)
    setGrinders((prev) => prev.filter((g) => g.id !== id))
  }

  const copyCode = async () => {
    if (!household) return
    try {
      await navigator.clipboard.writeText(household.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  const joinHousehold = async () => {
    const code = joinCode.trim()
    if (!code) return
    setJoining(true)
    setJoinError(null)

    const { error: joinErr } = await supabase.rpc('join_household', {
      household_code: code,
    })

    if (joinErr) {
      setJoinError(
        joinErr.message.includes('Household not found')
          ? 'Household not found. Check the code and try again.'
          : joinErr.message
      )
      setJoining(false)
      return
    }

    setJoining(false)
    window.location.reload()
  }

  const deleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)

    const { error: deleteErr } = await supabase.rpc('delete_user_account')
    if (deleteErr) {
      setDeleteError(deleteErr.message)
      setDeleting(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/auth/sign-in')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/sign-in')
  }

  const updateMachine = (id: string, field: keyof Machine, value: string) => {
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    )
  }

  const updateGrinder = (
    id: string,
    field: keyof Grinder,
    value: string | number
  ) => {
    setGrinders((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-espresso-300">Loading profile...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 pb-28">
      <h1 className="text-2xl font-semibold text-espresso-100">Profile & Settings</h1>

      <div className="mt-6 space-y-6">
        <section className="rounded-2xl bg-espresso-800 p-5 shadow-xl">
          <h2 className="text-lg font-semibold text-espresso-100">Account</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-sm text-espresso-300">Email</label>
              <p className="mt-1 text-espresso-100">{email ?? '—'}</p>
            </div>
            <div>
              <label className="text-sm text-espresso-300">Username</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-espresso-800 p-5 shadow-xl">
          <h2 className="text-lg font-semibold text-espresso-100">Household</h2>
          {household ? (
            <div className="mt-3 space-y-4">
              <div>
                <label className="text-sm text-espresso-300">Household name</label>
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-espresso-300">Invite code</label>
                <p className="mt-1 break-all rounded-xl bg-espresso-900 p-3 font-mono text-xs text-espresso-100">
                  {household.id}
                </p>
                <p className="mt-1 text-xs text-espresso-500">
                  Share this code so others can join your household.
                </p>
                <button
                  onClick={copyCode}
                  className="mt-2 rounded-xl bg-espresso-300 px-4 py-2 text-sm font-semibold text-espresso-900"
                >
                  {copied ? 'Copied' : 'Copy invite code'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-espresso-300">
                Have an invite code? Join an existing household to share beans,
                shots, and recipes.
              </p>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Household code"
                className="mt-2 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 placeholder-espresso-500 outline-none"
              />
              {joinError && (
                <p className="mt-2 text-sm text-red-400">{joinError}</p>
              )}
              <button
                onClick={joinHousehold}
                disabled={joining || !joinCode.trim()}
                className="mt-2 w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900 disabled:opacity-50"
              >
                {joining ? 'Joining...' : 'Join household'}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-espresso-800 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-espresso-100">Machines</h2>
            <button
              onClick={addMachine}
              className="text-sm font-semibold text-espresso-300"
            >
              + Add
            </button>
          </div>
          {machines.length === 0 ? (
            <p className="mt-2 text-espresso-400">No machines yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {machines.map((m) => (
                <div key={m.id} className="space-y-2 rounded-xl bg-espresso-900 p-3">
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => updateMachine(m.id, 'name', e.target.value)}
                    className="w-full rounded-lg bg-espresso-800 p-2 text-espresso-100 outline-none"
                  />
                  <input
                    type="text"
                    value={m.manufacturer ?? ''}
                    onChange={(e) => updateMachine(m.id, 'manufacturer', e.target.value)}
                    placeholder="Manufacturer"
                    className="w-full rounded-lg bg-espresso-800 p-2 text-espresso-100 placeholder-espresso-500 outline-none"
                  />
                  <input
                    type="text"
                    value={m.model ?? ''}
                    onChange={(e) => updateMachine(m.id, 'model', e.target.value)}
                    placeholder="Model"
                    className="w-full rounded-lg bg-espresso-800 p-2 text-espresso-100 placeholder-espresso-500 outline-none"
                  />
                  <button
                    onClick={() => removeMachine(m.id)}
                    className="text-xs text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-espresso-800 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-espresso-100">Grinders</h2>
            <button
              onClick={addGrinder}
              className="text-sm font-semibold text-espresso-300"
            >
              + Add
            </button>
          </div>
          {grinders.length === 0 ? (
            <p className="mt-2 text-espresso-400">No grinders yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {grinders.map((g) => (
                <div key={g.id} className="space-y-2 rounded-xl bg-espresso-900 p-3">
                  <input
                    type="text"
                    value={g.name}
                    onChange={(e) => updateGrinder(g.id, 'name', e.target.value)}
                    className="w-full rounded-lg bg-espresso-800 p-2 text-espresso-100 outline-none"
                  />
                  <input
                    type="text"
                    value={g.manufacturer ?? ''}
                    onChange={(e) => updateGrinder(g.id, 'manufacturer', e.target.value)}
                    placeholder="Manufacturer"
                    className="w-full rounded-lg bg-espresso-800 p-2 text-espresso-100 placeholder-espresso-500 outline-none"
                  />
                  <input
                    type="text"
                    value={g.model ?? ''}
                    onChange={(e) => updateGrinder(g.id, 'model', e.target.value)}
                    placeholder="Model"
                    className="w-full rounded-lg bg-espresso-800 p-2 text-espresso-100 placeholder-espresso-500 outline-none"
                  />
                  <div>
                    <label className="text-sm text-espresso-500">Internal burr setting</label>
                    <input
                      type="number"
                      value={g.internal_burr_setting ?? ''}
                      onChange={(e) =>
                        updateGrinder(g.id, 'internal_burr_setting', Number(e.target.value))
                      }
                      className="mt-1 w-full rounded-lg bg-espresso-800 p-2 text-espresso-100 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => removeGrinder(g.id)}
                    className="text-xs text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>

        <button
          onClick={signOut}
          className="w-full rounded-xl bg-espresso-800 py-3 font-semibold text-espresso-100"
        >
          Sign out
        </button>

        <section className="rounded-2xl border border-red-900/60 bg-espresso-800 p-5 shadow-xl">
          <h2 className="text-lg font-semibold text-red-400">Danger zone</h2>
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="mt-3 w-full rounded-xl bg-red-950 py-3 font-semibold text-red-300"
            >
              Delete account
            </button>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-espresso-300">
                This permanently deletes your account and profile. If you are
                the only member of your household, all of its beans, shots,
                reviews, recipes, and photos are deleted too. If others share
                your household, their data is kept.
              </p>
              <p className="mt-2 text-sm font-semibold text-red-300">
                This cannot be undone.
              </p>
              {deleteError && (
                <p className="mt-2 text-sm text-red-400">{deleteError}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowDelete(false)}
                  className="flex-1 rounded-xl bg-espresso-900 py-3 font-semibold text-espresso-100"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete forever'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
