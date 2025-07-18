// src/pages/OthersPage.js
import Header from "../components/Header";
import PostList from "../components/PostList";
import './OthersPage.css';
import fox from '../assets/photo/fox.png';
import { useState } from 'react';

const UserInfo = ({ label, value }) => (
    <span className="user-info-item">
        <div className="info-label">{label}</div>
        <div className="info-value">{value}</div>
    </span>
);

const OthersPage = () => {
    const [isFollowing, setIsFollowing] = useState(false);

    const handleFollowClick = () => {
        setIsFollowing(!isFollowing);
    };

    return (
        <div className="otherspage-layout">
            <Header />
            <div className="otherspage-main-wrapper">
                <main className="otherspage-middle-area">
                    <div className="other-user-info">
                        <div className="user-info-left">
                            <div className="user-image">
                                <img src={fox} className="user-image" alt="No"/>
                            </div>
                            <div className="user-nickname">nick</div>
                        </div>
                        <div className="user-info-right">
                            <UserInfo label="팔로워" value={123} />
                            <UserInfo label="팔로우" value={456} />
                            <UserInfo label="게시물" value={789} />
                            <div className="follow-button">
                                <button onClick={handleFollowClick} className={isFollowing ? 'following' : ''}>
                                    {isFollowing ? 'following' : 'follow'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="other-user-post">
                        <div className="post-left-part">
                            <PostList />
                        </div>
                        <div className="post-right-part">
                            <div className="word-cloud-container">
                                {/* 워드 클라우드 컴포넌트가 여기에 들어갑니다. */}
                                <p>워드 클라우드</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

        </div>
    );
};
export default OthersPage;
