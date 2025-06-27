// src/components/PostList/PostList.js
import React, { useState, useEffect } from 'react';
import PostItem from '../components/PostItem';
import Modal from '../components/Modal'; // Modal 컴포넌트 임포트
import './PostList.css';

function PostList({ searchTerm }) {
    const allPosts = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `정돈 강남점 일식 ${i + 1}`,
        user: ['NICK', 'BOB', 'STEVE', 'EMILY', 'JOHN'][i % 5],
        rating: Math.floor(1 * 5) + 1, //Math.random()
        image: "../photo/porkCutlet_width.jpg", // 모달에 보여줄 이미지 크기 조정 https://via.placeholder.com/400x300?text=Post${i+1}+Detail
        positive: '부드럽다, 맛있다, 육즙, 싸다, 만족, 단축, 매콤, 고기가 꽉, 쫄깃한 면, 진한 국물, 뜨거운 국물',
        negative: '비싸다, 눅눅하다, 늦게 나온다, 달다, 짜다, 너무 맵다, 아쉬운 면, 맛없다, 더럽다, 불친절, 딱딱하다',
        content: `이것은 게시물 ${i + 1}의 상세 내용입니다. React 검색 기능 예시. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim minim minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, // 상세 내용을 더 길게
        datePosted: ["2025-06-23", "2025-06-24", "2025-06-25", "2025-06-26", "2025-06-27"][i % 5],
    }));

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
    }, [searchTerm, allPosts]);

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

    // ⭐⭐ 쉼표로 구분된 문자열을 배열로 변환하고 공백을 제거하는 헬퍼 함수 ⭐⭐
    const parseTags = (tagString) => {
        if (!tagString) return [];
        return tagString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
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
                <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
                    {/* 모달 내부에 표시할 상세 내용 */}
                    <div className="post-detail-modal-content">
                        <h2>{selectedPost.title}</h2>
                        <img src={selectedPost.image} alt={selectedPost.title} className="post-detail-image" />
                        <div className="post-detail-meta">
                            <p><strong>작성자:</strong> {selectedPost.user}</p>
                            <p><strong>별점:</strong> {'⭐'.repeat(selectedPost.rating)}</p>
                            <p><strong>작성일:</strong> {selectedPost.datePosted}</p>
                            {/* ⭐⭐ 긍정 태그 렌더링 부분 수정 ⭐⭐ */}
                            <div className='post-positive-tags'>
                                {/* parseTags 함수를 사용하여 문자열을 배열로 변환 후 map으로 순회 */}
                                {parseTags(selectedPost.positive).map((tag, index) => (
                                    <span key={index} className="positive-tag-badge">{tag}</span>
                                ))}
                            </div>
                            
                            {/* ⭐⭐ 부정 태그 렌더링 부분 수정 ⭐⭐ */}
                            <div className='post-negative-tags'>
                                {/* parseTags 함수를 사용하여 문자열을 배열로 변환 후 map으로 순회 */}
                                {parseTags(selectedPost.negative).map((tag, index) => (
                                    <span key={index} className="negative-tag-badge">{tag}</span>
                                ))}
                            </div>
                            
                        </div>
                        <p className="post-detail-content">{selectedPost.content}</p>
                        {/* 더 많은 상세 정보 추가 가능 */}
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default PostList;