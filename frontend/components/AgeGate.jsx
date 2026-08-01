'use client';

import { useEffect, useState } from 'react';

export default function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const confirmed = sessionStorage.getItem('age_gate_ok');
    if (!confirmed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center space-y-4">
        <h2 className="text-xl font-bold">Contenu réservé aux adultes</h2>
        <p className="text-sm text-neutral-400">
          Ce site propose un service de mise en relation entre adultes consentants et peut
          afficher du contenu à caractère explicite. L'accès est strictement réservé aux
          personnes majeures (18 ans et plus).
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            className="btn-primary"
            onClick={() => {
              sessionStorage.setItem('age_gate_ok', '1');
              setShow(false);
            }}
          >
            J'ai 18 ans ou plus, entrer
          </button>
          <button
            className="btn-secondary"
            onClick={() => { window.location.href = 'https://www.google.com'; }}
          >
            Quitter
          </button>
        </div>
      </div>
    </div>
  );
}
