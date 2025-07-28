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
  // JWT token-based auth state
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem("token")));

  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  });

  /* ─────────────────── welcome‑popup / onboarding ─────────────────── */
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [hasSeenWelcomePopup, setHasSeenWelcomePopup] = useState(false);

  /* ───────────────────── side‑effects: localStorage ────────────────── */
  // Persist JWT token in localStorage
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

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
    (data) => {
      // Store JWT token and basic user info
      setToken(data.access_token);
      setIsLoggedIn(true);
      setUser({ user_id: data.user_id });

      // Onboarding status check
      if (data.user_id) {
        decideWelcomePopup(data.user_id);
      } else {
        setShowWelcomePopup(true);
        setHasSeenWelcomePopup(false);
      }
    },
    [decideWelcomePopup]
  );

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUser(null);
    setToken(null);
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
        user, // can access user.user_id anywhere in the app
        token,
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
