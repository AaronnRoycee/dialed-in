'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSignedUrls } from '@/lib/storage'
import ShotCard from '@/components/ShotCard'

type Bean = { id: string; roaster: string; coffee_name: string }

type Shot = {
  id: string
  bean_id: string
  household_id: string
  machine_id: string | null
  grinder_id: string | null
  dose_g: number
  target_yield_g: number
  actual_yield_g: number | null
  actual_time_s: number | null
  brew_ratio: number | null
  external_grind_setting: number | null
  internal_burr_setting: number | null
  drink_type: string | null
  created_at: string
  beans: Bean
  taste_reviews: { overall_rating: number | null }[]
}

type Media = {
  entity_id: string
  storage_path: string
}

export default function ShotsPage() {
  const router = useRouter()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [beans, setBeans] = useState<Bean[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [goldenShotIds, setGoldenShotIds] = useState<Set<string>>(new Set())
  const [beanFilter, setBeanFilter] = useState('all')
  const [minRating, setMinRating] = useState('0')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session) {
      router.push('/auth/sign-in')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('user_id', session.user.id)
      .single()

    if (!profile?.household_id) {
      router.push('/setup')
      return
    }

    setHouseholdId(profile.household_id)

    const [{ data: shotData }, { data: beanData }] = await Promise.all([
      supabase
        .from('shots')
        .select(
          'id, bean_id, household_id, machine_id, grinder_id, dose_g, target_yield_g, actual_yield_g, actual_time_s, brew_ratio, external_grind_setting, internal_burr_setting, drink_type, created_at, beans(id, roaster, coffee_name), taste_reviews(overall_rating)'
        )
        .eq('household_id', profile.household_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('beans')
        .select('id, roaster, coffee_name')
        .eq('household_id', profile.household_id)
        .order('created_at', { ascending: false }),
    ])

    const items = (shotData as unknown as Shot[]) ?? []
    setShots(items)
    setBeans(beanData as Bean[])

    const { data: goldenData } = await supabase
      .from('golden_recipes')
      .select('shot_id')
      .eq('household_id', profile.household_id)
      .eq('is_active', true)

    const goldenIds = new Set(
      ((goldenData as { shot_id: string }[]) ?? []).map((g) => g.shot_id)
    )
    setGoldenShotIds(goldenIds)

    if (items.length > 0) {
      const { data: mediaData } = await supabase
        .from('media')
        .select('entity_id, storage_path')
        .eq('entity_type', 'shot')
        .eq('is_primary', true)
        .in(
          'entity_id',
          items.map((s) => s.id)
        )

      const media = (mediaData as Media[]) ?? []
      const urls = await getSignedUrls(
        supabase,
        media.map((m) => m.storage_path)
      )
      setThumbs(
        Object.fromEntries(media.map((m) => [m.entity_id, urls[m.storage_path]]))
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [router])

  const filteredShots = useMemo(() => {
    const min = Number(minRating)
    return shots.filter((s) => {
      const beanOk = beanFilter === 'all' || s.bean_id === beanFilter
      const rating = s.taste_reviews[0]?.overall_rating ?? 0
      const ratingOk = min === 0 || rating >= min
      return beanOk && ratingOk
    })
  }, [shots, beanFilter, minRating])

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-espresso-300">Loading shots...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 pb-28">
      <h1 className="text-2xl font-semibold text-espresso-100">Shot History</h1>

      <div className="mt-4 flex gap-3 overflow-x-auto">
        <select
          value={beanFilter}
          onChange={(e) => setBeanFilter(e.target.value)}
          className="rounded-xl bg-espresso-800 p-2 text-espresso-100 outline-none"
        >
          <option value="all">All beans</option>
          {beans.map((b) => (
            <option key={b.id} value={b.id}>
              {b.roaster} — {b.coffee_name}
            </option>
          ))}
        </select>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="rounded-xl bg-espresso-800 p-2 text-espresso-100 outline-none"
        >
          <option value="0">Any rating</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="5">5</option>
        </select>
      </div>

      {filteredShots.length === 0 ? (
        <p className="mt-8 text-espresso-400">No shots match the filters.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredShots.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              imageUrl={thumbs[shot.id] ?? null}
              isGolden={goldenShotIds.has(shot.id)}
              onLocked={load}
            />
          ))}
        </div>
      )}
    </main>
  )
}
