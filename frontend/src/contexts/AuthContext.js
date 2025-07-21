import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext(null);
const API_ROOT    = "/api";

export const AuthProvider = ({ children }) => {
  /* ───────────────────── persistent auth state ───────────────────── */
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });

  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  });

  /* ─────────────────── welcome‑popup / onboarding ─────────────────── */
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [hasSeenWelcomePopup, setHasSeenWelcomePopup] = useState(false);

  /* ───────────────────── side‑effects: localStorage ────────────────── */
  useEffect(() => {
    localStorage.setItem("isLoggedIn", String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  /* ───────────────────── helper: fetch keyword count ───────────────── */
  const decideWelcomePopup = useCallback(async (uid) => {
    try {
      const resp = await fetch(`${API_ROOT}/social/${uid}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const hasKeywords = Array.isArray(data.keywords) && data.keywords.length > 0;

      if (hasKeywords) {
        /* User already completed onboarding – no popup. */
        setShowWelcomePopup(false);
        setHasSeenWelcomePopup(true);
      } else {
        /* Zero keywords → show onboarding popup. */
        setShowWelcomePopup(true);
        setHasSeenWelcomePopup(false);
      }
    } catch (err) {
      console.error("[AuthContext] Failed to fetch keyword profile:", err);
      /* On error, be safe and show the popup. */
      setShowWelcomePopup(true);
      setHasSeenWelcomePopup(false);
    }
  }, []);

  /* ───────────────────────── auth helpers ──────────────────────────── */
  const login = useCallback(
    (userData) => {
      /* 1. Basic auth state */
      setIsLoggedIn(true);
      setUser(userData); // { user_id, email, … }

      /* 2. Check onboarding status asynchronously */
      if (userData?.user_id) {
        decideWelcomePopup(userData.user_id);
      } else {
        /* Edge case: no user_id available */
        setShowWelcomePopup(true);
        setHasSeenWelcomePopup(false);
      }
    },
    [decideWelcomePopup]
  );

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
  }, []);

  const closeWelcomePopUp = () => {
    setShowWelcomePopup(false);
  };

  /* ───────────────────── expose context values ─────────────────────── */
  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user, // ← can access user.user_id anywhere in the app
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

/* ─────────────────────── custom hook wrapper ───────────────────────── */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
