// src/contexts/AuthContext.js (예시 - 이대로 구현되어 있어야 합니다)
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. AuthContext 생성 (초기값은 null 또는 기본값)
const AuthContext = createContext(null); 

// 2. AuthProvider 컴포넌트 정의
export const AuthProvider = ({ children }) => {
  // 로그인 상태 (초기값은 false 또는 로컬 스토리지에서 가져오기)
  const [isLoggedIn, setIsLoggedIn] = useState(false); 

  // 컴포넌트 마운트 시 로컬 스토리지에서 로그인 상태 로드 (선택 사항)
  useEffect(() => {
    const storedLoginStatus = localStorage.getItem('isLoggedIn');
    if (storedLoginStatus === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // 로그인 함수
  const login = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true'); // 로그인 상태 로컬 스토리지에 저장
    // 여기에 실제 로그인 API 호출 로직 등을 추가할 수 있습니다.
  };

  // 로그아웃 함수
  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn'); // 로그인 상태 로컬 스토리지에서 제거
    // 여기에 실제 로그아웃 API 호출 로직 등을 추가할 수 있습니다.
  };

  return (
    // 3. AuthContext.Provider를 통해 value(상태와 함수들)를 제공
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children} {/* Provider로 감싸진 하위 컴포넌트들이 여기에 렌더링됩니다. */}
    </AuthContext.Provider>
  );
};

// 4. useAuth 커스텀 훅 정의 (컨텍스트를 쉽게 사용할 수 있도록)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // 이 에러는 AuthProvider 밖에서 useAuth를 호출했을 때 발생합니다.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};