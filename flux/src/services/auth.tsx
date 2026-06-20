import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isCloud, supabase } from './supabase';

/**
 * Auth + workspace context.
 *
 * Local mode: this is an inert passthrough — there is no sign-in, ready=true,
 * and the rest of the app behaves exactly as the offline prototype did.
 *
 * Cloud mode: Supabase email OTP (one-time code). On sign-in we read the user's
 * profile, which the database trigger has already linked to a workspace keyed to
 * their email domain — so colleagues on the same domain share data automatically.
 */
interface AuthState {
  ready: boolean;
  userEmail: string | null;
  workspaceId: string | null;
}

interface AuthApi extends AuthState {
  cloud: boolean;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

let currentWorkspaceId: string | null = null;
let currentUserEmail: string | null = null;
/** Read by cloudStore when stamping writes. */
export function getWorkspaceId(): string | null {
  return currentWorkspaceId;
}
/** The signed-in user's (lower-cased) email — used for project membership. */
export function getUserEmail(): string | null {
  return currentUserEmail;
}

const Ctx = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within <AuthProvider>');
  return v;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(
    isCloud ? { ready: false, userEmail: null, workspaceId: null } : { ready: true, userEmail: null, workspaceId: null },
  );

  async function loadProfile(userId: string, email: string | undefined) {
    if (!supabase) return;
    // The handle_new_user trigger creates the profile; poll briefly in case of lag.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await supabase.from('profiles').select('workspace_id').eq('id', userId).maybeSingle();
      if (data?.workspace_id) {
        currentWorkspaceId = data.workspace_id;
        currentUserEmail = (email ?? '').toLowerCase() || null;
        setState({ ready: true, userEmail: email ?? null, workspaceId: data.workspace_id });
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    // Profile not found — surface as signed-in-but-unprovisioned so the gate can explain.
    setState({ ready: true, userEmail: email ?? null, workspaceId: null });
  }

  useEffect(() => {
    if (!isCloud || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s?.user) loadProfile(s.user.id, s.user.email ?? undefined);
      else setState({ ready: true, userEmail: null, workspaceId: null });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id, session.user.email ?? undefined);
      else {
        currentWorkspaceId = null;
        currentUserEmail = null;
        setState({ ready: true, userEmail: null, workspaceId: null });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const api: AuthApi = {
    ...state,
    cloud: isCloud,
    async sendCode(email) {
      if (!supabase) return;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) throw new Error(error.message);
    },
    async verifyCode(email, token) {
      if (!supabase) return;
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'email',
      });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
