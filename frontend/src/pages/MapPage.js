// src/pages/MapPage/MapPage.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import MapSidebar from '../components/MapSidebar'; // 지도 사이드바 컴포넌트 임포트
import '../pages/HomePage.css'; // 홈 페이지 CSS 임포트 (공통 스타일)
import './MapPage.css'; // 지도 페이지 전용 CSS 임포트
import MapMarker from '../assets/photo/MapMarker_36.png';

// 카카오 지도 API 키를 환경 변수에서 가져옴
const KAKAO_MAP_APP_KEY = process.env.REACT_APP_KAKAO_MAP_APP_KEY;
const API_URL = "/api";

const dummyPlaces = [
    { place_name: '강남역', y: 37.497935, x: 127.027619 },
    { place_name: '여의도역', y: 37.521736, x: 126.924053 },
    { place_name: 'IFC몰 여의도점', y: 37.525076, x: 126.925908 },
    { place_name: '경복궁', y: 37.584804, x: 126.978392 },
    { place_name: '서울역', y: 37.554683, x: 126.971728 },
];

function MapPage() {
    // 지도 컨테이너 DOM 요소를 참조하기 위한 ref
    const mapContainer = useRef(null);
    // 카카오 맵 인스턴스를 저장하기 위한 ref
    const mapInstance = useRef(null);
    // 카카오 장소 검색 서비스 인스턴스를 저장하기 위한 ref
    // const ps = useRef(null);
    // 지도에 표시된 마커들을 관리하기 위한 ref 배열
    const markersRef = useRef([]);

    // 검색 결과 목록을 저장하는 상태
    const [searchResults, setSearchResults] = useState([]);
    // 현재 검색어를 저장하는 상태
    const [keyword, setKeyword] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // 현재 위치를 가져오는 함수 (Geolocation API 우선 사용, 실패 시 ipinfo.io 폴백)
    const fetchCurrentLocation = useCallback(async () => {
        return new Promise((resolve) => {
            // 브라우저에서 Geolocation API를 지원하는지 확인
            if (navigator.geolocation) {
                // 현재 위치 가져오기 시도
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude; // 위도
                        const lng = position.coords.longitude; // 경도
                        console.log(`Geolocation fetched: Lat ${lat}, Lng ${lng}`);
                        // 카카오 맵 LatLng 객체로 변환하여 반환
                        resolve(new window.kakao.maps.LatLng(lat, lng));
                    },
                    (error) => {
                        console.error("Error getting geolocation:", error);
                        // Geolocation 실패 시 ipinfo.io를 통해 위치 가져오기
                        fetchFromIpInfo().then(resolve);
                    },
                    // Geolocation 옵션: 높은 정확도, 타임아웃, 캐시 사용 안 함
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                console.warn("Geolocation is not supported by this browser. Falling back to ipinfo.io.");
                // Geolocation 미지원 시 ipinfo.io를 통해 위치 가져오기
                fetchFromIpInfo().then(resolve);
            }
        });
    }, []);

    // ipinfo.io를 통해 현재 위치를 가져오는 보조 함수
    const fetchFromIpInfo = async () => {
        const url = 'http://ipinfo.io/json';
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.loc) {
                const [lat, lng] = data.loc.split(',');
                console.log(`Fetched location from ipinfo.io: Lat ${lat}, Lng ${lng}, City: ${data.city}`);
                return new window.kakao.maps.LatLng(parseFloat(lat), parseFloat(lng));
            } else {
                console.warn("Location data ('loc') not found in ipinfo.io response. Using default center.");
                // 위치 데이터가 없을 경우 서울 시청을 기본값으로 설정
                return new window.kakao.maps.LatLng(37.566826, 126.9786567);
            }
        } catch (error) {
            console.error("Error fetching current location from ipinfo.io:", error);
            // 에러 발생 시 서울 시청을 기본값으로 설정
            return new window.kakao.maps.LatLng(37.566826, 126.9786567);
        }
    };

    // 카카오 맵 초기화 및 위치 가져오기 로직 (컴포넌트 마운트 시 한 번 실행)
    useEffect(() => {
        const loadKakaoMapAndInit = async () => {
            // 이미 카카오 맵 API가 로드되어 있다면 바로 초기화
            if (window.kakao && window.kakao.maps) {
                await initializeMap();
                return;
            }

            // 카카오 맵 스크립트 동적 생성 및 로드
            const script = document.createElement('script');
            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_APP_KEY}&libraries=services,clusterer,drawing&autoload=false`;
            script.async = true; // 비동기 로드
            document.head.appendChild(script);

            // 스크립트 로드 완료 시 콜백
            script.onload = async () => {
                // 카카오 맵 라이브러리 로드 완료 후 지도 초기화
                window.kakao.maps.load(async () => {
                    await initializeMap();
                });
            };

            // 스크립트 로드 실패 시 에러 처리
            script.onerror = (error) => {
                console.error("Kakao Map SDK load failed:", error);
                alert("Failed to load Kakao Map. Please check API key or network status.");
            };
        };

        // 지도 초기화 함수
        const initializeMap = async () => {
            // 지도 컨테이너와 카카오 맵 API가 준비되었는지 확인
            if (mapContainer.current && window.kakao && window.kakao.maps) {
                const initialCenter = await fetchCurrentLocation(); // 현재 위치 가져오기
                const defaultCenter = new window.kakao.maps.LatLng(33.450701, 126.570667); // 카카오 본사 (기본값)

                const options = {
                    center: initialCenter || defaultCenter, // 현재 위치 또는 기본값으로 지도 중심 설정
                    level: 3, // 지도 확대 레벨
                };
                // 카카오 맵 인스턴스 생성
                mapInstance.current = new window.kakao.maps.Map(mapContainer.current, options);

                // 현재 위치 마커 표시
                if (initialCenter) {
                    const currentLocationMarker = new window.kakao.maps.Marker({
                        map: mapInstance.current, // 지도 인스턴스
                        position: initialCenter, // 마커 위치
                    });

                    const infowindow = new window.kakao.maps.InfoWindow({
                        content: '<div style="padding:5px;font-size:12px;">현재 내 위치</div>', // 정보창 내용
                    });

                    infowindow.open(mapInstance.current, currentLocationMarker); // 정보창 열기
                }

                console.log("Kakao Map initialized with fetched/default center.");
            } else {
                console.warn("Map container not ready or Kakao Maps API not available for initialization.");
            }
        };

        loadKakaoMapAndInit(); // 카카오 맵 로드 및 초기화 시작

        // 컴포넌트 언마운트 시 스크립트 제거 (클린업)
        return () => {
            const script = document.querySelector(`script[src*="appkey=${KAKAO_MAP_APP_KEY}"]`);
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, [fetchCurrentLocation]); // fetchCurrentLocation 함수가 변경될 때만 다시 실행

    // 장소들을 지도에 표시하는 함수
    const displayPlaces = useCallback((places) => {
        const map = mapInstance.current;
        if (!map || !window.kakao || !window.kakao.maps) return;

        // 기존 마커들 제거
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // 마커 이미지 설정
        const imageSrc = MapMarker;
        const bounds = new window.kakao.maps.LatLngBounds(); // 지도를 재설정할 범위 객체

        for (let i = 0; i < places.length; i++) {
            const place = places[i];
            const imageSize = new window.kakao.maps.Size(36, 36); // 마커 이미지 크기
            const imgOptions = {
                offset: new window.kakao.maps.Point(13, 36) // 마커 이미지의 기준점
            };

            // 마커 이미지 생성
            const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imgOptions);
            // 마커 생성
            const marker = new window.kakao.maps.Marker({
                map: map, // 마커를 표시할 지도
                position: new window.kakao.maps.LatLng(place.y, place.x), // 마커 위치
                image: markerImage // 마커 이미지
            });

            // 정보창 생성
            const infowindow = new window.kakao.maps.InfoWindow({
                zIndex: 1,
                content: `<div style="padding:5px;font-size:12px;">${place.place_name}</div>` // 정보창 내용
            });

            // 마커에 마우스오버 이벤트 리스너 추가
            window.kakao.maps.event.addListener(marker, 'mouseover', function() {
                infowindow.open(map, marker);
            });
            // 마커에 마우스아웃 이벤트 리스너 추가
            window.kakao.maps.event.addListener(marker, 'mouseout', function() {
                infowindow.close();
            });
            // 마커에 클릭 이벤트 리스너 추가
            window.kakao.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map, marker);
                console.log('Marker clicked:', place);
            });

            markersRef.current.push(marker); // 생성된 마커를 배열에 추가
            bounds.extend(new window.kakao.maps.LatLng(place.y, place.x)); // 범위 확장
        }

        // 검색 결과가 있을 경우 지도의 중심과 확대 레벨 조정
        if (places.length > 0) {
            map.setBounds(bounds);
        }
    }, []);

    // 장소 검색 함수 (MapSidebar로 전달)
    const searchPlaces = useCallback((searchKeyword) => {
        // 검색어가 비어있는지 확인
        if (!searchKeyword.trim()) {
            alert('Please enter a search term!');
            return;
        }

        setKeyword(searchKeyword); // 검색어 상태 업데이트

        // 더미 데이터에서 검색
        const filteredPlaces = dummyPlaces.filter(place =>
            place.place_name.includes(searchKeyword)
        );

        if (filteredPlaces.length > 0) {
            setSearchResults(filteredPlaces); // 검색 결과 상태 업데이트
            displayPlaces(filteredPlaces); // 검색 결과 지도에 표시
        } else {
            setSearchResults([]); // 검색 결과 없음
            displayPlaces([]); // 마커 제거
            alert('No search results found.');
        }
    }, [displayPlaces]); // displayPlaces 함수가 변경될 때만 다시 실행

    return (
        <div className="map-page-layout">
            <div className="map-content-wrapper">
                {/* 지도 사이드바 컴포넌트 */}
                <MapSidebar
                    onSearch={searchPlaces} // 검색 함수 전달
                    searchResults={searchResults} // 검색 결과 전달
                    currentKeyword={keyword} // 현재 검색어 전달
                    onResultItemClick={(place) => { // 검색 결과 항목 클릭 시 지도 중심 이동
                        if (mapInstance.current && window.kakao && window.kakao.maps) {
                            mapInstance.current.setCenter(new window.kakao.maps.LatLng(place.y, place.x));
                        }
                    }}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
                {/* 지도 영역 */}
                <main id="map" className="map-area" ref={mapContainer}></main>
                <button className="mobile-sidebar-toggle-button" onClick={() => setIsSidebarOpen(true)}>
                    탐색
                </button>
            </div>
        </div>
    );
}

export default MapPage;