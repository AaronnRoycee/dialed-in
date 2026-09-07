'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSignedUrls } from '@/lib/storage'

type Bean = {
  id: string
  roaster: string
  coffee_name: string
  origin: string | null
  roast_level: string | null
  is_active: boolean
  is_finished: boolean
  status: string | null
  household_id: string
}

type Shot = {
  id: string
  dose_g: number
  target_yield_g: number
  actual_yield_g: number | null
  actual_time_s: number | null
  external_grind_setting: number | null
  created_at: string
  taste_reviews: { overall_rating: number | null }[]
}

type GoldenRecipe = {
  shot_id: string
  dose_g: number
  yield_g: number
  brew_ratio: number | null
  extraction_time_s: number | null
  external_grind_setting: number | null
  internal_burr_setting: number | null
}

type Media = {
  entity_id: string
  entity_type: string
  storage_path: string
  is_primary: boolean
}

export default function BenchPage() {
  const router = useRouter()
  const [householdName, setHouseholdName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentBean, setCurrentBean] = useState<Bean | null>(null)
  const [beanPhoto, setBeanPhoto] = useState<string | null>(null)
  const [golden, setGolden] = useState<GoldenRecipe | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [averageRating, setAverageRating] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
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

      const { data: household } = await supabase
        .from('households')
        .select('name')
        .eq('id', profile.household_id)
        .single()

      setHouseholdName(household?.name ?? 'Home')

      const { data: beanData } = await supabase
        .from('beans')
        .select('*')
        .eq('household_id', profile.household_id)
        .eq('is_finished', false)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!beanData || beanData.length === 0) {
        setLoading(false)
        return
      }

      const bean = beanData[0] as Bean
      setCurrentBean(bean)

      const [{ data: recipeData }, { data: shotData }] = await Promise.all([
        supabase
          .from('golden_recipes')
          .select(
            'shot_id, dose_g, yield_g, brew_ratio, extraction_time_s, external_grind_setting, internal_burr_setting, overall_rating'
          )
          .eq('bean_id', bean.id)
          .eq('is_active', true)
          .single(),
        supabase
          .from('shots')
          .select(
            'id, dose_g, target_yield_g, actual_yield_g, actual_time_s, external_grind_setting, created_at, taste_reviews(overall_rating)'
          )
          .eq('bean_id', bean.id)
          .eq('household_id', profile.household_id)
          .order('created_at', { ascending: true }),
      ])

      if (recipeData) setGolden(recipeData as GoldenRecipe)

      const items = (shotData as unknown as Shot[]) ?? []
      setShots(items)

      const ratings = items
        .flatMap((s) => s.taste_reviews)
        .map((r) => r.overall_rating)
        .filter((r): r is number => r !== null && r !== undefined)
      const avg =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null
      setAverageRating(avg)

      const shotIds = items.map((s) => s.id)
      const { data: mediaData } = await supabase
        .from('media')
        .select('entity_id, entity_type, storage_path, is_primary')
        .eq('is_primary', true)
        .in('entity_id', [bean.id, ...shotIds])
        .or('entity_type.eq.bean,entity_type.eq.shot')

      const media = (mediaData as Media[]) ?? []
      const urls = await getSignedUrls(
        supabase,
        media.map((m) => m.storage_path)
      )
      setThumbs(
        Object.fromEntries(
          media.map((m) => [
            `${m.entity_type}:${m.entity_id}`,
            urls[m.storage_path],
          ])
        )
      )

      const beanMedia = media.find(
        (m) => m.entity_type === 'bean' && m.entity_id === bean.id
      )
      if (beanMedia) setBeanPhoto(urls[beanMedia.storage_path])

      setLoading(false)
    }

    load()
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/sign-in')
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '—'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const updateStatus = async (value: string) => {
    if (!currentBean) return
    await supabase
      .from('beans')
      .update({ status: value })
      .eq('id', currentBean.id)
    setCurrentBean({ ...currentBean, status: value })
  }

  const lastShot = shots[shots.length - 1]
  const topShots = [...shots]
    .sort((a, b) => {
      const ra = a.taste_reviews[0]?.overall_rating ?? -1
      const rb = b.taste_reviews[0]?.overall_rating ?? -1
      if (rb !== ra) return rb - ra
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .slice(0, 5)
  const goldenPhoto = golden ? thumbs[`shot:${golden.shot_id}`] : null

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-espresso-300">Loading your bench...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-espresso-100">
          {householdName}
        </h1>
        <button
          onClick={signOut}
          className="rounded-xl bg-espresso-800 px-4 py-2 text-sm text-espresso-300"
        >
          Sign out
        </button>
      </div>

      {!currentBean ? (
        <div className="mt-12 rounded-2xl bg-espresso-800 p-6 text-center shadow-xl">
          <p className="text-espresso-300">
            No active bean. Add one to get started.
          </p>
          <button
            onClick={() => router.push('/beans/new')}
            className="mt-4 rounded-xl bg-espresso-300 px-6 py-3 font-semibold text-espresso-900"
          >
            Add a bean
          </button>
        </div>
      ) : (
        <>
          <h2 className="mt-6 text-lg font-semibold text-espresso-100">
            Current bean
          </h2>
          <div className="mt-2 overflow-hidden rounded-2xl bg-espresso-800 shadow-xl">
            <div className="relative h-48 w-full bg-espresso-900">
              {beanPhoto ? (
                <img
                  src={beanPhoto}
                  alt={currentBean.coffee_name}
                  className="h-full w-full object-cover"
              />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-espresso-500">
                  No bean photo
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-espresso-950/90 to-transparent p-4">
                <p className="text-sm uppercase tracking-wide text-espresso-300">
                  {currentBean.roaster}
                </p>
                <h2 className="text-2xl font-semibold text-espresso-100">
                  {currentBean.coffee_name}
                </h2>
              </div>
            </div>
          </div>

          {golden && (
            <div className="mt-6 rounded-2xl bg-espresso-800 p-6 shadow-xl">
              {goldenPhoto && (
                <img
                  src={goldenPhoto}
                  alt="Golden recipe"
                  className="mb-4 h-48 w-full rounded-xl object-cover"
                />
              )}
              <div className="flex items-center gap-2">
                <span className="text-2xl">GR</span>
                <h3 className="text-lg font-semibold text-espresso-100">
                  Golden Recipe
                </h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="rounded-xl bg-yellow-900/30 p-3">
                  <p className="text-xs text-yellow-200/80">External grind</p>
                  <p className="text-xl font-semibold text-yellow-100">
                    {golden.external_grind_setting ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-yellow-900/30 p-3">
                  <p className="text-xs text-yellow-200/80">Internal burr</p>
                  <p className="text-xl font-semibold text-yellow-100">
                    {golden.internal_burr_setting ?? '—'}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="rounded-xl bg-espresso-900 p-3">
                  <p className="text-xs text-espresso-500">Dose</p>
                  <p className="text-xl font-semibold text-espresso-100">
                    {golden.dose_g}g
                  </p>
                </div>
                <div className="rounded-xl bg-espresso-900 p-3">
                  <p className="text-xs text-espresso-500">Yield</p>
                  <p className="text-xl font-semibold text-espresso-100">
                    {golden.yield_g}g
                  </p>
                </div>
                <div className="rounded-xl bg-espresso-900 p-3">
                  <p className="text-xs text-espresso-500">Ratio</p>
                  <p className="text-xl font-semibold text-espresso-100">
                    1:{golden.brew_ratio?.toFixed(1) ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-espresso-900 p-3">
                  <p className="text-xs text-espresso-500">Time</p>
                  <p className="text-xl font-semibold text-espresso-100">
                    {formatTime(golden.extraction_time_s)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/shots/pull')}
            className="mt-6 w-full rounded-2xl bg-espresso-300 py-4 text-xl font-semibold text-espresso-900 shadow-lg"
          >
            Pull a Shot
          </button>

          {lastShot && (
            <div className="mt-6 rounded-2xl bg-espresso-800 p-4 shadow-xl">
              <h3 className="text-lg font-semibold text-espresso-100">
                Last Shot
              </h3>
              <div className="mt-3 flex gap-4">
                {thumbs[`shot:${lastShot.id}`] ? (
                  <img
                    src={thumbs[`shot:${lastShot.id}`]}
                    alt="last shot"
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-espresso-900" />
                )}
                <div>
                  <p className="text-espresso-100">
                    {lastShot.dose_g}g → {lastShot.actual_yield_g ?? '—'}g
                  </p>
                  <p className="text-sm text-espresso-300">
                    {formatTime(lastShot.actual_time_s)}
                  </p>
                  <p className="text-sm text-espresso-300">
                    Rating:{' '}
                    {lastShot.taste_reviews[0]?.overall_rating ?? '—'}/5
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-espresso-800 p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-espresso-100">
              Current Bag
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-espresso-900 p-3">
                <p className="text-2xl font-semibold text-espresso-100">
                  {shots.length}
                </p>
                <p className="text-xs text-espresso-500">Shots</p>
              </div>
              <div className="rounded-xl bg-espresso-900 p-3">
                <p className="text-2xl font-semibold text-espresso-100">
                  {averageRating?.toFixed(1) ?? '—'}
                </p>
                <p className="text-xs text-espresso-500">Avg rating</p>
              </div>
              <div className="rounded-xl bg-espresso-900 p-3">
                <p className="text-lg font-semibold text-espresso-100">
                  {currentBean.status || (golden ? 'Dialed In' : 'Dialing In')}
                </p>
                <p className="text-xs text-espresso-500">Status</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm text-espresso-300">Update status</label>
              <select
                value={currentBean.status || ''}
                onChange={(e) => updateStatus(e.target.value)}
                className="mt-1 w-full rounded-xl bg-espresso-900 p-3 text-espresso-100 outline-none"
              >
                <option value="Dialing In">Dialing In</option>
                <option value="Dialed In">Dialed In</option>
                <option value="Almost Empty">Almost Empty</option>
                <option value="Finished">Finished</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
          </div>

          {topShots.length > 0 && (
            <div className="mt-6 rounded-2xl bg-espresso-800 p-4 shadow-xl">
              <h3 className="text-lg font-semibold text-espresso-100">
                Top 5 Rated Shots
              </h3>
              <div className="mt-4 space-y-4">
                {topShots.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso-300 text-sm font-bold text-espresso-900">
                        {i + 1}
                      </div>
                      {i < topShots.length - 1 && (
                        <div className="h-full w-0.5 min-h-[2rem] bg-espresso-600" />
                      )}
                    </div>
                    <div className="flex flex-1 gap-3 rounded-xl bg-espresso-900 p-3">
                      {thumbs[`shot:${s.id}`] ? (
                        <img
                          src={thumbs[`shot:${s.id}`]}
                            alt={`shot ${i + 1}`}
                            className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-espresso-800" />
                      )}
                      <div>
                        <p className="text-sm text-espresso-100">
                          Grind {s.external_grind_setting ?? '—'} · {s.dose_g}g
                          → {s.actual_yield_g ?? '—'}g
                        </p>
                        <p className="text-xs text-espresso-400">
                          {formatTime(s.actual_time_s)} · Rating:{' '}
                          {s.taste_reviews[0]?.overall_rating ?? '—'}/5
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {golden && (
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-600 text-sm font-bold text-espresso-100">
                      GR
                    </div>
                    <div className="rounded-xl bg-yellow-900/30 p-3 text-yellow-100">
                      <p className="font-semibold">Golden Recipe</p>
                      <p className="text-sm text-yellow-200/80">
                        {golden.dose_g}g → {golden.yield_g}g ·{' '}
                        {formatTime(golden.extraction_time_s)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
