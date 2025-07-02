// src/pages/MapPage/MapPage.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import Button from '../components/Button'; // Button 컴포넌트 임포트
import { TbMapSearch } from "react-icons/tb"; // 지도 내 검색 아이콘 임포트
import '../pages/HomePage.css';
import './MapPage.css';

const KAKAO_MAP_APP_KEY = process.env.REACT_APP_KAKAO_MAP_APP_KEY; // ⭐⭐ 실제 키로 교체 ⭐⭐

function MapPage() {
    const mapContainer = useRef(null);
    const mapInstance = useRef(null);
    const ps = useRef(null); // Places service for search
    const markersRef = useRef([]); // To manage markers on the map

    // States for RightSidebar search functionality
    const [isSearchTabOpen, setIsSearchTabOpen] = useState(false); // 검색 탭 열림/닫힘 상태
    const [searchResults, setSearchResults] = useState([]); // 검색 결과 목록
    const [keyword, setKeyword] = useState(''); // 현재 검색어

    // Function to fetch current location using ipinfo.io
    const fetchCurrentLocation = useCallback(async () => {
        const url = 'http://ipinfo.io/json';
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.loc) {
                const [lat, lng] = data.loc.split(',');
                console.log(`Fetched location: Lat ${lat}, Lng ${lng}, City: ${data.city}`);
                return new window.kakao.maps.LatLng(parseFloat(lat), parseFloat(lng));
            } else {
                console.warn("Location data ('loc') not found in ipinfo.io response. Using default center.");
                return null;
            }
        } catch (error) {
            console.error("Error fetching current location from ipinfo.io:", error);
            return new window.kakao.maps.LatLng(37.566826, 126.9786567); // Default to Seoul City Hall
        }
    }, []);

    // Kakao Map Initialization and Location Fetch
    useEffect(() => {
        const loadKakaoMapAndInit = async () => {
            if (window.kakao && window.kakao.maps) {
                await initializeMap();
                return;
            }

            const script = document.createElement('script');
            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_APP_KEY}&libraries=services,clusterer,drawing&autoload=false`;
            script.async = true;
            document.head.appendChild(script);

            script.onload = async () => {
                window.kakao.maps.load(async () => {
                    await initializeMap();
                });
            };

            script.onerror = (error) => {
                console.error("Kakao Map SDK load failed:", error);
                alert("Failed to load Kakao Map. Please check API key or network status.");
            };
        };

        const initializeMap = async () => {
            if (mapContainer.current && window.kakao && window.kakao.maps) {
                const initialCenter = await fetchCurrentLocation();
                const defaultCenter = new window.kakao.maps.LatLng(33.450701, 126.570667); // Kakao HQ

                const options = {
                    center: initialCenter || defaultCenter,
                    level: 3,
                };
                mapInstance.current = new window.kakao.maps.Map(mapContainer.current, options);
                ps.current = new window.kakao.maps.services.Places(); // Initialize Places service
                console.log("Kakao Map initialized with fetched/default center.");
            } else {
                console.warn("Map container not ready or Kakao Maps API not available for initialization.");
            }
        };

        loadKakaoMapAndInit();

        return () => {
            const script = document.querySelector(`script[src*="appkey=${KAKAO_MAP_APP_KEY}"]`);
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, [fetchCurrentLocation]);

    // Place Display Function (from previous implementations)
    const displayPlaces = useCallback((places) => {
        const map = mapInstance.current;
        if (!map || !window.kakao || !window.kakao.maps) return;

        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        const imageSrc = 'https://cdn-icons-png.flaticon.com/512/3082/3082365.png'; //
        const bounds = new window.kakao.maps.LatLngBounds();

        for (let i = 0; i < places.length; i++) {
            const place = places[i];
            const imageSize = new window.kakao.maps.Size(36, 37);
            const imgOptions = {
                spriteSize: new window.kakao.maps.Size(36, 691),
                spriteOrigin: new window.kakao.maps.Point(0, (i * 46) + 10),
                offset: new window.kakao.maps.Point(13, 37)
            };

            const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imgOptions);
            const marker = new window.kakao.maps.Marker({
                map: map,
                position: new window.kakao.maps.LatLng(place.y, place.x),
                image: markerImage
            });

            const infowindow = new window.kakao.maps.InfoWindow({
                zIndex: 1,
                content: `<div style="padding:5px;font-size:12px;">${place.place_name}</div>`
            });

            window.kakao.maps.event.addListener(marker, 'mouseover', function() {
                infowindow.open(map, marker);
            });
            window.kakao.maps.event.addListener(marker, 'mouseout', function() {
                infowindow.close();
            });
            window.kakao.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map, marker);
                console.log('Marker clicked:', place);
            });

            markersRef.current.push(marker);
            bounds.extend(new window.kakao.maps.LatLng(place.y, place.x));
        }

        if (places.length > 0) {
            map.setBounds(bounds);
        }
    }, []);

    // Search Places Function (passed to RightSidebar)
    const searchPlaces = useCallback((searchKeyword) => {
        if (!ps.current || !mapInstance.current || !window.kakao || !window.kakao.maps) {
            console.error("Kakao Maps Places service or map not initialized, or API not loaded.");
            alert("Map service is not ready. Please try again shortly.");
            return;
        }
        if (!searchKeyword.trim()) {
            alert('Please enter a search term!');
            return;
        }

        setKeyword(searchKeyword);

        ps.current.keywordSearch(searchKeyword, (data, status, pagination) => {
            if (status === window.kakao.maps.services.Status.OK) {
                setSearchResults(data);
                displayPlaces(data);
            } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                setSearchResults([]);
                displayPlaces([]);
                alert('No search results found.');
            } else if (status === window.kakao.maps.services.Status.ERROR) {
                alert('An error occurred during search.');
            }
        });
    }, [displayPlaces]);

    // Function to toggle search tab (passed to RightSidebar)
    const toggleSearchTab = () => {
        setIsSearchTabOpen(prev => !prev);
    };

    const handleMapSearch = () => {
        alert('지도 내 검색 기능을 실행합니다!');
        // 실제 검색 로직 또는 모달 호출 (미완완)
    };

    return (
        <div className="homepage-layout">
            <Header searchTerm="" onSearchChange={() => {}} />

            <div className="main-content-wrapper">
                <aside className="left-sidebar">
                    {/* MapPage에서는 LeftSidebar의 아이콘 그룹은 동일하게 유지됩니다. */}
                    <LeftSidebar />
                </aside>

                <main className="middle-map-area">
                    <div
                        ref={mapContainer}
                        style={{ width: '100%', height: '100%' }}
                    ></div>
                    <div style={{
                        position: 'absolute', // 부모 요소 (main) 기준으로 위치 지정
                        top: '20px', // main 태그 상단에서 20px 아래
                        right: '20px', // main 태그 우측에서 20px 왼쪽
                        zIndex: 100 // 다른 콘텐츠 위에 오도록 z-index 설정
                    }}>
                        <Button
                            className="icon-button" // Button.css에 정의된 원형 아이콘 스타일 사용
                            icon={TbMapSearch}
                            onClick={handleMapSearch}
                            ariaLabel="지도 내 검색"
                        />
                    </div>
                </main>

                <aside className="right-sidebar">
                    <RightSidebar
                        isMapPage={true} // Indicate that it's a MapPage
                        isSearchTabOpen={isSearchTabOpen} // Pass search tab state
                        toggleSearchTab={toggleSearchTab} // Pass toggle function
                        onSearch={searchPlaces} // Pass search function
                        searchResults={searchResults} // Pass search results
                        currentKeyword={keyword} // Pass current keyword
                        onResultItemClick={(place) => {
                            if (mapInstance.current && window.kakao && window.kakao.maps) {
                                mapInstance.current.setCenter(new window.kakao.maps.LatLng(place.y, place.x));
                            }
                        }}
                    />
                </aside>
            </div>
        </div>
    );
}

export default MapPage;