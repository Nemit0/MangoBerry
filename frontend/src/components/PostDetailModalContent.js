import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PostDetailModalContent.css';

// ⭐⭐ 쉼표로 구분된 문자열을 배열로 변환하고 공백을 제거하는 헬퍼 함수 ⭐⭐
const parseTags = (tagString) => {
    if (!tagString) return [];
    return tagString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
};

function PostDetailModalContent({ selectedPost, isMyPage }) {
    const navigate = useNavigate();

    if (!selectedPost) return null; // selectedPost가 없으면 렌더링하지 않음

    const handleEditClick = () => {
        navigate('/edit');
    };

    return (
        <div className='post-detail-modal-content' style={{ display: 'flex' }}>
            {/* ⭐⭐ 좌측 영역: modal-left ⭐⭐ */}
            <div className="modal-left">
                <p className="modal-user-name"><strong>작성자:</strong> {selectedPost.user}</p>
                <div className="modal-post-images">
                    {selectedPost.images.map((image, index) => (
                        <img key={index} src={image} alt={`${selectedPost.title}-${index}`} className="modal-post-image" />
                    ))}
                </div>
            </div>

            {/* ⭐⭐ 우측 영역: modal-right ⭐⭐ */}
            <div className="modal-right">
                <div className="modal-rating-gauge">
                    <div className='modal-rating-header'>
                        <strong>별점:</strong>
                        <span className="modal-rating-text">
                            {((selectedPost.rating / 5) * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div className="modal-gauge-container">
                        <div
                            className="modal-gauge-bar"
                            style={{ width: `${(selectedPost.rating / 5) * 100}%` }}
                        >
                        </div>
                    </div>

                </div>
                <h2 className="modal-post-title">{selectedPost.title}</h2>
                <p className="modal-date-posted"><strong>작성일:</strong> {selectedPost.datePosted}</p>

                {/* post-positive-tags */}
                <div className="modal-post-positive-tags">
                    {parseTags(selectedPost.positive).map((tag, index) => (
                        <span key={index} className="modal-positive-tag-badge">{tag}</span>
                    ))}
                </div>

                {/* post-negative-tags */}
                <div className="modal-post-negative-tags">
                    {parseTags(selectedPost.negative).map((tag, index) => (
                        <span key={index} className="modal-negative-tag-badge">{tag}</span>
                    ))
                    }
                </div>

                <p className="modal-post-content">{selectedPost.content}</p>
                {isMyPage && (
                    <div className="modal-actions-container">
                        <button className="modal-edit-button" onClick={handleEditClick}>
                            편집
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PostDetailModalContent;
