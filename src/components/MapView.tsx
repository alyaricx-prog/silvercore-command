'use client'
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import type { DealLog, Profile } from '@/lib/types'

const CENTER: [number, number] = [40.2426, -76.9227]

const OUTCOME_COLORS: Record<string, string> = {
  closed:     '#22c55e',
  lost:       '#ef4444',
  follow_up:  '#eab308',
  no_contact: '#6b7280',
}

const OUTCOME_LABELS: Record<string, string> = {
  closed:     '✅ Closed',
  lost:       '❌ Lost',
  follow_up:  '🔁 Follow Up',
  no_contact: '📵 No Contact',
}

type Props = { logs: DealLog[]; profiles: Profile[] }

export default function MapView({ logs, profiles }: Props) {
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
  const logsWithLocation = logs.filter(l => l.lat && l.lng)

  return (
    <MapContainer center={CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {logsWithLocation.map(log => (
        <CircleMarker
          key={log.id}
          center={[log.lat!, log.lng!]}
          radius={9}
          pathOptions={{ fillColor: OUTCOME_COLORS[log.outcome], fillOpacity: 0.9, color: '#fff', weight: 1.5 }}
        >
          <Popup>
            <div style={{ fontSize: 13 }}>
              <strong>{OUTCOME_LABELS[log.outcome]}</strong>
              {log.notes && <div>{log.notes}</div>}
              <div style={{ color: '#999', fontSize: 11 }}>{profileMap[log.logged_by]?.full_name}</div>
              <div style={{ color: '#999', fontSize: 11 }}>{new Date(log.created_at).toLocaleString()}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
