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
  const [hasSeenWelcomePopup, setHasSeenWelcomePopup] = useState(false);

  // ─── side-effects to keep localStorage in sync ───────────
  useEffect(() => {
    localStorage.setItem("isLoggedIn", String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  // ─── auth helpers ────────────────────────────────────────
  const login = useCallback(
    (userData) => {
      setIsLoggedIn(true);
      setUser(userData); // { user_id, email, … }

      // TODO: 백엔드에서 사용자 키워드 유무를 확인하는 API 호출 (나중에 구현)
      // 예시:
      // fetch(`/api/user/${userData.user_id}/keywords`)
      //   .then(response => response.json())
      //   .then(data => {
      //     if (data.keywords && data.keywords.length > 0) {
      //       // 키워드가 있으면 웰컴 팝업을 띄우지 않음
      //       setShowWelcomePopup(false);
      //       setHasSeenWelcomePopup(true); // 웰컴 팝업을 본 것으로 처리
      //     } else {
      //       // 키워드가 없으면 웰컴 팝업을 띄움
      //       setShowWelcomePopup(true);
      //       setHasSeenWelcomePopup(false);
      //     }
      //   })
      //   .catch(error => {
      //     console.error("Error fetching user keywords:", error);
      //     // 에러 발생 시 기본적으로 웰컴 팝업을 띄움
      //     setShowWelcomePopup(true);
      //     setHasSeenWelcomePopup(false);
      //   });

      // 임시: 키워드 API 구현 전까지는 항상 웰컴 팝업을 띄우도록 설정
      setShowWelcomePopup(true);
      setHasSeenWelcomePopup(false);
    },
    []
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
