import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PostDetailModalContent.css';

function PostDetailModalContent({ selectedPost, isMyPage }) {

    // 긍정 및 부정 키워드 분리
    const positiveKeywords = selectedPost.keywords ? selectedPost.keywords.filter(item => item.sentiment === 'positive').map(item => item.keyword) : [];
    const negativeKeywords = selectedPost.keywords ? selectedPost.keywords.filter(item => item.sentiment === 'negative').map(item => item.keyword) : [];

    const navigate = useNavigate();

    if (!selectedPost) return null; // selectedPost가 없으면 렌더링하지 않음

    const handleEditClick = () => {
        navigate('/edit');
    };

    return (
        <div className='post-detail-modal-content' style={{ display: 'flex' }}>
            {/* ⭐⭐ 좌측 영역: modal-left ⭐⭐ */}
            <div className="modal-left">
                <div className='name-date'>
                    <p className="modal-user-name">{selectedPost.user}</p>
                    <p className="modal-date-posted">{selectedPost.datePosted}</p>
                </div>
                
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
                <h2 className="modal-post-restaurant-name">{selectedPost.r_name}</h2>
                
                <h3 className='modal-post-title'>{selectedPost.title}</h3>

                {/* post-positive-tags */}
                <div className="modal-post-positive-tags">
                    {positiveKeywords.map((tag, index) => (
                        <span key={index} className="modal-positive-tag-badge">{tag}</span>
                    ))}
                </div>

                {/* post-negative-tags */}
                <div className="modal-post-negative-tags">
                    {negativeKeywords.map((tag, index) => (
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
