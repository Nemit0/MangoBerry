// src/components/RightSidebar.js
import React, { useState } from 'react';
import './RightSidebar.css';
import './RightSidebarMap.css'; // 지도 검색 탭 관련 스타일 임포트

function RightSidebar({ isMapPage, isSearchTabOpen, toggleSearchTab, onSearch, searchResults, currentKeyword, onResultItemClick }) {
    const [searchInputValue, setSearchInputValue] = useState(currentKeyword || '');

    // currentKeyword가 변경될 때마다 searchInputValue 동기화
    React.useEffect(() => {
        setSearchInputValue(currentKeyword || '');
    }, [currentKeyword]);

    const handleSearchButtonClick = () => {
        if (onSearch) {
            onSearch(searchInputValue);
        }
    };

    const handleResultClick = (place) => {
        if (onResultItemClick) {
            onResultItemClick(place); // MapPage의 onResultItemClick 함수 호출
        }
        console.log('Clicked place:', place);
        // 검색 결과 클릭 후 검색창을 닫거나 다른 UI 업데이트를 할 수 있습니다.
        // setIsSearchTabOpen(false); // 예시: 클릭 후 검색창 닫기
    };

    return (
        <div className="right-sidebar-container">
            {isMapPage ? (
                <div className="map-search-controls">
                    {/* "지도 내 검색" 버튼 */}
                    <button className="map-search-toggle-button" onClick={toggleSearchTab}>
                        지도 내 검색 <span className="icon">🔍</span>
                    </button>

                    {/* 검색 탭 (isSearchTabOpen 상태에 따라 조건부 렌더링) */}
                    {isSearchTabOpen && (
                        <div className="map-search-tab">
                            <div className="search-input-area">
                                <input
                                    type="text"
                                    placeholder="장소, 주소, 카테고리 검색..."
                                    value={searchInputValue}
                                    onChange={(e) => setSearchInputValue(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') handleSearchButtonClick();
                                    }}
                                />
                                <button onClick={handleSearchButtonClick}>검색</button>
                            </div>

                            <div className="filter-buttons">
                                {/* 실제 필터링 로직은 onSearch 함수 내에서 구현 필요 */}
                                <button>음식점</button>
                                <button>카페</button>
                                <button>관광명소</button>
                                <button>숙박</button>
                                <button>병원</button>
                                <button>은행</button>
                            </div>

                            <div className="search-results-list">
                                {searchResults.length > 0 ? (
                                    searchResults.map((place) => (
                                        <div key={place.id} className="search-result-item" onClick={() => handleResultClick(place)}>
                                            <p className="place-name">{place.place_name}</p>
                                            <p className="place-address">{place.address_name}</p>
                                            {place.phone && <p className="place-phone">{place.phone}</p>}
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-results-message">검색 결과가 없습니다.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* 기존 HomePage에서 보여주던 RightSidebar 내용 */}
                </>
            )}
        </div>
    );
}

export default RightSidebar;