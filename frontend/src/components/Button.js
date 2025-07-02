// src/components/Button.js
import React from 'react';
import './Button.css'; // Button 컴포넌트 전용 CSS 파일 임포트

/**
 * 범용적인 버튼 컴포넌트.
 * 다양한 스타일과 아이콘을 지원합니다.
 *
 * @param {object} props - 컴포넌트 속성
 * @param {React.ReactNode} [props.children] - 버튼 내부에 표시될 내용 (텍스트, 아이콘 등).
 * 주로 텍스트 버튼에 사용되며, 아이콘 버튼에는 icon prop을 사용합니다.
 * @param {function} [props.onClick] - 버튼이 클릭될 때 실행될 함수.
 * @param {string} [props.className] - 추가적으로 적용할 CSS 클래스 이름 (예: "icon-button", "positive" 등).
 * 기본값은 빈 문자열입니다.
 * @param {React.ElementType} [props.icon] - 렌더링할 아이콘 컴포넌트 (예: react-icons에서 임포트한 FaBars, IoMdClose 등).
 * @param {object} [props.iconProps] - 아이콘 컴포넌트에 전달할 추가 prop (예: size, color 등).
 * @param {string} [props.ariaLabel] - 스크린 리더를 위한 접근성 레이블. 아이콘 버튼 사용 시 필수 권장.
 * @param {boolean} [props.disabled] - 버튼 비활성화 여부.
 * @param {string} [props.type] - 버튼의 타입 (submit, reset, button). 기본값은 'button'.
 * @param {object} [props.rest] - 그 외 모든 HTML button 요소가 받을 수 있는 속성들 (id, data-*, style 등).
 */
function Button({
    children,
    onClick,
    className = '',
    icon: IconComponent,
    iconProps = {},
    ariaLabel,
    disabled = false,
    type = 'button',
    ...rest
}) {
    const buttonClasses = `custom-button ${className}`.trim();

    if (className.includes('icon-button') && !ariaLabel) {
        console.warn("경고: 'icon-button' 클래스를 사용하는 버튼에는 'ariaLabel' prop이 권장됩니다. 스크린 리더 사용자를 위해 버튼의 기능을 설명해주세요.");
    }

    return (
        <button
            type={type}
            className={buttonClasses}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            {...rest}
        >
            {IconComponent && (
                <IconComponent className="button-icon" {...iconProps} />
            )}
            {children}
        </button>
    );
}

export default Button;