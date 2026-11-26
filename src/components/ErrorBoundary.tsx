import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../firebase';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
  isReadUnitsQuota: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      isQuotaError: false,
      isReadUnitsQuota: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'Erro inesperado na aplicação.';
    let readable = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        readable = parsed.error;
      }
    } catch {
      // Plain error message
    }

    const isQuotaError = readable.toLowerCase().includes('quota exceeded');
    const isReadUnitsQuota = readable.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    );

    return {
      hasError: true,
      message: readable,
      isQuotaError,
      isReadUnitsQuota,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen bg-[#0E0D0B] text-[#F5F0E8] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#171512] border border-[#FFF4E0]/12 p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3 text-[#E05A47]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h1 className="font-display text-lg font-semibold text-[#F5F0E8]">
              {this.state.isQuotaError
                ? 'Limite diário do Firestore atingido'
                : 'Ocorreu um problema de sincronização'}
            </h1>
          </div>

          <p className="text-sm text-[#A69D8E] leading-relaxed">
            {this.state.isQuotaError
              ? 'A cota gratuita diária do Firebase Firestore foi excedida. Ela será redefinida automaticamente no próximo dia.'
              : this.state.message}
          </p>

          {this.state.isReadUnitsQuota && (
            <a
              href={upgradeUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-[#D98A2B] hover:text-[#E89B3C] underline break-all"
            >
              Abrir console do Firestore para gerenciar plano
            </a>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] text-sm font-semibold text-[#0E0D0B] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Recarregar aplicativo
          </button>
        </div>
      </div>
    );
  }
}
