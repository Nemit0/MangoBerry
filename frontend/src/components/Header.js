// src/components/Header.js (올바른 코드)
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoSearch } from 'react-icons/io5';
import './Header.css';
import { useAuth } from '../contexts/AuthContext';

function Header({ searchTerm: initialSearchTerm = '', onSearchChange }) {
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const navigate = useNavigate();
    const { isLoggedIn, logout } = useAuth();
    const location = useLocation();

    console.log("Header - 현재 라우트:", location.pathname, "로그인 상태:", isLoggedIn);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        alert(`검색: ${searchTerm}`);
    };

    const handleLogout = () => {
        logout();
        alert('로그아웃 되었습니다!');
        navigate('/login');
    };

    return (
        <header className="main-header">
            <div className="header-left">
                <h1 className="logo" onClick={() => navigate('/')}>GUMIO</h1>
            </div>
            
            <form onSubmit={handleSearchSubmit} className="search-bar-container">
                <input
                    type="text"
                    placeholder="검색어를 입력해주세요"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (onSearchChange) onSearchChange(e.target.value);
                    }}
                    className="search-input"
                />
                <button type="submit" className="search-button">
                    <IoSearch />
                </button>
            </form>

            <div className="header-right"> 
                {isLoggedIn ? (
                    <span onClick={handleLogout} className="header-text-button">
                        로그아웃
                    </span>
                ) : (
                    location.pathname === '/' && (
                        <>
                            <span onClick={() => navigate('/register')} className="header-text-button">
                                회원 가입
                            </span>
                            <span 
                                onClick={() => navigate('/login')} 
                                className="header-text-button" 
                                style={{ marginLeft: '10px' }} 
                            >
                                로그인
                            </span>
                        </>
                    )
                )}
            </div>
        </header>
    );
}

export default Header;