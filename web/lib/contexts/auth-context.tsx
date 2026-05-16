'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, signInWithGoogle, signOut } from '../firebase-client';

export type UserRole = 'admin' | 'user';

interface AuthContextType {
  user: FirebaseUser | null;
  role: UserRole | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const authTransitionRef = useRef(0);

  useEffect(() => {
    if (!auth?.app) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      const transitionId = authTransitionRef.current + 1;
      authTransitionRef.current = transitionId;
      const isStale = () => authTransitionRef.current !== transitionId;

      setLoading(true);
      setUser(null);
      setRole(null);

      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: idTokenResult.token }),
            cache: 'no-store',
            credentials: 'same-origin',
          });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error || 'Failed to sync server session');
          }

          if (isStale()) return;
          setUser(firebaseUser);
          setRole((idTokenResult.claims.role as UserRole) || 'user');
        } catch (error) {
          console.error('Failed to sync session or fetch role:', error);
          await fetch('/api/auth/logout', {
            method: 'POST',
            cache: 'no-store',
            credentials: 'same-origin',
          }).catch(() => {});

          if (isStale()) return;
          setUser(null);
          setRole(null);
        }
      } else {
        await fetch('/api/auth/logout', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
        }).catch(() => {});
      }

      if (!isStale()) setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
