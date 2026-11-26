import { useEffect, useState } from 'react';
import { getTransparentLogo, ProcessedLogo } from '../utils/logoProcessor';

interface BrandMarkProps {
  variant?: 'header' | 'sidebar-collapsed' | 'sidebar-expanded';
}

export function BrandMark({ variant = 'header' }: BrandMarkProps) {
  const [logo, setLogo] = useState<ProcessedLogo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getTransparentLogo().then((processed) => {
      if (!active) return;
      if (processed) {
        setLogo(processed);
      } else {
        setFailed(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const renderImg = (className: string, alt: string) => {
    if (logo) {
      return (
        <img
          src={logo.dataUrl}
          alt={alt}
          className={`${className} object-contain select-none`}
        />
      );
    }
    if (!failed) {
      return (
        <img
          src="/assets/aistudio/images_ec8962d0.png"
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={`${className} object-contain invert mix-blend-screen brightness-95 select-none`}
        />
      );
    }
    return null;
  };

  if (variant === 'sidebar-collapsed') {
    return (
      <div className="flex items-center justify-center">
        {!failed ? (
          renderImg('w-14 h-11', 'Estação Cupim')
        ) : (
          <span className="font-display text-lg font-bold text-[#D98A2B]">EC</span>
        )}
      </div>
    );
  }

  if (variant === 'sidebar-expanded') {
    return (
      <div className="flex flex-col items-center text-center">
        {!failed ? (
          renderImg('w-48 h-24', 'Estação Cupim — O Saboroso Casqueirado')
        ) : (
          <span className="font-display text-2xl font-bold text-[#D98A2B] py-4">
            Estação Cupim
          </span>
        )}
        <div className="mt-2.5 flex items-center gap-2 text-xs text-[#A69D8E]">
          <span className="font-display text-sm font-semibold tracking-tight text-[#F5F0E8] whitespace-nowrap">
            Stokbar Cupim
          </span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">Estoque</span>
        </div>
      </div>
    );
  }

  // Header variant — larger, background-free logo floating seamlessly
  return (
    <div className="flex items-center gap-3 min-w-0">
      {!failed ? (
        renderImg('h-10 sm:h-12 w-auto max-w-[140px] shrink-0', 'Estação Cupim')
      ) : (
        <span className="font-display text-base font-bold text-[#D98A2B] shrink-0">EC</span>
      )}
      <span className="font-display text-base sm:text-lg font-semibold tracking-tight text-[#F5F0E8] whitespace-nowrap truncate">
        Stokbar Cupim
      </span>
    </div>
  );
}
