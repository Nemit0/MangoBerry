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

    const login = () => {
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        alert('로그인 되었습니다!');
        // 실제 로그인 성공 후 페이지 이동 (예: navigate('/')) 또는 다른 처리
    };

    const logout = () => {
        setIsLoggedIn(false);
        localStorage.removeItem('isLoggedIn');
        alert('로그아웃 되었습니다.');
        // 실제 로그아웃 후 페이지 이동 (예: navigate('/')) 또는 다른 처리
    };

    // isLoggedIn 상태가 변경될 때마다 로컬 스토리지에 동기화 (선택 사항)
    useEffect(() => {
        localStorage.setItem('isLoggedIn', isLoggedIn);
    }, [isLoggedIn]);

    return (
        <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
            {children}
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