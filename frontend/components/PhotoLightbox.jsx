'use client';

import { useCallback, useEffect } from 'react';
import { mediaUrl } from '../lib/api';

// Visionneuse plein écran pour les galeries de profil : clic sur une photo
// pour l'agrandir, flèches roses gauche/droite (souris ou clavier) pour
// naviguer dans le même jeu de photos sans refermer la visionneuse.
export default function PhotoLightbox({ photos, index, onIndexChange, onClose }) {
  const count = photos.length;

  const go = useCallback((delta) => {
    onIndexChange((index + delta + count) % count);
  }, [index, count, onIndexChange]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (index == null || !photos[index]) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={onClose}>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white text-2xl leading-none hover:bg-black/70">
        ✕
      </button>

      {count > 1 && (
        <button onClick={(e) => { e.stopPropagation(); go(-1); }}
          aria-label="Photo précédente"
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-brand-500 text-white text-2xl hover:bg-brand-600 shadow-lg">
          ‹
        </button>
      )}

      <img src={mediaUrl(photos[index].url)} alt="" onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg" />

      {count > 1 && (
        <button onClick={(e) => { e.stopPropagation(); go(1); }}
          aria-label="Photo suivante"
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-brand-500 text-white text-2xl hover:bg-brand-600 shadow-lg">
          ›
        </button>
      )}

      {count > 1 && (
        <span className="absolute bottom-4 text-white/80 text-sm">{index + 1} / {count}</span>
      )}
    </div>
  );
}
