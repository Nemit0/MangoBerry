import React from 'react';
import { useNavigate } from 'react-router-dom'; // 페이지 이동을 위한 훅 임포트
import Button from '../components/Button'; // Button 컴포넌트 임포트
import './LeftSidebar.css'; // LeftSidebar 전용 CSS
import { useAuth } from '../contexts/AuthContext'; // AuthContext 임포트

function LeftSidebar() {
    const navigate = useNavigate(); // useNavigate 훅 사용
    const { isLoggedIn, logout } = useAuth(); // AuthContext에서 상태 및 함수 가져오기

    // 각 버튼 클릭 시 페이지 이동 함수
    const goToHomePage = () => navigate('/');
    const goToMyPage = () => navigate('/my');
    const goToMapPage = () => navigate('/map');

    return (
        <div className="left-sidebar-container">
            {/* 햄버거 메뉴 아이콘 */}
            {/* <div className="hamburger-menu">
                <div className="line"></div>
                <div className="line"></div>
                <div className="line"></div>
            </div> */}
            <div className="sidebar-content">
                {/* Button 컴포넌트를 사용하여 페이지 이동 버튼 추가 */}
                <Button onClick={goToHomePage}>🏠 홈페이지</Button>
                {/* 로그인 상태일 때만 '마이 페이지' 버튼 렌더링 */}
                {isLoggedIn && <Button onClick={goToMyPage}>👤 마이 페이지</Button>}
                <Button onClick={goToMapPage}>🗺️ 지도 페이지</Button>
                
                {/* 기존 필터 및 카테고리 목록
                <h3>필터</h3>
                <ul>
                    <li>추천 메뉴</li>
                    <li>최신 글</li>
                    <li>인기 글</li>
                </ul>
                <h3>카테고리</h3>
                <ul>
                    <li>한식</li>
                    <li>일식</li>
                    <li>중식</li>
                    <li>양식</li>
                    <li>아시안</li>
                    <li>카페</li>
                </ul> */}
                {/* 스크롤 테스트를 위해 더 많은 항목 추가 */}
                {/* {[...Array(10)].map((_, i) => (
                    <p key={i}>추가 항목 {i + 1}</p>
                ))} */}
            </div>
        </div>
    );
}

export default LeftSidebar;