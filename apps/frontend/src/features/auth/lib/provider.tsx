"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { getClientUser } from "./client";

const AuthContext = createContext<any>(null);

export function AuthProvider({ initialUser, children }: { initialUser: any; children: ReactNode }) {
  const [user, setUser] = useState(initialUser);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Only fetch if SSR gave us null
    if (!initialUser) {
      getClientUser().then((u) => {
        setUser(u);
        setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, []);

  // Avoid hydration mismatch: don't render children until client finished check
  if (!loaded) {
    return null; // or loader, skeleton, etc.
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
