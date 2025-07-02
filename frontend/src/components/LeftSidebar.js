// src/components/LeftSidebar.js (업데이트: '마이 페이지' 텍스트 버튼 제거)
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import './LeftSidebar.css';
import { useAuth } from '../contexts/AuthContext';

import IconButtonGroup from './IconButtonGroup';

import { IoMapOutline } from "react-icons/io5";
import { AiOutlineFileAdd } from "react-icons/ai";
import { BsPersonFill } from "react-icons/bs";

function LeftSidebar() {
    const navigate = useNavigate();
    const { isLoggedIn } = useAuth();
    const location = useLocation();

    const goToMyPage = () => navigate('/my');
    const goToMapPage = () => navigate('/map');
    const goToNewPage = () => navigate('/new');

    const homePageIconButtons = [
        { icon: AiOutlineFileAdd, onClick: goToNewPage, ariaLabel: "새 게시물 작성" },
        { icon: IoMapOutline, onClick: goToMapPage, ariaLabel: "지도 보기" },
    ];

    const newPageIconButtons = [
        { icon: AiOutlineFileAdd, onClick: goToNewPage, ariaLabel: "새 리뷰 작성" },
        { icon: IoMapOutline, onClick: goToMapPage, ariaLabel: "지도에서 위치 선택" },
        { icon: BsPersonFill, onClick: goToMyPage, ariaLabel: "마이 페이지로 이동" },
    ];

    let currentIconButtons = homePageIconButtons;
    if (location.pathname === '/new' || location.pathname.startsWith('/edit')) {
        currentIconButtons = newPageIconButtons;
    }

    return (
        <div className="left-sidebar-container">
            <div className="sidebar-content">
                {/* <--- 변경: 로그인 상태일 때 렌더링되던 '마이 페이지' 텍스트 버튼을 제거합니다. */}
                {/* {isLoggedIn && <Button onClick={goToMyPage}>👤 마이 페이지</Button>} */}

                <div style={{
                    marginTop: '20px',
                    padding: '10px',
                    borderTop: '1px solid #eee',
                    position: 'fixed',
                    top: '120px',
                    left: '20px',
                    zIndex: 1000
                }}>
                    <IconButtonGroup buttons={currentIconButtons} />
                </div>
            </div>
        </div>
    );
}

export default LeftSidebar;