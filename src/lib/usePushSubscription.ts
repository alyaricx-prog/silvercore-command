'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

/**
 * Auto-subscribe on mount (silent — only proceeds if permission is already granted
 * or the browser hasn't been asked yet and this is called from a context that wants
 * to prompt immediately, e.g. dashboard on first load).
 */
export function usePushSubscription(organisationId: string | null) {
  useEffect(() => {
    if (!organisationId) return
    if (!isPushSupported()) return

    async function subscribe() {
      try {
        if (Notification.permission === 'denied') return
        const registration = await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()
        // Only auto-subscribe if already granted (don't prompt silently on every page load)
        if (!existing && Notification.permission !== 'granted') return

        const permission = existing ? 'granted' : await Notification.requestPermission()
        if (permission !== 'granted') return

        const subscription = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        })

        const json = subscription.toJSON()
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          organisation_id: organisationId,
        }, { onConflict: 'user_id,endpoint' })
      } catch (err) {
        console.warn('Push subscription failed:', err)
      }
    }

    subscribe()
  }, [organisationId])
}

type PushStatus = 'unsupported' | 'denied' | 'enabled' | 'disabled'

/**
 * Settings-page hook: reports current status and exposes an explicit
 * enable()/disable() pair for a toggle the user controls directly.
 */
export function usePushToggle(organisationId: string | null) {
  const [status, setStatus] = useState<PushStatus>('disabled')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!isPushSupported()) { setStatus('unsupported'); return }
    if (Notification.permission === 'denied') { setStatus('denied'); return }
    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      setStatus(existing ? 'enabled' : 'disabled')
    } catch {
      setStatus('disabled')
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const enable = useCallback(async () => {
    if (!organisationId || !isPushSupported()) return
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }

      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      })

      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        organisation_id: organisationId,
      }, { onConflict: 'user_id,endpoint' })

      if (!error) setStatus('enabled')
    } catch (err) {
      console.warn('Enable push failed:', err)
    } finally {
      setBusy(false)
    }
  }, [organisationId])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        const endpoint = existing.endpoint
        await existing.unsubscribe()
        const supabase = createClient()
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      }
      setStatus('disabled')
    } catch (err) {
      console.warn('Disable push failed:', err)
    } finally {
      setBusy(false)
    }
  }, [])

  return { status, busy, enable, disable }
}
