import React from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import PostList from "../components/PostList";
import './MyPage.css';

// 클릭 가능한 UserInfo 컴포넌트
const UserInfo = ({ label, value, onClick }) => (
  <span
    className="user-info-item"
    onClick={onClick}
    style={{ cursor: onClick ? "pointer" : "default" }}
  >
    <div className="info-label">{label}</div>
    <div className="info-value">{value}</div>
  </span>
);

const MyPage = () => {
  const navigate = useNavigate();

  const handleFollowerClick = () => {
    navigate('/follower');
  };

  const handleFollowingClick = () => {
    navigate('/following');
  };

  return (
    <div className="mypage-layout">
      <Header />
      <div className="mypage-main-wrapper">
        <aside className="my-left-sidebar">
          <LeftSidebar />
        </aside>

        <main className="mypage-middle-area">
          <div className="my-user-info">
            <div className="user-info-left">
              <div className="user-image">이미지</div>
              <div className="user-nickname">닉네임</div>
            </div>

            <div className="user-info-right">
              <UserInfo label="팔로워" value={123} onClick={handleFollowerClick} />
              <UserInfo label="팔로잉" value={456} onClick={handleFollowingClick} />
              <UserInfo label="게시물" value={789} />
            </div>
          </div>

          <div className="my-user-post">
            <div className="post-left-part">
              <PostList />
            </div>
            <div className="post-right-part">
              <div className="word-cloud-container">
                <p>워드 클라우드</p>
              </div>
            </div>
          </div>
        </main>

        <aside className="my-right-sidebar">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
};

export default MyPage;
