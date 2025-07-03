// src/pages/HomePage.js
import React, { useState } from 'react';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import PostList from '../components/PostList';
import RightSidebar from '../components/RightSidebar';
import './HomePage.css';
import WelcomePopup from '../components/WelcomePopup';
import { useAuth } from '../contexts/AuthContext';

function HomePage() {
    // 검색어 상태를 HomePage에서 관리
    const [searchTerm, setSearchTerm] = useState('');

    const { isLoggedIn, showWelcomePopup, closeWelcomePopUp } = useAuth();

    // Header에서 검색어가 변경될 때 호출될 핸들러
    const handleSearchChange = (term) => {
        setSearchTerm(term);
    };

    return (
        <div className="homepage-layout">
            {/* Header 컴포넌트: 검색어 상태와 핸들러를 prop으로 전달 */}
            <Header searchTerm={searchTerm} onSearchChange={handleSearchChange} />
            {/* 하단 전체 콘텐츠 영역 */}
            <div className="main-content-wrapper">
                {/* 좌측 고정 사이드바 */}
                <aside className="left-sidebar">
                    <LeftSidebar />
                </aside>
                {/* 중간 게시물 영역 (PostList) - 스크롤 가능 */}
                <main className="homepage-middle-posts-area">
                    <PostList searchTerm={searchTerm} /> {/* PostList에 검색어 전달 */}
                </main>

                {/* WelcomePopup 조건부 렌더링 */}
                {isLoggedIn && showWelcomePopup && (
                    <WelcomePopup onClose={closeWelcomePopUp} />
                )}

                {/* 우측 고정 사이드바 */}
                <aside className="right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
}

export default HomePage;