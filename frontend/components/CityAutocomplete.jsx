'use client';

import { useEffect, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '../lib/googleMapsLibraries';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function extractCityName(place) {
  const locality = place.address_components?.find(
    (c) => c.types.includes('locality') || c.types.includes('postal_town')
  );
  if (locality) return locality.long_name;
  // Fallback for places without a clean "locality" (rare), e.g. some communes:
  // formatted_address is usually "Ville, France" — keep just the first segment.
  return place.formatted_address?.split(',')[0] || '';
}

// Plain text input that becomes a Google Places city autocomplete (villes de
// France uniquement) once the Maps script has loaded — falls back to a normal
// input if there's no API key or the script hasn't loaded yet, so it's always
// safe to render even without Google Maps configured.
export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Votre ville',
  required,
  disabled,
  className = 'input',
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  // See AddressAutocomplete's note: the Places listener is attached once and
  // must always call the latest onChange, not the one from first render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const { isLoaded } = useJsApiLoader({
    id: 'sexmo-google-maps',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'fr' },
      fields: ['address_components', 'formatted_address'],
      types: ['(cities)'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const city = extractCityName(place) || inputRef.current.value;
      onChangeRef.current?.(city);
    });

    autocompleteRef.current = autocomplete;
  }, [isLoaded]);

  return (
    <input
      ref={inputRef}
      type="text"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
      className={`${className}${disabled ? ' opacity-60 cursor-not-allowed' : ''}`}
      autoComplete="off"
    />
  );
}
