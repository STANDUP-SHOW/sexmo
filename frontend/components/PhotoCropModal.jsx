'use client';

import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';

// Ratio portrait 3:4, cohérent avec les cartes de la grille "Découvrir".
const ASPECT = 3 / 4;

export default function PhotoCropModal({ imageSrc, onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const confirm = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      await onConfirm(croppedAreaPixels);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4">
      <div className="card max-w-md w-full space-y-4">
        <h2 className="font-semibold">Recadrer la photo</h2>

        <div className="relative w-full h-96 bg-neutral-950 rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel} disabled={saving}>Annuler</button>
          <button className="btn-primary" onClick={confirm} disabled={saving || !croppedAreaPixels}>
            {saving ? 'Envoi...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}
