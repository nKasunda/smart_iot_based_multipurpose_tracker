import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { googleLogin as apiGoogleLogin, login as apiLogin, me as apiMe, register as apiRegister, verifyEmail as apiVerifyEmail } from "../lib/api";
import { getToken, setToken } from "../lib/tokenStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const existing = getToken();
    setTokenState(existing);
    if (!existing) {
      setBooting(false);
      return;
    }

    apiMe()
      .then((u) => setUser(u))
      .catch(() => {
        setToken(null);
        setTokenState(null);
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  const value = useMemo(() => {
    return {
      token,
      user,
      booting,
      isAuthed: !!token && !!user,
      async login(email, password) {
        const data = await apiLogin(email, password);
        setToken(data.token);
        setTokenState(data.token);
        setUser(data.user);
        return data;
      },
      async googleLogin(idToken) {
        const data = await apiGoogleLogin(idToken);
        setToken(data.token);
        setTokenState(data.token);
        setUser(data.user);
        return data;
      },
      async register(name, email, password) {
        const data = await apiRegister(name, email, password);
        if (data.token) {
          setToken(data.token);
          setTokenState(data.token);
          setUser(data.user);
        }
        return data;
      },
      async verifyEmail(payload) {
        const data = await apiVerifyEmail(payload);
        if (data.token) {
          setToken(data.token);
          setTokenState(data.token);
          setUser(data.user);
        }
        return data;
      },
      async refresh() {
        const u = await apiMe();
        setUser(u);
        return u;
      },
      logout() {
        setToken(null);
        setTokenState(null);
        setUser(null);
      },
    };
  }, [token, user, booting]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
