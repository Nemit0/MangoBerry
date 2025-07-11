// src/components/PostList.js
import React, { useState, useEffect } from 'react';
import PostItem from '../components/PostItem';
import Modal from '../components/Modal'; // Modal 컴포넌트 임포트
import './PostList.css';
import porkCutlet from '../assets/photo/porkCutlet_width.jpg'
import curry from '../assets/photo/curry_height.JPG'

// 해결법 1: allPosts 배열을 컴포넌트 함수 바깥으로 이동
// 이렇게 하면 컴포넌트가 리렌더링 되어도 allPosts는 새로 생성되지 않습니다.
const allPosts = Array.from({ length: 50 }, (_, i) => {
    const imageSets = [
        [porkCutlet, curry],
        [curry],
        [porkCutlet],
        [curry, porkCutlet, curry],
        [porkCutlet, porkCutlet]
    ];
    return {
        id: 1,
        r_name: ['보영만두 강남점'],
        title: ['가까이 있기에, 바로 옆에 있기에, 날이 덥기에, 멀리 나가기 싫기에'],
        user: ['NICK', 'BOB', 'STEVE', 'EMILY', 'JOHN'][i % 5],
        rating: [1, 3, 5, 2, 4, 2.5, 4.5, 1.5, 3.5][i % 9],
        images: imageSets[i % 5], // 다중 이미지를 위한 배열
        keywords: [
            {
              "keyword": "적당한 식당",
              "sentiment": "positive"
            },
            {
              "keyword": "무난함",
              "sentiment": "positive"
            },
            {
              "keyword": "냉면 면 딱딱함",
              "sentiment": "negative"
            },
            {
              "keyword": "만두 밀가루 맛",
              "sentiment": "negative"
            }
          ],
        content: '그냥 한 끼를 때우기에는 적당한 식당이다. 무난하다. 근데 냉면 면은 살짝 딱딱한 느낌이었고 만두는 피에서 밀가루 맛이 났다.', // 상세 내용을 더 길게
        datePosted: ["2025-06-23", "2025-06-24", "2025-06-25", "2025-06-26", "2025-06-27"][i % 5],
    }
});

function PostList({ searchTerm, isMyPage }) {

    const [filteredPosts, setFilteredPosts] = useState(allPosts);
    const [isModalOpen, setIsModalOpen] = useState(false); // 모달 열림/닫힘 상태
    const [selectedPost, setSelectedPost] = useState(null); // 선택된 게시물 데이터

    useEffect(() => {
        if (!searchTerm || searchTerm.trim() === '') {
            setFilteredPosts(allPosts);
            return;
        }

        const lowercasedSearchTerm = searchTerm.toLowerCase();

        const results = allPosts.filter(post => {
            const titleMatch = (post.title || '').toLowerCase().includes(lowercasedSearchTerm);
            const userMatch = (post.user || '').toLowerCase().includes(lowercasedSearchTerm);
            const contentMatch = (post.content || '').toLowerCase().includes(lowercasedSearchTerm);
            const positiveMatch = (post.positive || '').toLowerCase().includes(lowercasedSearchTerm);
            const negativeMatch = (post.negative || '').toLowerCase().includes(lowercasedSearchTerm);

            return titleMatch || userMatch || contentMatch || positiveMatch || negativeMatch;
        });
        setFilteredPosts(results);
    // 해결법 2: useEffect 의존성 배열에서 allPosts 제거
    // 이제 이 useEffect는 searchTerm이 변경될 때만 실행됩니다.
    }, [searchTerm]);

    // PostItem 클릭 시 호출될 함수
    const handlePostClick = (post) => {
        setSelectedPost(post); // 클릭된 게시물 데이터 저장
        setIsModalOpen(true); // 모달 열기
    };

    // 모달 닫기 함수
    const handleCloseModal = () => {
        setIsModalOpen(false); // 모달 닫기
        setSelectedPost(null); // 선택된 게시물 초기화
    };

    return (
        <div className="post-list-wrapper">
            <div className="post-grid-container">
                {filteredPosts.length > 0 ? (
                    filteredPosts.map(post => (
                        <PostItem
                            key={post.id}
                            post={post}
                            onClick={handlePostClick} // PostItem에 클릭 핸들러 전달
                        />
                    ))
                ) : (
                    <p className="no-results">"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
                )}
            </div>
            
            {/* 모달 컴포넌트 렌더링 */}
            {selectedPost && ( // selectedPost가 null이 아닐 때만 렌더링
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} selectedPost={selectedPost} isMyPage={isMyPage} />
            )}
        </div>
    );
}

export default PostList;