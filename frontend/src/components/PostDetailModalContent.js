import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PostDetailModalContent.css';
import RatingDisplay from './RatingDisplay';

function PostDetailModalContent({ selectedPost, isMyPage }) {

    // 긍정 및 부정 키워드 분리
    const positiveKeywords = selectedPost.keywords ? selectedPost.keywords.filter(item => item.sentiment === 'positive').map(item => item.keyword) : [];
    const negativeKeywords = selectedPost.keywords ? selectedPost.keywords.filter(item => item.sentiment === 'negative').map(item => item.keyword) : [];

    // 리뷰 아이디
    const reviewId = selectedPost.id;

    console.log("Selected Post ID:", reviewId);

    const navigate = useNavigate();

    if (!selectedPost) return null; // selectedPost가 없으면 렌더링하지 않음

    const handleEditClick = () => {
        navigate(`/edit/${reviewId}`, {
            state: { post: selectedPost }
        });
        window.scrollTo(0, 0); // 페이지 상단으로 스크롤 이동
        window.location.reload(); // 페이지 새로고침
        console.log("Navigating to edit page for post ID:", reviewId);
    };

    return (
        <div className='post-detail-modal-content' style={{ display: 'flex' }}>
            {/* ⭐⭐ 좌측 영역: modal-left ⭐⭐ */}
            <div className="modal-left">
                {/* <div className='name-date'>
                    <p className="modal-user-name">{selectedPost.user}</p>
                    <p className="modal-date-posted">{selectedPost.datePosted}</p>
                </div> */}
                
                <div className="modal-post-images">
                    {selectedPost.images.map((image, index) => (
                        <img key={index} src={image} alt={`${selectedPost.title}-${index}`} className="modal-post-image" />
                    ))}
                </div>
            </div>

            {/* ⭐⭐ 우측 영역: modal-right ⭐⭐ */}
            <div className="modal-right">
                <RatingDisplay score={selectedPost.rating/10} width={50} height={50} />
                <h2 className="modal-post-restaurant-name">{selectedPost.r_name}</h2>
                
                <h3 className='modal-post-title'>{selectedPost.title}</h3>

                <div className='name-date'>
                    <p className="modal-user-name">@{selectedPost.user}</p>
                    <p className="modal-date-posted">{selectedPost.datePosted}</p>
                </div>

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
