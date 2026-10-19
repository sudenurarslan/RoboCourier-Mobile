import React, { createContext, useContext, useMemo, useState } from 'react';
import { registerForPushNotificationsIfPossible } from '@/lib/push';

export type UserRole = 'sender' | 'receiver' | 'admin';

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  React.useEffect(() => {
    if (!user?.id) return;
    // Best-effort: push notifications are optional. Fail silently.
    registerForPushNotificationsIfPossible(user.id).catch((e) => console.log('PUSH: register error', e));
  }, [user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn: (u) => setUser(u),
      signOut: () => setUser(null),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


