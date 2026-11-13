'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export function usePushSubscription(organisationId: string | null) {
  useEffect(() => {
    if (!organisationId) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!VAPID_PUBLIC_KEY) return

    async function subscribe() {
      try {
        const registration = await navigator.serviceWorker.ready
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const existing = await registration.pushManager.getSubscription()
        const subscription = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        })

        const json = subscription.toJSON()
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

        const supabase = createClient()
        await supabase.from('push_subscriptions').upsert({
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
