'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '../lib/googleMapsLibraries';
import { apiFetch } from '../lib/api';
import CityAutocomplete from './CityAutocomplete';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const FRANCE_CENTER = { lat: 46.6, lng: 2.4 };
const FRANCE_ZOOM = 5.3;
const MAX_RADIUS_KM = 50;

// Pastille rose façon marqueur, en SVG inline (évite de dépendre d'une image
// hébergée en plus de l'icône du site).
const PINK_MARKER = {
  path: 'M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z',
  fillColor: '#fe466c',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
  scale: 1.6,
  anchor: typeof window !== 'undefined' && window.google ? new window.google.maps.Point(12, 24) : undefined,
};

function zoomForRadius(radiusKm) {
  if (radiusKm <= 5) return 12;
  if (radiusKm <= 15) return 10.5;
  if (radiusKm <= 30) return 9.3;
  return 8.5;
}

// Bloc carte plein largeur : France par défaut, zoom sur la ville tapée avec
// une pastille rose + un cercle représentant le rayon de recherche (curseur
// 0-50 km, 50 par défaut), et une vignette avec le nombre de membres dans la
// zone. Pilote city/radiusKm côté page appelante (filtres de recherche).
export default function MapSearchBlock({ city, radiusKm, onCityChange, onRadiusChange }) {
  const { isLoaded } = useJsApiLoader({
    id: 'sexmo-google-maps',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [point, setPoint] = useState(null); // {lat, lng}
  const [count, setCount] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const mapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!city) {
      setPoint(null);
      setCount(null);
      setNotFound(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      apiFetch(`/api/public/map-stats?city=${encodeURIComponent(city)}&radiusKm=${radiusKm}`)
        .then((d) => {
          setPoint({ lat: d.lat, lng: d.lng });
          setCount(d.count);
          setNotFound(false);
          if (mapRef.current) {
            mapRef.current.panTo({ lat: d.lat, lng: d.lng });
            mapRef.current.setZoom(zoomForRadius(radiusKm));
          }
        })
        .catch(() => setNotFound(true));
    }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  // Rayon changé : on ré-interroge le nombre de membres et on ajuste le zoom,
  // sans re-géocoder la ville.
  useEffect(() => {
    if (!city || !point) return;
    apiFetch(`/api/public/map-stats?city=${encodeURIComponent(city)}&radiusKm=${radiusKm}`)
      .then((d) => setCount(d.count))
      .catch(() => {});
    if (mapRef.current) mapRef.current.setZoom(zoomForRadius(radiusKm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm]);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="relative">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '320px' }}
            center={point || FRANCE_CENTER}
            zoom={point ? zoomForRadius(radiusKm) : FRANCE_ZOOM}
            onLoad={(map) => { mapRef.current = map; }}
            options={{ disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy' }}
          >
            {point && <Marker position={point} icon={PINK_MARKER} />}
            {point && radiusKm > 0 && (
              <Circle
                center={point}
                radius={radiusKm * 1000}
                options={{
                  fillColor: '#fe466c', fillOpacity: 0.12,
                  strokeColor: '#fe466c', strokeOpacity: 0.6, strokeWeight: 1,
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-[320px] bg-neutral-100 flex items-center justify-center text-sm text-neutral-400">
            Chargement de la carte...
          </div>
        )}

        {count != null && (
          <div className="absolute top-3 right-3 bg-white/95 shadow rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-brand-500">{count}</p>
            <p className="text-[10px] text-neutral-500 leading-tight">membre{count > 1 ? 's' : ''}<br />dans la zone</p>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="w-48">
            <CityAutocomplete value={city} onChange={onCityChange} placeholder="Chercher une ville..." />
          </div>
          {notFound && <span className="text-xs text-neutral-400">Ville non reconnue</span>}
        </div>
        {city && (
          <div>
            <label className="text-xs text-neutral-500">
              Rayon de recherche autour de {city} : {radiusKm === 0 ? 'ville uniquement' : `${radiusKm} km`}
            </label>
            <input type="range" min={0} max={MAX_RADIUS_KM} step={5} value={radiusKm}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
