// src/components/LoadingSpinner.js
import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = () => {
  const numBars = 12; // 막대의 개수
  const barElements = [];

  for (let i = 0; i < numBars; i++) {
    const rotation = i * (360 / numBars);
    const delay = i * 0.1; // 각 막대의 애니메이션 지연 시간
    const opacity = 1 - (i / numBars) * 0.8; // 색상 변화를 위한 초기 투명도 (짙은 보라 -> 옅은 보라)

    barElements.push(
      <div
        key={i}
        className="spinner-bar"
        style={{
          transform: `rotate(${rotation}deg) translate(0, -37.5px)`, /* 원의 중심에서 바깥으로 이동 */
          backgroundColor: `hsl(270, 70%, ${30 + (i * (60 / numBars))}%)`, /* 보라색 계열 색상 변화 */
          animationDelay: `${delay}s`,
          opacity: opacity, /* 초기 투명도 설정 */
        }}
      />
    );
  }

  return (
    <div className="spinner-overlay">
      <div className="spinner">
        {barElements}
      </div>
    </div>
  );
};

export default LoadingSpinner;