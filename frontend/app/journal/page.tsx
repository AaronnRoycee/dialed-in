'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSignedUrls } from '@/lib/storage'
import Lightbox from '@/components/Lightbox'
import PhotoManager from '@/components/PhotoManager'
import Link from 'next/link'

type Profile = { display_name: string | null }

type Media = {
  id: string
  storage_path: string
  media_category: string
  entity_type: string
  entity_id: string
  caption: string | null
  created_at: string
  uploaded_by: string | null
  profiles: Profile | null
}

type Bean = {
  id: string
  roaster: string
  coffee_name: string
}

type Shot = {
  id: string
  dose_g: number
  actual_yield_g: number | null
  actual_time_s: number | null
  beans: Bean
  taste_reviews: { overall_rating: number | null }[]
}

const FILTERS: Record<string, (m: Media) => boolean> = {
  All: () => true,
  Espresso: (m) =>
    m.media_category === 'espresso' || m.media_category === 'crema',
  Beans: (m) =>
    m.media_category === 'bean_bag' ||
    m.media_category === 'beans',
  'Latte Art': (m) => m.media_category === 'latte_art',
  Pucks: (m) =>
    m.media_category === 'puck_before' ||
    m.media_category === 'puck_after',
  Equipment: (m) =>
    m.media_category === 'grinder' ||
    m.media_category === 'equipment',
  'Golden Recipes': (m) => m.entity_type === 'golden_recipe',
}

export default function JournalPage() {
  const router = useRouter()
  const [media, setMedia] = useState<Media[]>([])
  const [beans, setBeans] = useState<Record<string, Bean>>({})
  const [shots, setShots] = useState<Record<string, Shot>>({})
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('All')
  const [lightbox, setLightbox] = useState<Media | null>(null)
  const [loading, setLoading] = useState(true)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const loadData = async () => {
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

      const [{ data: mediaData }, { data: beanData }, { data: shotData }] =
        await Promise.all([
          supabase
            .from('media')
            .select(
              'id, storage_path, media_category, entity_type, entity_id, caption, created_at, uploaded_by, profiles(display_name)'
            )
            .eq('household_id', profile.household_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('beans')
            .select('id, roaster, coffee_name')
            .eq('household_id', profile.household_id),
          supabase
            .from('shots')
            .select(
              'id, dose_g, actual_yield_g, actual_time_s, beans(id, roaster, coffee_name), taste_reviews(overall_rating)'
            )
            .eq('household_id', profile.household_id),
        ])

      const mediaItems = (mediaData as unknown as Media[]) ?? []
      setMedia(mediaItems)
      setHouseholdId(profile.household_id)

      const beanMap = Object.fromEntries(
        ((beanData as unknown as Bean[]) ?? []).map((b) => [b.id, b])
      )
      setBeans(beanMap)

      const shotItems = (shotData as unknown as Shot[]) ?? []
      const shotMap = Object.fromEntries(shotItems.map((s) => [s.id, s]))
      setShots(shotMap)

      const signed = await getSignedUrls(
        supabase,
        mediaItems.map((m) => m.storage_path)
      )
      setUrls(signed)

      setLoading(false)
    }

    loadData()
  }, [router, refresh])

  const filtered = useMemo(
    () => media.filter(FILTERS[filter] ?? FILTERS.All),
    [media, filter]
  )

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '—'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const context = (item: Media) => {
    if (item.entity_type === 'bean') {
      const b = beans[item.entity_id]
      return b ? `${b.roaster} — ${b.coffee_name}` : item.media_category
    }
    if (item.entity_type === 'shot') {
      const s = shots[item.entity_id]
      if (!s) return item.media_category
      return `${s.beans.roaster} — ${s.beans.coffee_name} · ${s.dose_g}g → ${s.actual_yield_g ?? '—'}g · ${formatTime(s.actual_time_s)} · ${s.taste_reviews[0]?.overall_rating ?? '—'}/5`
    }
    if (item.entity_type === 'golden_recipe') return 'Golden Recipe'
    return item.media_category
  }

  const linkFor = (item: Media) => {
    if (item.entity_type === 'bean') return `/beans/${item.entity_id}`
    if (item.entity_type === 'shot') return `/shots`
    return undefined
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-espresso-300">Loading journal...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 pb-28">
      <h1 className="text-2xl font-semibold text-espresso-100">Journal</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {Object.keys(FILTERS).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
              f === filter
                ? 'bg-espresso-300 text-espresso-900'
                : 'bg-espresso-800 text-espresso-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {householdId && (
        <div className="mt-4 rounded-2xl bg-espresso-800 p-4 shadow-xl">
          <h2 className="text-sm font-semibold text-espresso-100">Upload</h2>
          <PhotoManager
            householdId={householdId}
            entityType="household"
            entityId={householdId}
            categories={[
              'espresso',
              'latte_art',
              'puck_before',
              'puck_after',
              'equipment',
              'grinder',
              'bean_bag',
              'beans',
              'other',
            ]}
            onUpdate={() => setRefresh((r) => r + 1)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="mt-8 text-espresso-400">
          No photos in this category yet.
        </p>
      ) : (
        <div className="mt-6 columns-2 gap-4 space-y-4 sm:columns-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setLightbox(item)}
              className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-2xl bg-espresso-800 shadow-xl"
            >
              {urls[item.storage_path] ? (
                <img
                    src={urls[item.storage_path]}
                    alt={item.caption ?? item.media_category}
                    className="w-full"
              />
              ) : (
                <div className="h-40 w-full bg-espresso-900" />
              )}
              <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-espresso-950/90 to-transparent p-3 transition-transform group-hover:translate-y-0">
                <p className="text-sm text-espresso-100">{context(item)}</p>
                <p className="text-xs text-espresso-300">
                  {item.profiles?.display_name ?? 'Unknown'} ·{' '}
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && urls[lightbox.storage_path] && (
        <Lightbox
          src={urls[lightbox.storage_path]}
          onClose={() => setLightbox(null)}
        />
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/90 p-4 sm:items-center"
        >
          <div className="max-w-lg rounded-2xl bg-espresso-800 p-6 text-center shadow-xl">
            <p className="text-lg font-semibold text-espresso-100">
              {lightbox.caption ?? context(lightbox)}
            </p>
            <p className="mt-1 text-sm text-espresso-300">
              {lightbox.media_category} ·{' '}
              {lightbox.profiles?.display_name ?? 'Unknown'} ·{' '}
              {new Date(lightbox.created_at).toLocaleDateString()}
            </p>
            {linkFor(lightbox) && (
              <Link
                href={linkFor(lightbox) as string}
                onClick={(e) => e.stopPropagation()}
                className="mt-4 inline-block rounded-xl bg-espresso-300 px-4 py-2 font-semibold text-espresso-900"
              >
                Open {lightbox.entity_type}
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
