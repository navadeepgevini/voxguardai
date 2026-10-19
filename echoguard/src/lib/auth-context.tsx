"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  getStoredToken,
  clearStoredToken,
} from "./api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/** Demo soft-auth operator — only when NEXT_PUBLIC_ALLOW_DEMO_AUTH=true */
const DEFAULT_OPERATOR: AuthUser = {
  id: "usr_default_operator",
  username: "operator",
  email: "operator@voxguard.security",
  full_name: "Security Operator",
  role: "Lead SOC Analyst",
};

function demoAuthAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_DEMO_AUTH === "true";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(demoAuthAllowed() ? DEFAULT_OPERATOR : null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser(token);
      setUser(currentUser);
    } catch {
      clearStoredToken();
      setUser(demoAuthAllowed() ? DEFAULT_OPERATOR : null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(credentials);
      setUser(res.user);
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const res = await apiRegister(credentials);
      setUser(res.user);
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiLogout();
      setUser(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
