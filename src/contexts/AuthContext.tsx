import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const LOCAL_MODE_STORAGE_KEY = 'stokbar-local-mode';

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AuthActionResult {
  ok: boolean;
  message?: string;
  needsEmailVerification?: boolean;
}

interface AuthContextValue {
  user: AppUser | null;
  firebaseUid: string | null;
  authReady: boolean;
  isLocalMode: boolean;
  signingIn: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<AuthActionResult>;
  resetPasswordWithEmail: (email: string) => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<boolean>;
  enterLocalMode: () => void;
  openLoginScreen: () => void;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseUser(u: FirebaseUser): AppUser {
  return {
    id: u.uid,
    uid: u.uid,
    email: u.email,
    displayName: u.displayName ?? u.email?.split('@')[0] ?? 'Operador',
    photoURL: u.photoURL,
    emailVerified: u.emailVerified,
  };
}

function translateFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
    case 'auth/invalid-email':
      return 'Endereço de e-mail inválido.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Tente entrar com sua senha.';
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'Login por E-mail/senha ainda não está ativado no Firebase Console (Authentication > Sign-in method).';
    case 'auth/unauthorized-domain':
      return `Domínio "${window.location.hostname}" não autorizado no Firebase Console (Authentication > Configurações > Domínios autorizados).`;
    case 'auth/popup-blocked':
      return 'O navegador bloqueou o pop-up do Google. Permita pop-ups e tente novamente.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.';
    case 'auth/network-request-failed':
      return 'Sem conexão com o Firebase. Verifique sua internet ou use o modo local.';
    default:
      return 'Não foi possível concluir a autenticação no Firebase. Tente novamente.';
  }
}

function readLocalModeFlag(): boolean {
  try {
    return sessionStorage.getItem(LOCAL_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeLocalModeFlag(enabled: boolean): void {
  try {
    if (enabled) {
      sessionStorage.setItem(LOCAL_MODE_STORAGE_KEY, '1');
    } else {
      sessionStorage.removeItem(LOCAL_MODE_STORAGE_KEY);
    }
  } catch {
    // ignore storage restrictions
  }
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState<boolean>(() => readLocalModeFlag());
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      // Only treat verified Firebase users as signed in so Firestore security rules (email_verified == true) always succeed
      if (fbUser && fbUser.emailVerified) {
        setFirebaseUser(fbUser);
      } else {
        setFirebaseUser(null);
      }
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const user: AppUser | null = firebaseUser ? mapFirebaseUser(firebaseUser) : null;
  const firebaseUid = user?.emailVerified ? user.uid : null;

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      const cleanEmail = email.trim().toLowerCase();
      setSigningIn(true);
      setAuthError(null);
      try {
        const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        if (!credential.user.emailVerified) {
          try {
            await sendEmailVerification(credential.user);
          } catch {
            // Avoid failing if Firebase rate-limits duplicate verification emails
          }
          await firebaseSignOut(auth);
          const message =
            'Seu e-mail ainda não foi confirmado. Reenviamos o link de confirmação — verifique sua caixa de entrada (e spam) e tente entrar novamente.';
          setAuthError(message);
          return { ok: false, message, needsEmailVerification: true };
        }

        writeLocalModeFlag(false);
        setIsLocalMode(false);
        return { ok: true };
      } catch (error) {
        const message = translateFirebaseAuthError(error);
        setAuthError(message);
        return { ok: false, message };
      } finally {
        setSigningIn(false);
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      fullName: string
    ): Promise<AuthActionResult> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim().slice(0, 80);

      setSigningIn(true);
      setAuthError(null);
      try {
        const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (cleanName) {
          await updateProfile(credential.user, { displayName: cleanName });
        }
        await sendEmailVerification(credential.user);
        await firebaseSignOut(auth);

        return {
          ok: true,
          needsEmailVerification: true,
          message:
            'Conta criada no Firebase! Enviamos um link de confirmação para seu e-mail. Confirme o link e depois clique em Entrar.',
        };
      } catch (error) {
        const message = translateFirebaseAuthError(error);
        setAuthError(message);
        return { ok: false, message };
      } finally {
        setSigningIn(false);
      }
    },
    []
  );

  const resetPasswordWithEmail = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      const cleanEmail = email.trim().toLowerCase();
      setSigningIn(true);
      setAuthError(null);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        return {
          ok: true,
          message:
            'Se este e-mail estiver cadastrado, enviamos um link do Firebase para redefinir sua senha.',
        };
      } catch (error) {
        const message = translateFirebaseAuthError(error);
        setAuthError(message);
        return { ok: false, message };
      } finally {
        setSigningIn(false);
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      writeLocalModeFlag(false);
      setIsLocalMode(false);
      return true;
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(null);
      } else {
        setAuthError(translateFirebaseAuthError(error));
      }
      return false;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const enterLocalMode = useCallback(() => {
    setAuthError(null);
    writeLocalModeFlag(true);
    setIsLocalMode(true);
  }, []);

  const openLoginScreen = useCallback(() => {
    setAuthError(null);
    writeLocalModeFlag(false);
    setIsLocalMode(false);
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    writeLocalModeFlag(false);
    setIsLocalMode(false);
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUid,
        authReady,
        isLocalMode,
        signingIn,
        authError,
        clearAuthError,
        signInWithEmail,
        signUpWithEmail,
        resetPasswordWithEmail,
        signInWithGoogle,
        enterLocalMode,
        openLoginScreen,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useFirebaseAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth must be used inside FirebaseProvider');
  }
  return ctx;
}
