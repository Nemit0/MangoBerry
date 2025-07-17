import React from "react";
import "./FollowingPage.css";

const FollowingPage = () => {
  const dummyFollowing = [
    { name: "NICK", percent: 100 },
    { name: "BOB", percent: 70 },
    { name: "STEVE", percent: 60 },
    { name: "EMILY", percent: 80 },
    { name: "JULIA", percent: 60 },
    { name: "JOHN", percent: 100 },
  ];

  return (
    <div className="following-page">
      <h2 className="following-title">팔로잉</h2>
      <div className="keyword-result-container">
        {dummyFollowing.map((user, index) => (
          <div key={index} className="keyword-box">
            <div className="profile-icon">👤</div>
            <div className="name-and-bar">
              <div className="user-name">{user.name}</div>
              <div className="progress-bar-background">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${user.percent}%` }}
                ></div>
                <span className="percent-text">{user.percent}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FollowingPage;
