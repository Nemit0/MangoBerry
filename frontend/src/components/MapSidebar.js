import React, { useState, useEffect, useRef } from 'react';
import './MapSidebar.css';
import { FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const categories = ['한식', '중식', '일식', '양식', '아시안', '씨푸드', '글로벌', '분식', '치킨/햄버거/피자'];
const preferenceFilters = ['취향률 90% 이상', '취향률 80% 이상', '취향률 70% 이상', '취향률 60% 이상'];

const followingList = [
    { id: 1, name: '팔로잉1', avatar: 'https://via.placeholder.com/40' },
    { id: 2, name: '팔로잉2', avatar: 'https://via.placeholder.com/40' },
    { id: 3, name: '팔로잉3', avatar: 'https://via.placeholder.com/40' },
    { id: 4, name: '팔로잉4', avatar: 'https://via.placeholder.com/40' },
    { id: 5, name: '팔로잉5', avatar: 'https://via.placeholder.com/40' },
    { id: 6, name: '팔로잉6', avatar: 'https://via.placeholder.com/40' },
    { id: 7, name: '팔로잉7', avatar: 'https://via.placeholder.com/40' },
    { id: 8, name: '팔로잉8', avatar: 'https://via.placeholder.com/40' },
    { id: 9, name: '팔로잉9', avatar: 'https://via.placeholder.com/40' },
    
];

const MapSidebar = ({ onSearch, searchResults, currentKeyword, onResultItemClick }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(currentKeyword || '');
    const [showSearchResults, setShowSearchResults] = useState(false); // 검색 결과 표시 여부 상태
    const searchBarRef = useRef(null); // 검색바 전체를 감싸는 div에 대한 ref

    useEffect(() => {
        setSearchInputValue(currentKeyword || '');
    }, [currentKeyword]);

    // 외부 클릭 감지하여 검색 결과 숨기기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [searchBarRef]);

    const handleSearchButtonClick = () => {
        if (onSearch) {
            onSearch(searchInputValue);
            setShowSearchResults(true); // 검색 버튼 클릭 시 결과 표시
        }
    };

    const handleResultClick = (place) => {
        if (onResultItemClick) {
            onResultItemClick(place); // MapPage의 onResultItemClick 함수 호출
        }
        console.log('Clicked place:', place);
        setShowSearchResults(false); // 결과 클릭 시 결과 숨기기
    };
    

    return (
        <div className={`map-sidebar-container ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-content">
                <h2 className="sidebar-title">지도 내 검색</h2>
                
                <div className="sidebar-search-bar" ref={searchBarRef}> {/* ref 추가 */}
                    <input 
                        type="text" 
                        placeholder="장소, 주소 검색"
                        value={searchInputValue}
                        onChange={(e) => setSearchInputValue(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSearchButtonClick();
                            }
                        }}
                        onFocus={() => setShowSearchResults(true)} // 검색창 포커스 시 결과 표시
                    />
                    <button onClick={handleSearchButtonClick} className="search-icon-button"><FaSearch /></button>

                    {showSearchResults && (searchResults.length > 0 ? (
                        <div className="search-results-list">
                            {searchResults.map((place) => (
                                <div key={place.id} className="search-result-item" onClick={() => handleResultClick(place)}>
                                    <p className="place-name">{place.place_name}</p>
                                    <p className="place-address">{place.address_name}</p>
                                    {place.phone && <p className="place-phone">{place.phone}</p>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        searchInputValue && (
                            <div className="search-results-list">
                                <p className="no-results-message">검색 결과가 없습니다.</p>
                            </div>
                        )
                    ))}
                </div>

                <h3 className="sidebar-subtitle">카테고리</h3>
                <div className="sidebar-filter-group">
                    {categories.map(category => (
                        <button key={category} className="sidebar-custom-button">{category}</button>
                    ))}
                </div>

                <h3 className="sidebar-subtitle">취향률</h3>
                <div className="sidebar-filter-group">
                    {preferenceFilters.map(filter => (
                        <button key={filter} className="sidebar-custom-button sidebar-custom-button-like">{filter}</button>
                    ))}
                </div>

                <h3 className="sidebar-subtitle">팔로잉</h3>
                <ul className="sidebar-following-list">
                    {followingList.map(user => (
                        <li key={user.id} className="following-item">
                            <img src={user.avatar} alt={user.name} className="following-avatar" />
                            <span className="following-name">{user.name}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="sidebar-toggle-button">
                {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
                
            </button>
        </div>
    );
};

export default MapSidebar;

