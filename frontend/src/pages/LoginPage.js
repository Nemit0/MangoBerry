import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import './LoginPage.css';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); 
    const navigate = useNavigate();
    const { login } = useAuth(); // AuthContext의 login 함수 가져오기
    

    const handleLogin = (e) => {
        e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지

        // 간단한 로그인 로직 (하드코딩된 아이디/비밀번호)
        if (username === 'test' && password === 'password') {
            login(); // AuthContext를 통해 로그인 상태 변경
            navigate('/'); // 로그인 성공 시 HomePage로 이동
        } else {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
    };

    // const handleRegister = () => {
    //     navigate('/register'); // 회원가입 버튼 클릭시 RegisterPage로 이동
    // };

    return (
        <div className='loginpage-layout'>
            <Header />
            <div className='main-content-wrapper'>
                <aside className='left-sidebar'>
                    <LeftSidebar />
                </aside>

                <main className='middle-login-area'>
                    <div className='login-container'>
                        <div className='login-box'>
                            <h2 className='login-title'>로그인</h2>
                            <form onSubmit={handleLogin} className='login-form'>
                                <div className='login-input-group'>
                                    {/* <label htmlFor='username'>아이디</label> */}
                                    <input
                                        type='text'
                                        id='username'
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder='아이디'
                                        required
                                    />
                                </div>
                                <div className='login-input-group'>
                                    {/* <label htmlFor='password'>비밀번호</label> */}
                                    <input
                                        type='password'
                                        id='password'
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder='비밀번호'
                                        required
                                    />
                                </div>
                                {error && <p className='login-error'>{error}</p>}
                                <button type="submit" className='login-button'>로그인</button>
                                <div className='register-nav'>
                                    <Link to='/register' className='register-nav-link'>회원가입</Link>
                                </div>
                            </form>
                            {/* <button type='button' onClick={handleRegister} className='register-button'>회원가입</button> */}
                        </div>
                    </div>
                </main>
                
                <aside className='right-sidebar'>
                    <RightSidebar />
                </aside>

            </div>
        </div>

        
    );
}

export default LoginPage;