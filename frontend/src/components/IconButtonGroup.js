// src/components/IconButtonGroup.js (이전 답변에서 제시했던 '수정된 최종 버전' 코드)
import React, { useState } from 'react'; // useState 훅 임포트
import Button from './Button'; // Button 컴포넌트 임포트 (경로 확인)

// --- 필요한 아이콘들을 임포트합니다 ---
// 이 컴포넌트 내부에서 직접 사용되는 아이콘 (햄버거, X)만 임포트.
// 나머지 아이콘들은 각 페이지에서 정의하여 prop으로 전달합니다.
import { BsJustify } from "react-icons/bs"; // 햄버거
import { BsXLg } from "react-icons/bs";     // X (닫기)

/**
 * 동적으로 아이콘 버튼 그룹을 렌더링하고 햄버거 메뉴 토글 기능을 제공하는 컴포넌트입니다.
 *
 * @param {object} props - 컴포넌트 props
 * @param {Array<Object>} props.buttons - 햄버거 메뉴 토글 시 보여줄 버튼들의 배열.
 * 각 객체는 { icon: React.ElementType, onClick: Function, ariaLabel: string } 형태입니다.
 */
function IconButtonGroup({ buttons = [] }) { // 'buttons' prop을 받도록 수정했습니다.
    const [isMenuOpen, setIsMenuOpen] = useState(false); // 메뉴 열림/닫힘 상태 관리

    // 햄버거/X 버튼 클릭 시 상태를 토글하는 함수
    const handleToggleMenu = () => {
        setIsMenuOpen(prev => !prev);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column', // 핵심: 아이콘 버튼들을 세로로 정렬합니다.
            alignItems: 'flex-start', // 핵심: 아이콘 버튼들을 왼쪽으로 정렬합니다.
            gap: '15px', // 버튼 간 간격
            padding: '10px',
            // border: '1px dashed #ccc', // 임시 테두리를 원치 않으면 이 줄을 제거하세요.
            borderRadius: '5px'
        }}>
            {/* 햄버거 / X 버튼: isMenuOpen 상태에 따라 아이콘 변경 및 클릭 핸들러 연결 */}
            <Button
                className="icon-button"
                icon={isMenuOpen ? BsXLg : BsJustify} // 메뉴가 열리면 X 아이콘, 닫히면 햄버거 아이콘
                onClick={handleToggleMenu} // 클릭 시 메뉴 상태 토글
                ariaLabel={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            />

            {/* isMenuOpen이 true일 때만 'buttons' prop으로 전달받은 아이콘 버튼들을 렌더링 */}
            {isMenuOpen && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column', // 내부 버튼들도 세로 정렬
                    alignItems: 'flex-start', // 내부 버튼들도 왼쪽 정렬
                    gap: '15px'
                }}>
                    {/* 'buttons' prop으로 전달받은 배열을 map으로 순회하며 버튼들을 렌더링합니다. */}
                    {buttons.map((button, index) => (
                        <Button
                            key={index} // 리스트 렌더링 시 key prop은 필수입니다.
                            className="icon-button"
                            icon={button.icon}
                            onClick={button.onClick}
                            ariaLabel={button.ariaLabel}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default IconButtonGroup;