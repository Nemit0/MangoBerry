import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = () => {
        login(); // AuthContext의 login 함수 호출
        navigate('/'); // 로그인 후 HomePage로 이동
    };

    return (
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <h2>로그인 페이지</h2>
            <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '1.2em' }}>
                로그인하기 (클릭)
            </button>
            <p style={{ marginTop: '20px' }}>실제로는 아이디/비밀번호 입력 후 로그인 처리</p>
        </div>
    );
}

export default LoginPage;