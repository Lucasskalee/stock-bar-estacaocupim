import { Cloud, LogIn, LogOut } from 'lucide-react';
import { useFirebaseAuth } from '../contexts/AuthContext';

interface CloudSyncButtonProps {
  variant?: 'sidebar' | 'header';
  sidebarExpanded?: boolean;
  syncing?: boolean;
  onSignedOut?: () => void;
}

export function CloudSyncButton({
  variant = 'header',
  sidebarExpanded = true,
  syncing = false,
  onSignedOut,
}: CloudSyncButtonProps) {
  const { user, authReady, openLoginScreen, signOutUser } = useFirebaseAuth();

  if (!authReady) return null;

  const handleSignOut = async () => {
    await signOutUser();
    onSignedOut?.();
  };

  const statusLabel = syncing ? 'Sincronizando...' : 'Firebase ativo';

  if (variant === 'sidebar') {
    if (user) {
      return (
        <div
          className={`w-full rounded-xl bg-[#1F1C18]/70 border border-[#FFF4E0]/8 transition-colors ${
            sidebarExpanded ? 'p-2.5 space-y-2' : 'p-1.5 flex justify-center'
          }`}
        >
          {sidebarExpanded ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? 'Conta'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#FFF4E0]/15"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#D98A2B]/20 text-[#D98A2B] flex items-center justify-center text-xs font-semibold shrink-0">
                    {(user.displayName ?? user.email ?? 'U').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#F5F0E8] truncate">
                    {user.displayName ?? user.email ?? 'Conta conectada'}
                  </p>
                  <p className="text-[11px] text-[#4CA975] flex items-center gap-1 truncate">
                    <Cloud className="w-3 h-3 shrink-0" />
                    {statusLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full min-h-[34px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0E0D0B] hover:bg-[#27231D] text-xs font-medium text-[#A69D8E] hover:text-[#F5F0E8] transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair da conta
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              title={`${statusLabel} (${user.email ?? user.displayName ?? 'Firebase'}) — Clique para sair`}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-[#4CA975] hover:bg-[#27231D] transition-colors cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
            </button>
          )}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={openLoginScreen}
        title={!sidebarExpanded ? 'Entrar com Firebase' : undefined}
        className={`w-full min-h-[42px] flex items-center rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#D98A2B]/35 text-sm font-medium text-[#F5F0E8] transition-colors cursor-pointer whitespace-nowrap ${
          sidebarExpanded ? 'px-3.5 gap-3 justify-start' : 'justify-center px-0'
        }`}
      >
        <LogIn className="w-4 h-4 text-[#D98A2B] shrink-0" />
        {sidebarExpanded && <span>Entrar / Login</span>}
      </button>
    );
  }

  // Header variant (mobile compact control)
  if (user) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        title={`${statusLabel} (${user.email ?? user.displayName ?? ''}) — Toque para sair`}
        className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg bg-[#1F1C18] hover:bg-[#27231D] border border-[#4CA975]/35 text-xs font-medium text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Cloud className="w-3.5 h-3.5 text-[#4CA975] shrink-0" />
        <span className="hidden sm:inline">Sair</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openLoginScreen}
      title="Abrir tela de login"
      className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg bg-[#1F1C18] hover:bg-[#27231D] border border-[#D98A2B]/40 text-xs font-medium text-[#F5F0E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
    >
      <LogIn className="w-3.5 h-3.5 text-[#D98A2B] shrink-0" />
      <span>Entrar</span>
    </button>
  );
}
