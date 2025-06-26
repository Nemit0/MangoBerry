// src/components/Button.js
import React from 'react';
import './Button.css'; // Button 전용 CSS

function Button({ children, onClick, className = '' }) {
    return (
        <button className={`custom-button ${className}`} onClick={onClick}>
            {children}
        </button>
    );
}

export default Button;