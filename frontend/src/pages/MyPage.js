// src/pages/MyPage.js
import React from 'react';
import Header from '../components/Header'; // 헤더도 포함하는 것이 일반적
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import '../pages/HomePage.css'; // HomePage의 레이아웃 CSS 재활용 (간단한 예시)

function MyPage() {
    // MyPage는 검색 기능이 없다고 가정하여 searchTerm과 onSearchChange는 전달하지 않습니다.
    // 만약 MyPage에도 헤더가 필요하다면, Header를 임포트하고 레이아웃을 구성합니다.
    // 여기서는 HomePage의 레이아웃을 재활용하는 방식으로 구성합니다.
    return (
        <div className="homepage-layout">
            <Header searchTerm="" onSearchChange={() => {}} /> {/* 검색 기능 없는 더미 Header */}

            <div className="main-content-wrapper">
                <aside className="left-sidebar">
                    <LeftSidebar />
                </aside>

                <main className="middle-posts-area" style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <h2>마이 페이지</h2>
                    <p>여기에 사용자 정보, 활동 내역 등이 표시됩니다.</p>
                </main>

                <aside className="right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
}

export default MyPage;