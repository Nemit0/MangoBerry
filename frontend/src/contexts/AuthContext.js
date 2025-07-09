// src/contexts/AuthContext.js
/*
 * Global authentication / user context
 * ─────────────────────────────────────
 * Stores:
 *   • isLoggedIn   → boolean
 *   • user         → { user_id, email, nickname, … } | null
 *   • showWelcomePopup, hasSeenWelcomePopup
 *
 * `login(userData)` expects the payload you receive from
 * POST /login (see backend), e.g. { user_id, email, verified, … }.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // ─── persistent auth state ───────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });

  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  });

  // ─── welcome-popup state ─────────────────────────────────
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [hasSeenWelcomePopup, setHasSeenWelcomePopup] = useState(() => {
    return localStorage.getItem("hasSeenWelcomePopup") === "true";
  });

  // ─── side-effects to keep localStorage in sync ───────────
  useEffect(() => {
    localStorage.setItem("isLoggedIn", String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("hasSeenWelcomePopup", hasSeenWelcomePopup);
  }, [hasSeenWelcomePopup]);

  // ─── auth helpers ────────────────────────────────────────
  const login = useCallback(
    (userData) => {
      setIsLoggedIn(true);
      setUser(userData); // { user_id, email, … }
      if (!hasSeenWelcomePopup) setShowWelcomePopup(true);
    },
    [hasSeenWelcomePopup]
  );

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
  }, []);

  const closeWelcomePopUp = () => {
    setShowWelcomePopup(false);
    setHasSeenWelcomePopup(true);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user, // ← access user.user_id anywhere
        login,
        logout,
        showWelcomePopup,
        closeWelcomePopUp,
        hasSeenWelcomePopup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
