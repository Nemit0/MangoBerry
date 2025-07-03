// src/pages/MyPage.js (최소 변경)
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import Button from '../components/Button';

import '../pages/HomePage.css';

function MyPage() {
    const navigate = useNavigate();
    const goToEditPage = () => { // postId 인자 제거
        navigate('/edit'); // <--- 변경: /edit 경로로만 이동
    };

    return (
        <div className="homepage-layout">
            <Header searchTerm="" onSearchChange={() => {}} />

            <div className="main-content-wrapper">
                <aside className="left-sidebar">
                    <LeftSidebar />
                </aside>

                <main className="middle-posts-area">
                    <h1>마이 페이지</h1>
                    <p>내 프로필 정보와 내가 작성한 게시물들을 볼 수 있는 페이지입니다.</p>
                    
                    {/* <--- 변경: 편집 버튼 예시 (실제로는 게시물별로 있어야 함) */}
                    <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                        <h3>내 게시물 #1 </h3>
                        <p> 첫 번째 게시물 </p>
                        {/* <--- 변경: onClick 함수에 postId 인자 제거 */}
                        <Button onClick={goToEditPage} className="custom-button primary">
                            편집
                        </Button>
                    </div>

                    <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                        <h3>내 게시물 #2 </h3>
                        <p> 두 번째 게시물 </p>
                        {/* <--- 변경: onClick 함수에 postId 인자 제거 */}
                        <Button onClick={goToEditPage} className="custom-button primary">
                            편집
                        </Button>
                    </div>

                    {/* 마이페이지 다른 내용들... */}
                </main>

                <aside className="right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
}

export default MyPage;