import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCcw } from 'lucide-react';

export function MobileLandscapeOverlay() {
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Typically phones in landscape have height < 500px and width < 950px
      // We check for landscape orientation AND a short viewport height to avoid triggering on desktop or iPad
      const isLandscape = window.matchMedia("(orientation: landscape)").matches;
      const isShortHeight = window.innerHeight < 550; // Increased slightly for larger phones
      
      setIsLandscapeMobile(isLandscape && isShortHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscapeMobile) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col items-center gap-8 max-w-sm">
        <div className="relative">
          <Smartphone className="w-24 h-24 rotate-90 text-slate-300 animate-[pulse-scale_2s_ease-in-out_infinite]" />
          <div className="absolute -bottom-2 -right-2 bg-indigo-600 rounded-full p-2 animate-[spin-slow_3s_linear_infinite]">
            <RotateCcw className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight text-white">Rotate Your Device</h2>
          <p className="text-slate-300 font-medium leading-relaxed">
            Honeymoon Haven is designed to be experienced in portrait mode. Please rotate your phone back upright to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
