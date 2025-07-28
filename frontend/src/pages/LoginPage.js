import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { login as apiLogin } from '../api';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './LoginPage.css';

function LoginPage() {
    const [username, setUsername] = useState(''); 
    const [password, setPassword] = useState(''); 
    const [error, setError] = useState(''); 
    const navigate = useNavigate();
    const { login } = useAuth(); // Context login function

    // JWT login via apiLogin
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Authenticate and receive JWT
            const data = await apiLogin(username, password);
            login(data);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('로그인 중 오류가 발생했습니다.');
        }
    };

    // const handleRegister = () => {
    //     navigate('/register'); // 회원가입 버튼 클릭시 RegisterPage로 이동
    // };

    return (
        <div className='loginpage-layout'>
            <Header />
            <div className='main-content-wrapper'>
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
                                        placeholder='이메일'
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
            </div>
        </div>
    );
}

export default LoginPage;
