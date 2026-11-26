import { useEffect, useState } from 'react';
import { Check, Copy, HardDrive, LogOut, ShieldAlert } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/AuthContext';
import { getTransparentLogo, ProcessedLogo } from '../utils/logoProcessor';
import { copyTextToClipboard } from '../utils/whatsappFormat';

export function UnauthorizedScreen() {
  const { user, enterLocalMode, signOutUser } = useFirebaseAuth();
  const [logo, setLogo] = useState<ProcessedLogo | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getTransparentLogo().then((processed) => {
      if (!active) return;
      if (processed) {
        setLogo(processed);
      } else {
        setLogoFailed(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const userEmail = user?.email ?? '';

  const handleCopyEmail = async () => {
    if (!userEmail) return;
    const ok = await copyTextToClipboard(userEmail);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0D0B] text-[#F5F0E8] flex flex-col justify-center px-4 py-10">
      <div className="w-full max-w-[420px] mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          {logo ? (
            <img
              src={logo.dataUrl}
              alt="Estação Cupim"
              className="h-24 w-auto max-w-[240px] object-contain mb-3 select-none"
            />
          ) : !logoFailed ? (
            <img
              src="/assets/aistudio/images_ec8962d0.png"
              alt="Estação Cupim"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="h-24 w-auto max-w-[240px] object-contain mb-3 invert mix-blend-screen brightness-95 select-none"
            />
          ) : null}
        </div>

        <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/10 shadow-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D98A2B]/15 text-[#D98A2B] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div>
            <h1 className="font-display text-xl font-semibold text-[#F5F0E8]">
              Acesso aguardando liberação
            </h1>
            <p className="text-sm text-[#A69D8E] mt-1.5 leading-relaxed">
              Esta conta ainda não está autorizada no estoque compartilhado da{' '}
              <strong className="text-[#F5F0E8]">Estação Cupim</strong>. Peça ao administrador para
              liberar o e-mail abaixo na aba <strong>Equipe</strong>.
            </p>
          </div>

          {userEmail && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/10 px-3.5 py-2.5">
              <span className="font-mono text-xs text-[#F5F0E8] truncate">{userEmail}</span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#D98A2B] hover:text-[#E89B3C] shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          )}

          <p className="text-xs text-[#736B5E]">
            Assim que o administrador liberar seu e-mail, esta tela abre o estoque automaticamente.
          </p>

          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-[#0E0D0B] text-sm font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Entrar com outra conta</span>
            </button>

            <button
              type="button"
              onClick={enterLocalMode}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/8 text-xs font-medium text-[#A69D8E] hover:text-[#F5F0E8] transition-colors cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#D98A2B]" />
              <span>Continuar sem nuvem (modo local)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
