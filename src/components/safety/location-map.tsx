import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
export default function LocationMap({ points }: { points: { latitude: number; longitude: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  useEffect(() => {
    if (!ref.current || !points.length) return;
    let cancelled = false;
    void import('leaflet').then(L => {
      if (cancelled || !ref.current) return;
      const latest = points[0]; if (!latest) return;
      const m = L.map(ref.current).setView([latest.latitude, latest.longitude], 15); map.current = m;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(m);
      L.circleMarker([latest.latitude, latest.longitude], { radius: 9, className: 'location-marker' }).addTo(m).bindPopup('Current location');
      if (points.length > 1) L.polyline(points.map(p => [p.latitude, p.longitude] as [number, number]), { className: 'location-trail', weight: 3 }).addTo(m);
      m.invalidateSize();
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, [points]);
  return <div ref={ref} className="h-72 w-full overflow-hidden rounded-lg bg-muted" aria-label="Current location map" />;
}
