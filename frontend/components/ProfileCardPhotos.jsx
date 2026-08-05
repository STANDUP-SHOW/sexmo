'use client';

import { mediaUrl } from '../lib/api';

// Vignette de carte (parcours/découverte/annonces) : la 1ère photo (celle mise
// en avant par le membre, position 0) s'affiche en grand format, les 4
// suivantes en petites miniatures en dessous.
export default function ProfileCardPhotos({ photos, available }) {
  const main = photos[0];
  const thumbs = photos.slice(1, 5);

  return (
    <div className="relative">
      {available && (
        <span className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] bg-white/90 text-green-700 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Disponible
        </span>
      )}
      {main ? (
        <div>
          <div className="aspect-square bg-neutral-200">
            <img src={mediaUrl(main.url)} alt="" className="w-full h-full object-cover" />
          </div>
          {thumbs.length > 0 && (
            <div className="grid grid-cols-4 gap-0.5 mt-0.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square bg-neutral-200">
                  {thumbs[i] && <img src={mediaUrl(thumbs[i].url)} alt="" className="w-full h-full object-cover" />}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[3/4] w-full flex items-center justify-center bg-neutral-200 text-neutral-600 text-xs">Pas de photo</div>
      )}
    </div>
  );
}
