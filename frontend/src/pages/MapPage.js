// src/pages/MapPage.js
import React from 'react';
import Header from '../components/Header'; // 헤더도 포함하는 것이 일반적
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import '../pages/HomePage.css'; // HomePage의 레이아웃 CSS 재활용 (간단한 예시)

function MapPage() {
    return (
        <div className="homepage-layout">
            <Header searchTerm="" onSearchChange={() => {}} /> {/* 검색 기능 없는 더미 Header */}

            <div className="main-content-wrapper">
                <aside className="left-sidebar">
                    <LeftSidebar />
                </aside>

                <main className="middle-posts-area" style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <h2>지도 페이지</h2>
                    <p>여기에 지도 API (Google Maps, Naver Maps 등)가 표시됩니다.</p>
                </main>

                <aside className="right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
}

export default MapPage;