import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // 실제 앱에서는 토큰 유효성 검사, API 호출 등을 통해 로그인 상태를 확인합니다.
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        // 초기 로드 시 로컬 스토리지에서 로그인 상태 확인
        return localStorage.getItem('isLoggedIn') === 'true';
    });

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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};