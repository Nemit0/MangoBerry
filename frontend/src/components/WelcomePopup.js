// src/components/WelcomePopup.js
import React, { useState } from 'react';
import './WelcomePopup.css'; // 팝업 스타일

function WelcomePopup({ onClose }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [restaurantInputs, setRestaurantInputs] = useState([
        { name: '', review: '', address: '' },
        { name: '', review: '', address: '' },
        { name: '', review: '', address: '' },
    ]);

    // 식당 검색 (간단한 예시: 실제 지도 API 연동 필요)
    const mockRestaurantDatabase = {
        "강남 맛집": "서울시 강남구 테헤란로 123",
        "종로 식당": "서울시 종로구 종로 456",
        "홍대 카페": "서울시 마포구 독막로 789",
        "명동 칼국수": "서울시 중구 명동길 10",
        "부산 돼지국밥": "부산광역시 부산진구 부전동 123",
        "제주 흑돼지": "제주특별자치도 제주시 연동 456"
    };

    const handleRestaurantNameChange = (e, index) => {
        const newInputs = [...restaurantInputs];
        newInputs[index].name = e.target.value;

        // 식당명 입력 시 가상의 주소 매칭
        const matchedAddress = mockRestaurantDatabase[e.target.value];
        if (matchedAddress) {
            newInputs[index].address = matchedAddress;
        } else {
            newInputs[index].address = ''; // 일치하는 주소가 없으면 초기화
        }
        setRestaurantInputs(newInputs);
    };

    const handleReviewChange = (e, index) => {
        const newInputs = [...restaurantInputs];
        newInputs[index].review = e.target.value;
        setRestaurantInputs(newInputs);
    };

    const handleNext = () => {
        // 각 페이지별 유효성 검사 (선택 사항)
        if (currentPage === 1 && !restaurantInputs[0].name) {
            alert("첫 번째 식당 이름을 입력해주세요.");
            return;
        }
        if (currentPage === 2 && !restaurantInputs[1].name) {
            alert("두 번째 식당 이름을 입력해주세요.");
            return;
        }
        if (currentPage < 3) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        // 여기에서 수집된 데이터를 서버로 전송하거나 저장하는 로직 구현
        console.log("취향 정보 제출:", restaurantInputs);
        onClose(); // 팝업 닫기
    };

    const renderPageContent = () => {
        switch (currentPage) {
            case 1:
                return (
                    <div className="popup-page">
                        <h3>인상 깊었거나 최근에 간 식당 3곳을 알려주세요</h3>
                        <div className="input-group">
                            {/* <label htmlFor="restaurant1">식당명:</label> */}
                            <input
                                id="restaurant1"
                                type="text"
                                value={restaurantInputs[0].name}
                                onChange={(e) => handleRestaurantNameChange(e, 0)}
                                placeholder="식당 이름을 입력하세요"
                            />
                            {restaurantInputs[0].address && (
                                <p className="restaurant-address">주소: {restaurantInputs[0].address}</p>
                            )}
                        </div>
                        <div className="input-group">
                            {/* <label htmlFor="review1">리뷰:</label> */}
                            <textarea
                                id="review1"
                                value={restaurantInputs[0].review}
                                onChange={(e) => handleReviewChange(e, 0)}
                                placeholder="간단한 리뷰를 작성해주세요"
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="popup-page">
                        <h3>인상 깊었거나 최근에 간 식당 3곳을 알려주세요</h3>
                        <div className="input-group">
                            {/* <label htmlFor="restaurant2">식당명:</label> */}
                            <input
                                id="restaurant2"
                                type="text"
                                value={restaurantInputs[1].name}
                                onChange={(e) => handleRestaurantNameChange(e, 1)}
                                placeholder="식당 이름을 입력하세요"
                            />
                            {restaurantInputs[1].address && (
                                <p className="restaurant-address">주소: {restaurantInputs[1].address}</p>
                            )}
                        </div>
                        <div className="input-group">
                            {/* <label htmlFor="review2">리뷰:</label> */}
                            <textarea
                                id="review2"
                                value={restaurantInputs[1].review}
                                onChange={(e) => handleReviewChange(e, 1)}
                                placeholder="간단한 리뷰를 작성해주세요"
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="popup-page">
                        <h3>인상 깊었거나 최근에 간 식당 3곳을 알려주세요</h3>
                        <div className="input-group">
                            {/* <label htmlFor="restaurant3">식당명:</label> */}
                            <input
                                id="restaurant3"
                                type="text"
                                value={restaurantInputs[2].name}
                                onChange={(e) => handleRestaurantNameChange(e, 2)}
                                placeholder="식당 이름을 입력하세요"
                            />
                             {restaurantInputs[2].address && (
                                <p className="restaurant-address">주소: {restaurantInputs[2].address}</p>
                            )}
                        </div>
                        <div className="input-group">
                            {/* <label htmlFor="review3">리뷰:</label> */}
                            <textarea
                                id="review3"
                                value={restaurantInputs[2].review}
                                onChange={(e) => handleReviewChange(e, 2)}
                                placeholder="간단한 리뷰를 작성해주세요"
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        // 팝업 외부 클릭 방지: onClose가 `props`로 전달되지 않거나,
        // modal-overlay에 클릭 이벤트를 추가하지 않아 외부 클릭으로 닫히지 않도록 구현됩니다.
        <div className="welcome-popup-overlay">
            <div className="welcome-popup-content">
                <h2 className="popup-main-title">당신의 취향을 알려주세요</h2>
                
                {renderPageContent()}

                <div className="popup-navigation">
                    {/* 이전 버튼은 첫 페이지가 아닐 때만 표시 */}
                    {currentPage > 1 && (
                        <button onClick={handlePrev} className="popup-button prev-button">이전</button>
                    )}
                    
                    <span className="page-indicator">{currentPage} / 3</span>

                    {/* 다음 버튼은 마지막 페이지가 아닐 때만 표시 */}
                    {currentPage < 3 && (
                        <button onClick={handleNext} className="popup-button next-button">다음</button>
                    )}
                    {/* 완료 버튼은 마지막 페이지일 때만 표시 */}
                    {currentPage === 3 && (
                        <button onClick={handleSubmit} className="popup-button submit-button">완료</button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default WelcomePopup;