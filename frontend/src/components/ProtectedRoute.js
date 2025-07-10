import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isLoggedIn } = useAuth();
    const location = useLocation();

    if (!isLoggedIn) {
        // 사용자가 로그인하지 않았다면 로그인 페이지로 리다이렉트합니다.
        // state: { from: location }는 로그인 후 원래 가려던 페이지로 돌아오게 하기 위함입니다.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 로그인했다면, 요청한 페이지(children)를 렌더링합니다.
    return children;
};

export default ProtectedRoute;