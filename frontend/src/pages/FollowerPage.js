import React, { useState } from "react"; // useState를 import 합니다.
import "./FollowerPage.css";
import foxImage from '../assets/photo/circular_image.png';

const FollowerPage = () => {
  // dummyFollower 데이터를 상태로 관리하여 버튼 클릭 시 업데이트 가능하게 합니다.
  const [followers, setFollowers] = useState([
    { name: "유준영", isFollowing: true, profileImg: foxImage},  // 이미 팔로잉 중인 상태; true (메세지)
    { name: "권별아", isFollowing: true, profileImg: foxImage}, // 아직 팔로잉하지 않는 상태; false (맞팔로우우)
    { name: "김태완", isFollowing: true, profileImg: foxImage},
    { name: "정지원", isFollowing: true, profileImg: foxImage},
    { name: "정민희", isFollowing: true, profileImg: foxImage},
    { name: "임호규", isFollowing: false, profileImg: foxImage},  // 이미 팔로잉 중인 상태; true (메세지)
    { name: "이정두", isFollowing: false, profileImg: foxImage}, // 아직 팔로잉하지 않는 상태; false (팔로잉)
    { name: "박지연", isFollowing: false, profileImg: foxImage},
    { name: "최진욱", isFollowing: false, profileImg: foxImage},
    { name: "김병천", isFollowing: false, profileImg: foxImage}
      ]);


  // 팔로잉 상태를 토글하는 함수
  const toggleFollow = (nameToToggle) => {
    setFollowers(prevFollowers =>
      prevFollowers.map(follower =>
        follower.name === nameToToggle
          ? { ...follower, isFollowing: !follower.isFollowing }
          : follower
      )
    );
  };


  return (
    <div className="follower-page">
      <h2 className="follower-title">팔로워</h2>
      <div className="follower-count">ALL {followers.length}</div>
      <div className="keyword-result-container">
        {followers.map((user, index) => (
          <div key={index} className="keyword-box">
            <div className="profile-image-container">
                <img src={user.profileImg} alt={`${user.name}'s profile`} className="profile-img" />
            </div>
            <div className="user-name">{user.name}</div>
            <button
              className={`follow-button ${user.isFollowing ? 'following' : 'follow'}`}
              onClick={() => toggleFollow(user.name)}
            >
              {user.isFollowing ? '메세지' : '맞팔로우'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FollowerPage;