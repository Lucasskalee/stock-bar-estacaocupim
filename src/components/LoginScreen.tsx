import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Lock,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import { useFirebaseAuth } from '../contexts/AuthContext';
import { getTransparentLogo, ProcessedLogo } from '../utils/logoProcessor';

type AuthViewMode = 'login' | 'signup' | 'forgot';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const {
    signingIn,
    authError,
    clearAuthError,
    signInWithEmail,
    signUpWithEmail,
    resetPasswordWithEmail,
    signInWithGoogle,
    enterLocalMode,
  } = useFirebaseAuth();

  const [mode, setMode] = useState<AuthViewMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [logo, setLogo] = useState<ProcessedLogo | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

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

  const switchMode = (nextMode: AuthViewMode) => {
    setMode(nextMode);
    setLocalError(null);
    setSuccessMessage(null);
    clearAuthError();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearAuthError();

    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setLocalError('Informe um endereço de e-mail válido.');
      return;
    }

    if (mode === 'forgot') {
      const result = await resetPasswordWithEmail(trimmedEmail);
      if (result.ok && result.message) {
        setSuccessMessage(result.message);
      }
      return;
    }

    if (password.length < 6) {
      setLocalError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (mode === 'signup') {
      if (fullName.trim().length < 2) {
        setLocalError('Informe seu nome ou o nome do operador.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('As senhas digitadas não conferem.');
        return;
      }

      const result = await signUpWithEmail(trimmedEmail, password, fullName);
      if (result.ok && result.message) {
        setSuccessMessage(result.message);
        setPassword('');
        setConfirmPassword('');
        setMode('login');
      }
      return;
    }

    await signInWithEmail(trimmedEmail, password);
  };

  const displayError = localError ?? authError;

  return (
    <div className="min-h-screen bg-[#0E0D0B] text-[#F5F0E8] relative flex flex-col justify-center overflow-x-hidden px-4 py-8 sm:py-12">
      {/* Subtle warm ambient amber glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[540px] h-[340px] rounded-full bg-[#D98A2B]/10 blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] mx-auto">
        {/* Brand Identity Header */}
        <div className="flex flex-col items-center text-center mb-7">
          {logo ? (
            <img
              src={logo.dataUrl}
              alt="Estação Cupim"
              className="h-24 sm:h-28 w-auto max-w-[260px] object-contain mb-3 select-none"
            />
          ) : !logoFailed ? (
            <img
              src="/assets/aistudio/images_ec8962d0.png"
              alt="Estação Cupim"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="h-24 sm:h-28 w-auto max-w-[260px] object-contain mb-3 invert mix-blend-screen brightness-95 select-none"
            />
          ) : null}
          <h1 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-[#F5F0E8]">
            Stokbar Cupim
          </h1>
          <p className="text-sm text-[#A69D8E] mt-1">
            Estoque afinado, da abertura à última dose.
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl bg-[#171512] border border-[#FFF4E0]/10 shadow-[0_24px_64px_rgba(0,0,0,0.65)] p-5 sm:p-7">
          {mode !== 'forgot' ? (
            <div
              role="tablist"
              aria-label="Tipo de acesso"
              className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/6 mb-6"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={`h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#221E19] text-[#F5F0E8] border border-[#FFF4E0]/10'
                    : 'text-[#8C8375] hover:text-[#F5F0E8]'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => switchMode('signup')}
                className={`h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[#221E19] text-[#F5F0E8] border border-[#FFF4E0]/10'
                    : 'text-[#8C8375] hover:text-[#F5F0E8]'
                }`}
              >
                Criar conta
              </button>
            </div>
          ) : (
            <div className="mb-5">
              <div className="flex items-center gap-2 text-[#D98A2B] mb-1">
                <KeyRound className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Recuperar acesso
                </span>
              </div>
              <h2 className="font-display text-lg font-semibold text-[#F5F0E8]">
                Redefinir senha
              </h2>
              <p className="text-xs text-[#A69D8E] mt-1">
                Informe seu e-mail para receber o link de redefinição do Firebase.
              </p>
            </div>
          )}

          {displayError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#E05A47]/12 border border-[#E05A47]/30 px-3.5 py-3 text-xs text-[#F7B2A8] leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 text-[#E05A47] shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#4CA975]/12 border border-[#4CA975]/30 px-3.5 py-3 text-xs text-[#AEE3C5] leading-relaxed"
            >
              <CheckCircle2 className="w-4 h-4 text-[#4CA975] shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="login-fullname"
                  className="block text-xs font-medium text-[#C8BFB1] mb-1.5"
                >
                  Nome do operador
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#736B5E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-fullname"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex.: Lucas · Bar Principal"
                    maxLength={80}
                    className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/10 text-sm text-[#F5F0E8] placeholder:text-[#5E574C] focus:outline-none focus:border-[#D98A2B] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-[#C8BFB1] mb-1.5"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#736B5E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operador@estacaocupim.com.br"
                  className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/10 text-sm text-[#F5F0E8] placeholder:text-[#5E574C] focus:outline-none focus:border-[#D98A2B] transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-[#C8BFB1]"
                  >
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-[#D98A2B] hover:text-[#E89B3C] transition-colors cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#736B5E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full h-12 pl-10 pr-11 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/10 text-sm text-[#F5F0E8] placeholder:text-[#5E574C] focus:outline-none focus:border-[#D98A2B] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-[#736B5E] hover:text-[#F5F0E8] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="login-confirm-password"
                  className="block text-xs font-medium text-[#C8BFB1] mb-1.5"
                >
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#736B5E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-[#0E0D0B] border border-[#FFF4E0]/10 text-sm text-[#F5F0E8] placeholder:text-[#5E574C] focus:outline-none focus:border-[#D98A2B] transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="w-full h-12 mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#D98A2B] hover:bg-[#E89B3C] active:scale-[0.99] text-[#0E0D0B] text-sm font-semibold transition-all cursor-pointer disabled:opacity-60"
            >
              <span>
                {signingIn
                  ? 'Aguarde...'
                  : mode === 'login'
                    ? 'Entrar no painel'
                    : mode === 'signup'
                      ? 'Criar conta'
                      : 'Enviar link de recuperação'}
              </span>
              {!signingIn && <ArrowRight className="w-4 h-4" />}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full h-10 text-xs font-medium text-[#A69D8E] hover:text-[#F5F0E8] transition-colors cursor-pointer"
              >
                Voltar para o login
              </button>
            )}
          </form>

          {/* Google Auth & Local Mode */}
          <div className="mt-6 pt-5 border-t border-[#FFF4E0]/8 space-y-2.5">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={signingIn}
              className="w-full h-11 inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#1F1C18] hover:bg-[#27231D] border border-[#FFF4E0]/10 text-sm font-medium text-[#F5F0E8] transition-colors cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
                />
              </svg>
              <span>Continuar com Google</span>
            </button>

            <button
              type="button"
              onClick={enterLocalMode}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-transparent hover:bg-[#1F1C18]/70 border border-[#FFF4E0]/8 text-xs font-medium text-[#A69D8E] hover:text-[#F5F0E8] transition-colors cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#D98A2B]" />
              <span>Usar sem login (armazenamento local)</span>
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#6E665A] mt-5">
          Estação Cupim · Sincronização em tempo real com Firebase
        </p>
      </div>
    </div>
  );
}
