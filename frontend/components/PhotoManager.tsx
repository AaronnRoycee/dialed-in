'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadMediaPath, getSignedUrl, getSignedUrls } from '@/lib/storage'
import Lightbox from './Lightbox'

type Media = {
  id: string
  storage_path: string
  media_category: string
  caption: string | null
  is_primary: boolean
}

export default function PhotoManager({
  householdId,
  entityType,
  entityId,
  categories,
  onUpdate,
}: {
  householdId: string
  entityType: string
  entityId: string
  categories: string[]
  onUpdate?: () => void
}) {
  const [media, setMedia] = useState<Media[]>([])
  const [signed, setSigned] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [category, setCategory] = useState(categories[0] ?? 'other')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('media')
      .select('id, storage_path, media_category, caption, is_primary')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })

    const items = (data as Media[]) ?? []
    setMedia(items)
    await loadSigned(items)
    onUpdate?.()
  }

  const loadSigned = async (items: Media[]) => {
    const urls = await getSignedUrls(
      supabase,
      items.map((m) => m.storage_path)
    )
    setSigned(urls)
  }

  useEffect(() => {
    load()
  }, [entityId])

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return
    setError(null)
    setFiles((prev) => [...prev, ...selected])
    setPreviews((prev) => [
      ...prev,
      ...selected.map((f) => URL.createObjectURL(f)),
    ])
    e.target.value = ''
  }

  const removePreview = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const toJpeg = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const img = document.createElement('img')
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const max = 1920
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > h && w > max) {
          h = Math.round(h * (max / w))
          w = max
        } else if (h > max) {
          w = Math.round(w * (max / h))
          h = max
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject('Canvas not supported')
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (!blob) {
              reject('Could not convert image')
              return
            }
            const name = file.name || 'image.jpg'
            const converted = new File([blob], name, { type: 'image/jpeg' })
            resolve(converted)
          },
          'image/jpeg',
          0.9
        )
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject('Could not load image')
      }
      img.src = url
    })

  const upload = async () => {
    setUploading(true)
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('You must be signed in to upload')
      setUploading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    const profileId = profile?.id
    if (!profileId) {
      setError('You must be signed in to upload')
      setUploading(false)
      return
    }

    const isFirst = media.length === 0
    let anyError: string | null = null

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      let imageFile = file
      try {
        imageFile = await toJpeg(file)
      } catch {
        // use original if conversion fails
      }

      const fileName = imageFile.name || 'image.jpg'
      const path = uploadMediaPath(householdId, entityType, entityId, fileName)
      const { error: upErr } = await supabase.storage
        .from('media')
        .upload(path, imageFile, { contentType: 'image/jpeg', upsert: false })
      if (upErr) {
        anyError = upErr.message
        continue
      }

      await supabase.from('media').insert({
        household_id: householdId,
        uploaded_by: profileId,
        storage_path: path,
        entity_type: entityType,
        entity_id: entityId,
        media_category: category,
        is_primary: isFirst && i === 0,
      })
    }

    previews.forEach(URL.revokeObjectURL)
    setFiles([])
    setPreviews([])
    setUploading(false)
    setError(anyError)
    await load()
  }

  const setPrimary = async (id: string) => {
    await supabase
      .from('media')
      .update({ is_primary: false })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
    await supabase.from('media').update({ is_primary: true }).eq('id', id)
    await load()
  }

  const deleteMedia = async (item: Media) => {
    await supabase.storage.from('media').remove([item.storage_path])
    await supabase.from('media').delete().eq('id', item.id)
    await load()
  }

  const updateCaption = async (id: string, value: string) => {
    await supabase.from('media').update({ caption: value }).eq('id', id)
    setMedia((prev) =>
      prev.map((m) => (m.id === id ? { ...m, caption: value } : m))
    )
  }

  return (
    <div className="mt-6 rounded-2xl bg-espresso-800 p-4 shadow-xl">
      <h3 className="text-lg font-semibold text-espresso-100">Photo gallery</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.map((item) => (
          <div
            key={item.id}
            className={`relative overflow-hidden rounded-xl border-2 ${
              item.is_primary
                ? 'border-espresso-300'
                : 'border-transparent'
            }`}
          >
            {signed[item.storage_path] ? (
              <img
                src={signed[item.storage_path]}
                alt={item.caption ?? item.media_category}
                onClick={() => setLightbox(signed[item.storage_path])}
                className="h-32 w-full cursor-pointer object-cover"
              />
            ) : (
              <div className="h-32 w-full bg-espresso-900" />
            )}
            <div className="absolute left-0 top-0 flex w-full justify-between p-1">
              <button
                onClick={() => setPrimary(item.id)}
                className={`rounded px-2 py-1 text-xs ${
                  item.is_primary
                    ? 'bg-espresso-300 text-espresso-900'
                    : 'bg-espresso-900/80 text-espresso-100'
                }`}
              >
                {item.is_primary ? 'Primary' : 'Set primary'}
              </button>
              <button
                onClick={() => deleteMedia(item)}
                className="rounded bg-red-900/80 px-2 py-1 text-xs text-red-100"
              >
                Delete
              </button>
            </div>
            <input
              type="text"
              value={item.caption ?? ''}
              onChange={(e) => updateCaption(item.id, e.target.value)}
              onBlur={(e) => updateCaption(item.id, e.target.value)}
              placeholder="Caption"
              className="w-full bg-espresso-950 p-2 text-xs text-espresso-100 placeholder-espresso-500 outline-none"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex gap-2">
          <label className="relative min-h-[44px] cursor-pointer rounded-xl bg-espresso-300 px-4 py-3 font-semibold text-espresso-900">
            Take / select photos
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              className="sr-only"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-[44px] rounded-xl bg-espresso-900 px-3 py-2 text-espresso-100 outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {previews.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto">
              {previews.map((p, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img
                    src={p}
                    alt={`preview-${i}`}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                  <button
                    onClick={() => removePreview(i)}
                    className="absolute right-1 top-1 rounded bg-red-900/80 px-1.5 text-xs text-red-100"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={upload}
              disabled={uploading}
              className="min-h-[44px] w-full rounded-xl bg-espresso-300 py-3 font-semibold text-espresso-900 disabled:opacity-50"
            >
              {uploading
                ? 'Uploading...'
                : `Upload ${files.length} photo${
                    files.length === 1 ? '' : 's'
                  }`}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
