// src/pages/MapPage.js (업데이트된 최종 버전)
import React from 'react';
// import { useNavigate } from 'react-router-dom'; // goToHomePage 함수가 필요하다면 주석 해제
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import Button from '../components/Button'; // Button 컴포넌트 임포트
import { TbMapSearch } from "react-icons/tb"; // 지도 내 검색 아이콘 임포트
import '../pages/HomePage.css'; // HomePage의 레이아웃 CSS 재활용 (간단한 예시)

function MapPage() {
    const handleMapSearch = () => {
        alert('지도 내 검색 기능을 실행합니다!');
        // 실제 검색 로직 또는 모달 호출 (미완완)
    };

    return (
        <div className="homepage-layout">
            <Header searchTerm="" onSearchChange={() => {}} /> {/* 검색 기능 없는 더미 Header */}

            <div className="main-content-wrapper">
                <aside className="left-sidebar">
                    {/* MapPage에서는 LeftSidebar의 아이콘 그룹은 동일하게 유지됩니다. */}
                    <LeftSidebar />
                </aside>

                {/* main 태그에 relative 포지션을 주어, 내부 absolute 요소의 기준점이 되도록 합니다. */}
                <main className="middle-posts-area" style={{ position: 'relative', textAlign: 'center', paddingTop: '50px' }}>
                    <h2>지도 페이지</h2>
                    <p>여기에 지도 API (Google Maps, Naver Maps 등)가 표시됩니다.</p>

                    {/* 오른쪽 상단에 지도 내 검색 아이콘 버튼 추가 */}
                    <div style={{
                        position: 'absolute', // 부모 요소 (main) 기준으로 위치 지정
                        top: '20px', // main 태그 상단에서 20px 아래
                        right: '20px', // main 태그 우측에서 20px 왼쪽
                        zIndex: 100 // 다른 콘텐츠 위에 오도록 z-index 설정
                    }}>
                        <Button
                            className="icon-button" // Button.css에 정의된 원형 아이콘 스타일 사용
                            icon={TbMapSearch}
                            onClick={handleMapSearch}
                            ariaLabel="지도 내 검색"
                        />
                    </div>
                </main>

                <aside className="right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
}

export default MapPage;