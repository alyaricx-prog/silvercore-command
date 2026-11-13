import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// VAPID helpers (pure Deno/Web Crypto — no npm)
async function importVapidPrivateKey(base64urlPrivate: string): Promise<CryptoKey> {
  const raw = base64urlDecode(base64urlPrivate)
  // Build a PKCS8 wrapper for a P-256 private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ])
  const pkcs8 = new Uint8Array(pkcs8Header.length + raw.length)
  pkcs8.set(pkcs8Header)
  pkcs8.set(raw, pkcs8Header.length)
  return crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=')
  const bin = atob(b64)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

function base64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let b64 = ''
  bytes.forEach(b => { b64 += String.fromCharCode(b) })
  return btoa(b64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function buildVapidHeaders(endpoint: string, vapidPublic: string, vapidPrivate: string): Promise<Record<string, string>> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600

  const header = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = base64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: expiry,
    sub: 'mailto:admin@silvercore.app',
  })))

  const signingInput = `${header}.${payload}`
  const key = await importVapidPrivateKey(vapidPrivate)
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput))
  const token = `${signingInput}.${base64urlEncode(sig)}`

  return {
    Authorization: `vapid t=${token},k=${vapidPublic}`,
    'Content-Type': 'application/octet-stream',
    TTL: '86400',
  }
}

// Encrypt payload using Web Push encryption (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string,
): Promise<{ body: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPublicKey = base64urlDecode(p256dhBase64)
  const clientAuthSecret = base64urlDecode(authBase64)

  // Generate server ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPublicKeyJwk = await crypto.subtle.exportKey('jwk', serverKeyPair.publicKey)
  const serverPublicKeyRaw = new Uint8Array(65)
  serverPublicKeyRaw[0] = 0x04
  const xBytes = base64urlDecode(serverPublicKeyJwk.x!)
  const yBytes = base64urlDecode(serverPublicKeyJwk.y!)
  serverPublicKeyRaw.set(xBytes, 1)
  serverPublicKeyRaw.set(yBytes, 33)

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw', clientPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKeyPair.privateKey, 256)

  // HKDF to derive content encryption key and nonce
  const salt = crypto.getRandomValues(new Uint8Array(16))

  const prk = await hkdf(new Uint8Array(sharedBits), clientAuthSecret,
    concat(new TextEncoder().encode('WebPush: info\x00'), clientPublicKey, serverPublicKeyRaw), 32)

  const contentKey = await hkdf(prk, salt,
    concat(new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), new Uint8Array([1])), 16)

  const nonce = await hkdf(prk, salt,
    concat(new TextEncoder().encode('Content-Encoding: nonce\x00'), new Uint8Array([1])), 12)

  // Encrypt
  const aesKey = await crypto.subtle.importKey('raw', contentKey, { name: 'AES-GCM' }, false, ['encrypt'])
  const plaintext = new TextEncoder().encode(payload)
  const paddedPlaintext = new Uint8Array(plaintext.length + 2)
  paddedPlaintext.set(plaintext)
  paddedPlaintext[plaintext.length] = 0x02 // delimiter

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPlaintext)

  // Build RFC 8291 header + ciphertext
  const recordSize = 4096
  const header = new Uint8Array(21 + serverPublicKeyRaw.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, recordSize, false)
  header[20] = serverPublicKeyRaw.length
  header.set(serverPublicKeyRaw, 21)

  const body = concat(header, new Uint8Array(ciphertext))
  return { body, salt, serverPublicKey: serverPublicKeyRaw }
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8)
  return new Uint8Array(bits)
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { organisation_id, title, body, url } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!

    // Get all subscriptions for this org
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('organisation_id', organisation_id)

    if (error) throw error

    const payload = JSON.stringify({ title, body, url: url ?? '/' })

    const results = await Promise.allSettled(
      (subs ?? []).map(async (sub) => {
        const { body: encBody } = await encryptPayload(payload, sub.p256dh, sub.auth)
        const headers = await buildVapidHeaders(sub.endpoint, vapidPublic, vapidPrivate)
        headers['Content-Encoding'] = 'aes128gcm'
        const res = await fetch(sub.endpoint, { method: 'POST', headers, body: encBody })
        if (!res.ok && res.status !== 201) {
          console.error(`Push failed for endpoint: ${res.status}`)
        }
        return res.status
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    return new Response(JSON.stringify({ sent, total: subs?.length ?? 0 }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
