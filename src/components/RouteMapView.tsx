'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Assignment } from '@/lib/types'

// Numbered marker icon factory
function numberedIcon(n: number, active: boolean) {
  const bg = active ? '#3b82f6' : '#6b7280'
  const size = active ? 32 : 26
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:700;font-size:${active?12:10}px;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);">
      ${n}
    </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function myLocationIcon() {
  return L.divIcon({
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:#22c55e;border:2.5px solid #fff;
      box-shadow:0 0 0 4px rgba(34,197,94,0.25);">
    </div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function FitBounds({ stops, myLocation }: {
  stops: Assignment[]
  myLocation: { lat: number; lng: number } | null
}) {
  const map = useMap()
  useEffect(() => {
    const coords: [number, number][] = stops
      .filter(s => s.lat && s.lng)
      .map(s => [s.lat!, s.lng!])
    if (myLocation) coords.push([myLocation.lat, myLocation.lng])
    if (coords.length === 0) return
    if (coords.length === 1) { map.setView(coords[0], 14); return }
    map.fitBounds(L.latLngBounds(coords), { padding: [32, 32], maxZoom: 14 })
  }, [stops.length, myLocation?.lat, myLocation?.lng])
  return null
}

type Props = {
  stops: Assignment[]
  currentStop: number       // -1 = planning (no highlight), ≥0 = route mode
  myLocation: { lat: number; lng: number } | null
  theme?: string
}

export default function RouteMapView({ stops, currentStop, myLocation, theme }: Props) {
  const dark = theme === 'dark'
  const tileUrl = dark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'

  const validStops = stops.filter(s => s.lat && s.lng)
  const polyline: [number, number][] = validStops.map(s => [s.lat!, s.lng!])

  const center: [number, number] = validStops.length > 0
    ? [validStops[0].lat!, validStops[0].lng!]
    : myLocation
    ? [myLocation.lat, myLocation.lng]
    : [40.0, -77.0]

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={tileUrl} />
      <FitBounds stops={validStops} myLocation={myLocation} />

      {/* Route polyline */}
      {polyline.length > 1 && (
        <Polyline
          positions={polyline}
          pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7, dashArray: '6 4' }}
        />
      )}

      {/* Stop markers */}
      {validStops.map((stop, i) => (
        <Marker
          key={stop.id}
          position={[stop.lat!, stop.lng!]}
          icon={numberedIcon(i + 1, i === currentStop)}
        />
      ))}

      {/* My location */}
      {myLocation && (
        <Marker position={[myLocation.lat, myLocation.lng]} icon={myLocationIcon()} />
      )}
    </MapContainer>
  )
}
