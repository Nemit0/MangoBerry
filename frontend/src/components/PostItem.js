// src/components/PostItem.js
import React from 'react';
import './PostItem.css';
import RatingDisplay from './RatingDisplay';
import foxImage from '../assets/photo/circular_image.png';

// import { BiUser } from "react-icons/bi";

// onClick prop을 추가하고, div에 연결
function PostItem({ post, onClick }) { // <-- onClick prop 추가

    // 긍정 및 부정 키워드 분리
    const positiveKeywords = post.keywords ? post.keywords.filter(item => item.sentiment === 'positive').map(item => item.keyword) : [];
    const negativeKeywords = post.keywords ? post.keywords.filter(item => item.sentiment === 'negative').map(item => item.keyword) : [];

    // const gaugeWidth = post.rating; // 이 변수는 현재 사용되지 않음

    return (
        <div className="post-card" onClick={() => onClick(post)}> {/* <-- 클릭 이벤트 추가 */}
            
            <img src={post.images[0]} alt={post.title} className="post-image" />
            <div className="post-info">
                <div className="post-header-meta">
                    {/* 기존 <BiUser> 아이콘과 텍스트 아이콘 대신 이미지 사용 */}
                    <div className="post-user-image-container"> {/* 새로운 컨테이너 클래스 추가 */}
                        <img src={foxImage} alt="User Profile" className="post-profile-img" />
                    </div>
                    <span className="post-user-name">{post.user}</span>
                    <span className="post-datePosted">{post.datePosted}</span>
                </div>
                <h3 className="post-restaurant-name">{post.r_name}</h3>
                
                <RatingDisplay score={post.rating/10} width={15} height={15} />

                <h4 className="post-title">{post.title}</h4>
                
                
                <div className="post-positive-tags">
                    {positiveKeywords[0] && <span className="positive-tag-badge">{positiveKeywords[0]}</span>}
                    {positiveKeywords[1] && <span className="positive-tag-badge">{positiveKeywords[1]}</span>}
                    {positiveKeywords[2] && <span className="positive-tag-badge">{positiveKeywords[2]}</span>}
                </div>

                <div className="post-negative-tags">
                    {negativeKeywords[0] && <span className="negative-tag-badge">{negativeKeywords[0]}</span>}
                    {negativeKeywords[1] && <span className="negative-tag-badge">{negativeKeywords[1]}</span>}
                    {negativeKeywords[2] && <span className="negative-tag-badge">{negativeKeywords[2]}</span>}
                </div>
            </div>
        </div>
    );
}

export default PostItem;