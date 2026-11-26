import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-22 lg:bottom-6 left-4 z-50 inline-flex items-center gap-2 rounded-xl bg-[#1F1C18]/95 backdrop-blur-md border border-[#D98A2B]/45 px-3.5 py-2 text-xs font-medium text-[#F5F0E8] shadow-xl"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#D98A2B] shrink-0" />
      <span>Modo offline · dados salvos no aparelho</span>
    </div>
  );
}
