// src/contexts/AuthContext.js (예시 - 이대로 구현되어 있어야 합니다)
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. AuthContext 생성 (초기값은 null 또는 기본값)
const AuthContext = createContext(null); 

// 2. AuthProvider 컴포넌트 정의
export const AuthProvider = ({ children }) => {
  // 로그인 상태 (초기값은 false 또는 로컬 스토리지에서 가져오기)
  // 실제 앱에서는 토큰 유효성 검사, API 호출 등을 통해 로그인 상태를 확인합니다
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // 초기 로드 시 로컬 스토리지에서 로그인 상태 확인
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  // 팝업을 처음 로그인 시점에 보여줄지 여부 (로그인 시 true로 설정하고, 팝업 닫을 때 false로)
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  // 사용자가 팝업을 이미 봤는 지 여부를 localStorage에서 로드
  const [hasSeenWelcomePopup, setHasSeenWelcomePopup] = useState(() => {
    return localStorage.getItem('hasSeenWelcomePopup') === 'true';
  });

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
        if (!hasSeenWelcomePopup) {
          setShowWelcomePopup(true);
        }
    };

    const logout = () => {
        setIsLoggedIn(false);
        localStorage.removeItem('isLoggedIn');
        alert('로그아웃 되었습니다.');
        // 실제 로그아웃 후 페이지 이동 (예: navigate('/')) 또는 다른 처리
        // 로그아웃 시에는 팝업 상태 초기화하지 않음 (다시 로그인하면 첫 로그인 아님)
        // 만약 로그아웃하면 팝업 상태도 초기화하고 싶다면 여기서 setHasSeenWelcomePopup(false);
    };

    // isLoggedIn 상태가 변경될 때마다 로컬 스토리지에 동기화 (선택 사항)
    useEffect(() => {
        localStorage.setItem('isLoggedIn', isLoggedIn);
    }, [isLoggedIn]);

    // hasSeenWelcomePopup 상태가 변경될 때 localStorage 업데이트
    useEffect(() => {
      localStorage.setItem('hasSeenWelcomePopup', hasSeenWelcomePopup);
    }, [hasSeenWelcomePopup]);

    const closeWelcomePopUp = () => {
      setShowWelcomePopup(false);
      setHasSeenWelcomePopup(true); // 팝업을 닫으면 봤다고 표시
    }


    return (
        <AuthContext.Provider value={{ isLoggedIn, login, logout, showWelcomePopup, closeWelcomePopUp, hasSeenWelcomePopup }}>
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