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
        image: `https://via.placeholder.com/400x300?text=Post${i+1}+Detail`, // 모달에 보여줄 이미지 크기 조정
        description: '부드럽다, 맛있다, 육즙, 비싸다, 만족, 단축, 매콤, 고기가 꽉, 아쉬운 면, 진한 국물, 뜨거운 국물'.split(', ')[i % 12],
        content: `이것은 게시물 ${i + 1}의 상세 내용입니다. React 검색 기능 예시. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim minim minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, // 상세 내용을 더 길게
        tags: ['일식', '한식', '아시안', '양식', '카페'][i % 5],
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
            const descriptionMatch = (post.description || '').toLowerCase().includes(lowercasedSearchTerm);
            const tagsMatch = post.tags && Array.isArray(post.tags) &&
                              (post.tags || []).some(tag => (tag || '').toLowerCase().includes(lowercasedSearchTerm));

            return titleMatch || userMatch || contentMatch || descriptionMatch || tagsMatch;
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
                            <p><strong>태그:</strong> {selectedPost.tags}</p>
                            <p><strong>설명:</strong> {selectedPost.description}</p>
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