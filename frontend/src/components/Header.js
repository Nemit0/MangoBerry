import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // AuthContext 임포트
import SearchBar from './SearchBar'; // SearchBar 컴포넌트 임포트
import './Header.css';

function Header({ searchTerm, onSearchChange }) { // 검색어 관련 props 받기
    const { isLoggedIn, logout } = useAuth(); // AuthContext에서 상태 및 함수 가져오기
    const navigate = useNavigate();
    const location = useLocation(); // 현재 위치 정보를 가져옴

    const handleLogoClick = () => {
        navigate('/'); // 로고 클릭 시 HomePage로 이동
    };

    const handleLogoutClick = () => {
        logout(); // 로그아웃 처리
        navigate('/'); // 로그아웃 후 HomePage로 이동
    };

    const handleLoginClick = () => {
        navigate('/login');
    };

    const handleRegisterClick = () => {
        navigate('/register');
    };

    const goToMyPage = () => navigate('/my');
    const goToMapPage = () => navigate('/map');
    const goToNewPage = () => navigate('/new');

    return (
        <header className="header-container">
            <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
                GUMIO
            </div>

            <div className="header-search-area">
                {location.pathname === '/' && (
                    /* SearchBar 컴포넌트 사용 */
                    <SearchBar
                        searchTerm={searchTerm}
                        onSearchChange={onSearchChange}
                        placeholder="게시물 검색..."
                    />
                )}
            </div>
            
            <div className="header-nav-container">
                <nav className="menu-nav">
                    {isLoggedIn ? (
                        <>
                            <p onClick={goToMyPage} className="nav-link" style={{ cursor: 'pointer' }}>내 프로필</p>
                            <p onClick={goToNewPage} className="nav-link" style={{ cursor: 'pointer' }}>글쓰기</p>
                            <p onClick={goToMapPage} className="nav-link" style={{ cursor: 'pointer' }}>지도</p>
                        </>
                    ) : (
                        <p onClick={goToMapPage} className="nav-link" style={{ cursor: 'pointer' }}>지도</p>
                    )}
                </nav>

                <nav className="header-nav">
                    {!isLoggedIn && ( // 로그아웃 상태일 때만 회원가입 표시
                        <p onClick={handleRegisterClick} className="nav-link" style={{ cursor: 'pointer' }}>회원가입</p>
                    )}
                    {isLoggedIn ? ( // 로그인 상태이면 로그아웃 표시
                        <p onClick={handleLogoutClick} className="nav-link logout-link" style={{ cursor: 'pointer' }}>로그아웃</p>
                    ) : ( // 로그아웃 상태이면 로그인 표시
                        <p onClick={handleLoginClick} className="nav-link" style={{ cursor: 'pointer' }}>로그인</p>
                    )}
                </nav>
            </div>
        </header>
    );
}

export default Header;