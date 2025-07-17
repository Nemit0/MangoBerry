import React, { useState, useEffect, use } from 'react';
import PostItem from '../components/PostItem';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import './PostList.css';

const API_URL = '/api';
const DEFAULT_IMAGE =
  'https://mangoberry-bucket.s3.ap-northeast-2.amazonaws.com/test/single/final_logo.jpg';

function PostList({ searchTerm, isMyPage, columns }) {
  /* ─────────────── state ─────────────── */
  const [posts, setPosts]               = useState([]);     // 모든 포스트
  const [filtered, setFiltered]         = useState([]);     // 검색 결과
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const { user } = useAuth();

  const userID = user?.user_id ?? null;

  /* ─────────────── initial fetch ───────────────
     빈 text 인자로 /search_review_es 호출 → ES에서 freq 기준 정렬 */
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        let url = `${API_URL}/search_review_es?size=50&sort=frequent`;
        if (userID) {
          url += `&viewer_id=${userID}`;  
        }
        const resp = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json.success) throw new Error(json.error ?? 'Unknown error');

        /* 1️⃣ 후처리: 빈 이미지 배열일 때 로고로 대체 */
        const sanitized = json.result.map((raw, idx) => ({
          id: raw.review_id ?? idx,                               // 안전용 id
          r_name: raw.restaurant_name ? [raw.restaurant_name] : [],
          title: raw.comments ? [raw.comments] : [],
          user: raw.nickname ?? 'Unknown',
          rating: raw.rating ?? 0,
          content: raw.review ?? '',
          datePosted: (raw.created_at ?? '').split('T')[0].replace(/-/g, '.'),
          images:
            Array.isArray(raw.images) && raw.images.length > 0
              ? raw.images
              : [DEFAULT_IMAGE],
          keywords: raw.keywords ?? [],
          restaurant_id: raw.restaurant_id,
          user_id: raw.user_id,
        }));

        setPosts(sanitized);
        setFiltered(sanitized);
      } catch (err) {
        console.error('[PostList] 초기 데이터 로드 실패:', err);
      }
    };

    fetchInitial();
  }, []);

  /* ─────────────── searchTerm 변경 시 필터 ─────────────── */
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      setFiltered(posts);
      return;
    }

    const q = searchTerm.toLowerCase();
    const res = posts.filter((p) => {
      const title   = p.title.join(' ').toLowerCase();
      const user    = p.user.toLowerCase();
      const content = p.content.toLowerCase();
      return title.includes(q) || user.includes(q) || content.includes(q);
    });

    setFiltered(res);
  }, [searchTerm, posts]);

  /* ─────────────── modal handlers ─────────────── */
  const handlePostClick = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  /* ─────────────── render ─────────────── */
  return (
    <div className="post-list-wrapper">
      <div className={`post-grid-container columns-${columns}`}>
        {filtered.length > 0 ? (
          filtered.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              onClick={handlePostClick}
              defaultImg={DEFAULT_IMAGE}   // 2️⃣ PostItem에 기본 이미지 전달
            />
          ))
        ) : (
          <p className="no-results">
            {searchTerm
              ? `"${searchTerm}"에 대한 검색 결과가 없습니다.`
              : '게시물이 없습니다.'}
          </p>
        )}
      </div>

      {selectedPost && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedPost={selectedPost}
          isMyPage={isMyPage}
        />
      )}
    </div>
  );
}

export default PostList;