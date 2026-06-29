// WhiteVault™ — Brand loader.
// The single, on-brand loading animation used everywhere the app is busy:
// initial boot, update reload, and any async wait. Marble/Disciplined Premium
// aesthetic — stone background, onyx isotype, metallic gold accent.

import React from 'react';

const WHITEVAULT_ISOTYPE = 'https://storage.googleapis.com/msgsndr/QDrKqO1suwk5VOPoTKJE/media/693880a4fb91d00b324304d7.png';

interface BrandLoaderProps {
  label?: string;
  fullscreen?: boolean;   // covers the whole viewport (boot / route change)
  overlay?: boolean;      // semi-transparent overlay on top of current screen
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({ label = 'Cargando', fullscreen = true, overlay = false }) => {
  const positionClass = fullscreen || overlay ? 'fixed inset-0' : 'relative w-full py-16';
  const bgClass = overlay ? 'bg-stone/85 backdrop-blur-sm' : 'marble';

  return (
    <div className={`${positionClass} z-[80] flex items-center justify-center ${bgClass}`} style={fullscreen || overlay ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
      <div className="flex flex-col items-center">
        {/* Logo with a slow breathing glow */}
        <div className="relative wv-loader-breathe">
          <img src={WHITEVAULT_ISOTYPE} alt="WhiteVault" className="w-16 h-16 object-contain relative z-10" />
        </div>

        {/* Metallic separator line */}
        <div className="metallic-line w-24 mt-6 mb-5" />

        {/* Refined ring spinner */}
        <div className="relative w-7 h-7">
          <div className="absolute inset-0 rounded-full border-2 border-onyx/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.4em] text-graphite">{label}</p>
      </div>
    </div>
  );
};
