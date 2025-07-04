// src/components/Button.js
import React from 'react';
import './Button.css'; // Button 컴포넌트 전용 CSS 파일 임포트

// 함수형 컴포넌트 선언 및 prop 구조 분해 
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