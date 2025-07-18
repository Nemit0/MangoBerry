import React from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import PostList from "../components/PostList";
import './MyPage.css';
import foxImage from '../assets/photo/circular_image.png';

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

  const myProfile = {
    nickname: "닉네임", // 실제 사용자 닉네임으로 변경
    profileImg: foxImage // 여기에 여우 이미지 경로 사용
  };

  return (
    <div className="mypage-layout">
      <Header />
      <div className="mypage-main-wrapper">

        <main className="mypage-middle-area">
          <div className="my-user-info">
            <div className="user-info-left">
              {/* 이미지 란을 여우 이미지로 변경 */}
              <div className="user-image-container"> {/* 새로운 컨테이너 클래스 추가 */}
                <img src={myProfile.profileImg} alt="My Profile" className="my-profile-img" />
              </div>
              <div className="user-nickname">{myProfile.nickname}</div> {/* 닉네임도 상태에서 가져올 수 있도록 */}
            </div>

            <div className="user-info-right">
              <UserInfo label="팔로워" value={123} onClick={handleFollowerClick} />
              <UserInfo label="팔로잉" value={456} onClick={handleFollowingClick} />
              <UserInfo label="게시물" value={789} />
            </div>
          </div>

          <div className="my-user-post">
            <div className="post-left-part">
              <PostList isMyPage={true}/>
            </div>
            <div className="post-right-part">
              <div className="word-cloud-container">
                <p>워드 클라우드</p>
              </div>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
};

export default MyPage;