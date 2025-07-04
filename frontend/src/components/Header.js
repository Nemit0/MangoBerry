// src/components/Header.js (수정된 올바른 코드)
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom'; // ← Link 추가!
import { IoSearch } from 'react-icons/io5';
import './Header.css';
import { useAuth } from '../contexts/AuthContext';

function Header({ searchTerm: initialSearchTerm = '', onSearchChange }) {
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const navigate = useNavigate();
    const location = useLocation();

    const { isLoggedIn, logout } = useAuth();

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

            <nav className="header-nav">
                {!isLoggedIn && (
                    <Link to="/register" className="nav-link">회원가입</Link>
                )}
                {isLoggedIn ? (
                    <span onClick={handleLogout} className="nav-link logout-link">로그아웃</span>
                ) : (
                    <Link to="/login" className="nav-link" style={{marginLeft: '10px'}}>로그인</Link>
                )}
            </nav>
        </header>
    );
}

export default Header;
