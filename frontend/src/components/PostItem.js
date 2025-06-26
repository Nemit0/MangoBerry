// src/components/PostItem/PostItem.js
import React from 'react';
import './PostItem.css';

// onClick prop을 추가하고, div에 연결
function PostItem({ post, onClick }) { // <-- onClick prop 추가
    const descriptionParts = (post.description || '').split(', ');

    return (
        <div className="post-card" onClick={() => onClick(post)}> {/* <-- 클릭 이벤트 추가 */}
            <img src={post.image} alt={post.title} className="post-image" />
            <div className="post-info">
                <div className="post-header-meta">
                    <span className="post-user-icon">👤</span>
                    <span className="post-user-name">{post.user}</span>
                    <span className="post-category">{post.tags}</span>
                </div>
                <h3 className="post-title">{post.title}</h3>
                <div className="post-rating">
                    {'⭐'.repeat(post.rating)}
                </div>
                <div className="post-description-tags">
                    {descriptionParts[0] && <span className="tag-badge">{descriptionParts[0]}</span>}
                    {descriptionParts.length > 1 && descriptionParts[1] && (
                        <span className="tag-badge">{descriptionParts[1]}</span>
                    )}
                </div>
                <p className="post-content-preview">{post.content.substring(0, 70)}...</p>
            </div>
        </div>
    );
}

export default PostItem;