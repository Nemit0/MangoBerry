import React, { useState } from 'react';
import './WelcomePopup.css';
import { useAuth } from '../contexts/AuthContext'; // useAuth import

const keywords = {
  '맛': ['#인생 맛집', '#존맛탱', '#깊은 맛', '#감칠맛', '#쫄깃함', '#바삭함', '#신선한 재료', '#딱 맞는 간', '#매운 맛', '#건강한 맛', '#비건', '#고소한 맛'],
  '가격': ['#가성비', '#합리적인 가격', '#푸짐한 양', '#저렴한 가격'],
  '분위기': ['#데이트 분위기', '#인스타 감성', '#조용한 분위기', '#아늑함', '#편안함', '#뷰맛집', '#세련된 디자인', '#이쁜 플레이팅', '#대화하기 좋다', '#사진이 잘나온다', '#혼밥하기 좋은'],
  '서비스': ['#친절함', '#빠른 응대', '#세심한 배려', '#사장님이 기억해줌'],
  '위생/청결': ['#깨끗함', '#청결함', '#위생적', '#깨끗한 화장실'],
  '특별한 경험': ['#숨겨진 맛집', '#이색적인 메뉴', '#기념일에 좋음', '#모임 장소로 최고', '#나만 알고 싶은 곳', '#또 오고 싶은 곳', '#재방문 의사 100%'],
};

function WelcomePopup({ onClose }) {
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const { user } = useAuth(); // Get user info

  const handleKeywordClick = (keyword) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) 
        ? prev.filter(k => k !== keyword) 
        : [...prev, keyword]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (selectedKeywords.length === 0) {
      alert('키워드를 하나 이상 선택해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/user/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.user_id, 
          keywords: selectedKeywords 
        }),
      });

      if (response.ok) {
        console.log('Keywords submitted successfully:', selectedKeywords);
        onClose();
      } else {
        const errorData = await response.json();
        alert(`키워드 저장에 실패했습니다: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error submitting keywords:', error);
      alert('키워드 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="welcome-popup-overlay">
      <div className="welcome-popup-content">
        <h2 className="popup-main-title">찾고 싶은 식당의 키워드를 선택해주세요</h2>
        <div className="keyword-sections">
          {Object.entries(keywords).map(([category, keywordsList]) => (
            <div key={category} className="keyword-category">
              <h3>{category}</h3>
              <div className="keyword-buttons">
                {keywordsList.map(keyword => (
                  <button 
                    key={keyword} 
                    className={`keyword-button ${selectedKeywords.includes(keyword) ? 'selected' : ''}`}
                    onClick={() => handleKeywordClick(keyword)}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="popup-actions">
          <button onClick={handleSubmit} className="popup-button submit-button">선택 완료</button>
          <button onClick={onClose} className="popup-button skip-button">건너뛰기</button>
        </div>
      </div>
    </div>
  );
}

export default WelcomePopup;
