'use client'
import "leaflet/dist/leaflet.css"
import { useEffect, useState } from 'react'
import type { DealLog, Profile } from '@/lib/types'

const CENTER: [number, number] = [40.2426, -76.9227]

export const OUTCOME_COLORS: Record<string, string> = {
  closed:     '#22c55e',
  lost:       '#ef4444',
  follow_up:  '#f59e0b',
  no_contact: '#6b7280',
}

export const OUTCOME_LABELS: Record<string, string> = {
  closed:     'Closed',
  lost:       'Lost',
  follow_up:  'Follow Up',
  no_contact: 'No Contact',
}

type Props = {
  logs: DealLog[]
  profiles: Profile[]
  activeFilter: string | null
  theme: string
  newIds: Set<string>
  myLocation: { lat: number; lng: number } | null
}

// Loaded only in the browser, inside useEffect — never at module top level —
// because leaflet runs browser-feature-detection code (touching `window`)
// the instant it's imported, which crashes under Turbopack's eager module
// evaluation even with next/dynamic's ssr:false.
type LeafletMod = {
  L: typeof import('leaflet')
  MapContainer: typeof import('react-leaflet').MapContainer
  TileLayer: typeof import('react-leaflet').TileLayer
  Marker: typeof import('react-leaflet').Marker
  Popup: typeof import('react-leaflet').Popup
  useMap: typeof import('react-leaflet').useMap
}

export default function MapView({ logs, profiles, activeFilter, theme, newIds, myLocation }: Props) {
  const [mod, setMod] = useState<LeafletMod | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([import('leaflet'), import('react-leaflet')]).then(([LMod, RL]) => {
      if (!active) return
      setMod({
        L: LMod.default,
        MapContainer: RL.MapContainer,
        TileLayer: RL.TileLayer,
        Marker: RL.Marker,
        Popup: RL.Popup,
        useMap: RL.useMap,
      })
    })
    return () => { active = false }
  }, [])

  if (!mod) {
    return (
      <div className="flex-1 h-full flex items-center justify-center" style={{ background: 'var(--sc-page)' }}>
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <LoadedMap {...{ logs, profiles, activeFilter, theme, newIds, myLocation }} mod={mod} />
}

function LoadedMap({
  logs, profiles, activeFilter, theme, newIds, myLocation, mod,
}: Props & { mod: LeafletMod }) {
  const { L, MapContainer, TileLayer, Marker, Popup, useMap } = mod
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
  const filtered = logs.filter(l => {
    if (!l.lat || !l.lng) return false
    if (activeFilter && l.outcome !== activeFilter) return false
    return true
  })

  const isDark = theme !== 'light'
  // Esri World Gray Canvas — free, no API key required (unlike CARTO's basemaps, which now gate behind a key)
  const baseUrl = isDark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
  const refUrl = isDark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'

  function makeIcon(color: string, isNew: boolean) {
    const pulse = isNew ? `
      <span style="
        position:absolute;inset:-4px;border-radius:50%;
        border:2px solid ${color};opacity:0.7;
        animation:sc-ping 1.3s cubic-bezier(0,0,0.2,1) 4;
      "></span>` : ''
    return L.divIcon({
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
      html: `<span style="position:relative;display:block;width:36px;height:36px;">
        ${pulse}
        <span style="
          position:absolute;inset:0;border-radius:50%;
          background:radial-gradient(circle, ${color}55 0%, ${color}22 45%, transparent 75%);
          animation:sc-breathe 2.6s ease-in-out infinite;
        "></span>
        <span style="
          position:absolute;top:50%;left:50%;width:11px;height:11px;transform:translate(-50%,-50%);
          border-radius:50%;background:${color};
          box-shadow:0 0 0 2.5px rgba(255,255,255,0.22), 0 0 10px ${color}aa;
        "></span>
      </span>`,
    })
  }

  function makeMeIcon() {
    return L.divIcon({
      className: '',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      html: `<span style="position:relative;display:block;width:22px;height:22px;">
        <span style="
          position:absolute;inset:-8px;border-radius:50%;
          background:rgba(59,130,246,0.35);
          animation:sc-ping 1.8s cubic-bezier(0,0,0.2,1) infinite;
        "></span>
        <span style="
          position:absolute;inset:0;border-radius:50%;
          background:#3b82f6;
          box-shadow:0 0 0 3px rgba(255,255,255,0.9), 0 2px 10px rgba(59,130,246,0.6);
        "></span>
      </span>`,
    })
  }

  function FitBounds({ logs }: { logs: DealLog[] }) {
    const map = useMap()
    const pinned = logs.filter(l => l.lat && l.lng)
    useEffect(() => {
      if (pinned.length > 0) {
        map.fitBounds(pinned.map(l => [l.lat!, l.lng!] as [number, number]), { padding: [48, 48], maxZoom: 15 })
      }
    }, [pinned.length])
    return null
  }

  function RecenterButton({ myLocation }: { myLocation: { lat: number; lng: number } | null }) {
    const map = useMap()
    if (!myLocation) return null
    return (
      <button
        onClick={() => map.flyTo([myLocation.lat, myLocation.lng], 15, { duration: 0.8 })}
        aria-label="Recenter on my location"
        style={{
          position: 'absolute', right: 14, bottom: 150, zIndex: 500,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(17,24,39,0.92)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="#3b82f6" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    )
  }

  return (
    <MapContainer center={CENTER} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} maxZoom={16}>
      <TileLayer url={baseUrl} attribution='&copy; Esri' maxZoom={16} />
      <TileLayer url={refUrl} attribution="" maxZoom={16} />
      <FitBounds logs={filtered} />
      <RecenterButton myLocation={myLocation} />
      {myLocation && (
        <Marker position={[myLocation.lat, myLocation.lng]} icon={makeMeIcon()} zIndexOffset={1000}>
          <Popup>
            <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' }}>You are here</div>
          </Popup>
        </Marker>
      )}
      {filtered.map(log => {
        const color = OUTCOME_COLORS[log.outcome]
        const isNew = newIds.has(log.id)
        const rep   = profileMap[log.logged_by]
        return (
          <Marker key={log.id} position={[log.lat!, log.lng!]} icon={makeIcon(color, isNew)}>
            <Popup className="sc-popup">
              <div style={{
                background: isDark ? '#111827' : '#fff',
                borderRadius: 14,
                padding: '12px 14px',
                minWidth: 190,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: `1px solid ${color}40`,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: `${color}18`, border: `1px solid ${color}50`,
                  borderRadius: 20, padding: '3px 10px', marginBottom: 8,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>{OUTCOME_LABELS[log.outcome]}</span>
                </div>
                {rep && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b', marginBottom: 4 }}>
                    {rep.full_name}
                    {rep.group_name && <span style={{ fontSize: 10, fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>· {rep.group_name}</span>}
                  </div>
                )}
                {log.notes && <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, lineHeight: 1.4 }}>{log.notes}</div>}
                <div style={{ fontSize: 10, color: '#6b7280' }}>
                  {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
