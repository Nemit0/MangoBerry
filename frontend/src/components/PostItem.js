// src/components/PostItem/PostItem.js
import React from 'react';
import './PostItem.css';
// import { BiUser } from "react-icons/bi";

// onClick prop을 추가하고, div에 연결
function PostItem({ post, onClick }) { // <-- onClick prop 추가
    const positiveParts = (post.positive || '').split(', ');
    const negativeParts = (post.negative || '').split(', ');

    const gaugeWidth = (post.rating / 5) * 100; // 백분율로 계산

    return (
        <div className="post-card" onClick={() => onClick(post)}> {/* <-- 클릭 이벤트 추가 */}
            <div className='post-rating-container'>
                <div
                    className='post-rating-gauge'
                    style={{width: `${gaugeWidth}%`}} // 계산된 너비 적용
                ></div>
            </div>
            
            {/* <div className="post-rating">
                    {'⭐'.repeat(post.rating)}
            </div> */}
            <img src={post.image} alt={post.title} className="post-image" />
            <div className="post-info">
                <div className="post-header-meta">
                    {/*<BiUser className="post-user-icon"/> */}
                    <span className="post-user-icon">👤</span>
                    <span className="post-user-name">{post.user}</span>
                    <span className="post-datePosted">{post.datePosted}</span>
                </div>
                <h3 className="post-title">{post.title}</h3>
                
                <div className="post-positive-tags">
                    {positiveParts[0] && <span className="positive-tag-badge">{positiveParts[0]}</span>}
                    {positiveParts[1] && <span className="positive-tag-badge">{positiveParts[1]}</span>}
                    {positiveParts[2] && <span className="positive-tag-badge">{positiveParts[2]}</span>}
                    {/* {positiveParts.length > 1 && positiveParts[1] && (
                        <span className="positive-tag-badge">{positiveParts[1]}</span>
                    )} */}
                </div>
                <div className="post-negative-tags">
                    {negativeParts[0] && <span className="negative-tag-badge">{negativeParts[0]}</span>}
                    {negativeParts[1] && <span className="negative-tag-badge">{negativeParts[1]}</span>}
                    {negativeParts[2] && <span className="negative-tag-badge">{negativeParts[2]}</span>}

                    {/* {negativeParts.length > 1 && negativeParts[1] && (
                        <span className="negative-tag-badge">{negativeParts[1]}</span>
                    )} */}
                </div>
                <p className="post-content-preview">{post.content.substring(0, 70)}...</p>
            </div>
        </div>
    );
}

export default PostItem;