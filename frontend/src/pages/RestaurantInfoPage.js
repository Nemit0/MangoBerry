// src/pages/RestaurantInfoPage.js
import './RestaurantInfoPage.css';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import PostList from '../components/PostList';
import pork from '../assets/photo/porkCutlet_width.jpg';
import { useEffect, useState } from 'react';

const parseTags = (tagString) => {
    if (!tagString) return [];
    return tagString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
};

function RestaurantInfoPage () {
    // DB에서 데이터를 가져오는 함수 (예시)
    // 실제로는 API 호출 코드가 들어갑니다.
    const fetchRestaurantData = async () => {
        // --- DB 연결 부분 ---
        // 예: const response = await fetch('/api/restaurants/{restaurantId}');
        //     const data = await response.json();
        //     return data;
        // --------------------

        // 지금은 더미 데이터를 반환합니다.
        return {
            id: 1,
            name: '맛있는 돈까스',
            address: '서울시 강남구 테헤란로 123',
            image: pork, // 실제로는 이미지 URL을 받아옵니다.
            positiveKeywords: '바삭바삭, 육즙가득, 친절한',
            negativeKeywords: '웨이팅, 좁은 공간',
        };
    };

    const [restaurant, setRestaurant] = useState(null);

    useEffect(() => {
        // 컴포넌트가 마운트될 때 데이터를 가져옵니다.
        fetchRestaurantData().then(data => {
            setRestaurant(data);
        });
    }, []); // 빈 배열을 전달하여 한 번만 실행되도록 합니다.

    if (!restaurant) {
        return <div>로딩 중...</div>; // 데이터가 로드되기 전에 보여줄 UI
    }

    return (
        <div className='restaurantInfopage-layout'>
            <Header />
            <div className='main-content-wrapper'>
                <aside className='rIpage-left-sidebar'>
                    <LeftSidebar />
                </aside>
                
                <main className='rIpage-middle-area'>
                    <div className='rIpage-left-part'>
                        <div className='restaurant-info-container'>
                            <img src={restaurant.image} alt={restaurant.name} className='restaurant-image' />
                            <h2 className='restaurant-name'>{restaurant.name}</h2>
                            <p className='restaurant-address'>{restaurant.address}</p>
                            
                            <div className='keyword-section'>
                                <h3>긍정 키워드</h3>
                                <div className='keywords-positive'>
                                    {parseTags(restaurant.positiveKeywords).map((keyword, index) => (
                                        <span key={index}>{keyword}</span>
                                    ))}
                                </div>
                            </div>

                            <div className='keyword-section'>
                                <h3>부정 키워드</h3>
                                <div className='keywords-negative'>
                                    {parseTags(restaurant.negativeKeywords).map((keyword, index) => (
                                        <span key={index}>{keyword}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='rIpage-right-part'>
                        <PostList />
                    </div>
                </main>

                <aside className='rIpage-right-sidebar'>
                    <RightSidebar />
                </aside>
            </div>
        </div>
    )
};

export default RestaurantInfoPage;
