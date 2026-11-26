import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'header';
  sidebarExpanded?: boolean;
  onInstalled?: () => void;
}

export function PWAInstallButton({
  variant = 'header',
  sidebarExpanded = true,
  onInstalled,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!showGuide) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuide(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuide]);

  // Never render when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) onInstalled?.();
      return;
    }
    setShowGuide(true);
  };

  // In mobile compact header, show when native prompt is ready or on iOS (always helpful on phone)
  const label = isIOS ? 'Instalar' : 'Instalar app';

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleClick}
          title={!sidebarExpanded ? 'Instalar aplicativo (PWA)' : undefined}
          className={`w-full min-h-[40px] flex items-center rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            isInstallable
              ? 'bg-[#D98A2B]/14 text-[#D98A2B] hover:bg-[#D98A2B]/22 border border-[#D98A2B]/30'
              : 'text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#1F1C18]'
          } ${sidebarExpanded ? 'px-3.5 gap-3 justify-start' : 'justify-center px-0'}`}
        >
          <Download className="w-4 h-4 shrink-0 text-[#D98A2B]" />
          {sidebarExpanded && <span>{label}</span>}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Instalar Stokbar Cupim"
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isInstallable
              ? 'bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] font-semibold'
              : 'bg-[#1F1C18] hover:bg-[#27231D] border border-[#D98A2B]/35 text-[#F5F0E8]'
          }`}
        >
          <Download className={`w-3.5 h-3.5 ${isInstallable ? 'text-[#0E0D0B]' : 'text-[#D98A2B]'}`} />
          <span>{label}</span>
        </button>
      )}

      {/* Guided installation modal for iOS Safari or browsers before prompt fires */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#171512] border-t sm:border border-[#FFF4E0]/12 p-5 sm:p-6 pb-safe shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#D98A2B] shrink-0" />
                <h2 id="pwa-guide-title" className="font-display text-lg font-semibold text-[#F5F0E8]">
                  Instalar Stokbar Cupim
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Fechar"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-[#A69D8E] hover:text-[#F5F0E8] hover:bg-[#1F1C18] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-sm text-[#A69D8E] leading-relaxed">
                <p>No Safari do iPhone ou iPad, siga estes passos para abrir como aplicativo:</p>
                <ol className="space-y-2.5 text-[#F5F0E8]">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs text-[#D98A2B] mt-0.5">01.</span>
                    <span>
                      Toque no botão <strong className="inline-flex items-center gap-1">Compartilhar <Share className="w-3.5 h-3.5 inline text-[#D98A2B]" /></strong> na barra do Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs text-[#D98A2B] mt-0.5">02.</span>
                    <span>
                      Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs text-[#D98A2B] mt-0.5">03.</span>
                    <span>
                      Confirme em <strong>Adicionar</strong> para usar em tela cheia, inclusive offline.
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-[#A69D8E] leading-relaxed">
                <p>Instale o Stokbar Cupim para abrir em tela cheia e contar estoque mesmo sem internet:</p>
                <ol className="space-y-2.5 text-[#F5F0E8]">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs text-[#D98A2B] mt-0.5">01.</span>
                    <span>
                      Abra o aplicativo diretamente em uma aba do Chrome, Edge ou Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs text-[#D98A2B] mt-0.5">02.</span>
                    <span>
                      Clique no ícone <strong>Instalar</strong> na barra de endereço (computador) ou em <strong>Menu → Instalar aplicativo</strong> (Android).
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-sm font-semibold text-[#0E0D0B] transition-colors cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
