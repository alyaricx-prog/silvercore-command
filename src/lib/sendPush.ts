import { createClient } from '@/lib/supabase'

/**
 * Fire-and-forget call to the `send-push` Supabase Edge Function.
 * Safe to call even if no one is subscribed — the function just reports 0 sent.
 */
export async function sendPush(opts: {
  organisation_id: string
  title: string
  body: string
  url?: string
}) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        organisation_id: opts.organisation_id,
        title: opts.title,
        body: opts.body,
        url: opts.url ?? '/',
      },
    })
    if (error) console.warn('sendPush failed:', error)
    return data
  } catch (err) {
    console.warn('sendPush error:', err)
  }
}
