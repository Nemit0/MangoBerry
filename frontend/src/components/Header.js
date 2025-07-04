import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // AuthContext 임포트
import SearchBar from './SearchBar'; // SearchBar 컴포넌트 임포트
import './Header.css';

function Header({ searchTerm, onSearchChange }) { // 검색어 관련 props 받기
    const { isLoggedIn, logout } = useAuth(); // AuthContext에서 상태 및 함수 가져오기
    const navigate = useNavigate();

    const handleLogoClick = () => {
        navigate('/'); // 로고 클릭 시 HomePage로 이동
    };

    const handleLogoutClick = () => {
        logout(); // 로그아웃 처리
        navigate('/'); // 로그아웃 후 HomePage로 이동
    };

    return (
        <header className="header-container">
            <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
                GUMIO
            </div>

            <div className="header-search-area">
                {/* SearchBar 컴포넌트 사용 */}
                <SearchBar
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    placeholder="게시물 검색..."
                />
            </div>

            <nav className="header-nav">
                {!isLoggedIn && ( // 로그아웃 상태일 때만 회원가입 표시
                    <Link to="/register" className="nav-link">회원가입</Link>
                )}
                {isLoggedIn ? ( // 로그인 상태이면 로그아웃 표시
                    <span onClick={handleLogoutClick} className="nav-link logout-link">로그아웃</span>
                ) : ( // 로그아웃 상태이면 로그인 표시
                    <Link to="/login" className="nav-link">로그인</Link>
                )}
            </nav>
        </header>
    );
}

export default Header;