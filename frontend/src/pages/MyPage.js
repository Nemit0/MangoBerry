import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Header     from "../components/Header";
import PostList   from "../components/PostList";
import WordCloud  from "../components/WordCloud";
import { useAuth } from "../contexts/AuthContext";

import "./MyPage.css";
import foxImage from "../assets/photo/circular_image.png";

const API_ROOT = "/api";

const UserInfo = ({ label, value, onClick, disabled }) => (
  <span
    className={`user-info-item${disabled ? " disabled" : ""}`}
    onClick={disabled ? undefined : onClick}
    style={{ cursor: disabled ? "default" : "pointer" }}
    role={disabled ? undefined : "button"}
    tabIndex={disabled ? -1 : 0}
  >
    <div className="info-label">{label}</div>
    <div className="info-value">{value}</div>
  </span>
);

/* ─────────────────────────────── component ─────────────────────────── */

const MyPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userID   = user?.user_id ?? null;

  /* social profile state */
  const [nickname,        setNickname]        = useState("닉네임");
  const [profileImg,      setProfileImg]      = useState(foxImage);
  const [followerCount,   setFollowerCount]   = useState(0);
  const [followingCount,  setFollowingCount]  = useState(0);
  const [postCount,       setPostCount]       = useState(0);
  const [keywords,        setKeywords]        = useState([]);

  /* UX flags */
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  /* ------------------------------------------------------------------ */
  /* fetch helpers                                                      */
  /* ------------------------------------------------------------------ */
  const fetchSocial = useCallback(async () => {
    if (!userID) return;
    try {
      const resp  = await fetch(`${API_ROOT}/social/${userID}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json  = await resp.json();
      setNickname(json.nickname       ?? "닉네임");
      setProfileImg(json.profile_url  ?? foxImage);
      setFollowerCount(json.follower_count  ?? 0);
      setFollowingCount(json.following_count ?? 0);
      setKeywords(Array.isArray(json.keywords) ? json.keywords : []);
    } catch (err) {
      console.error("[MyPage] social fetch failed:", err);
      setError("사용자 정보를 불러오지 못했습니다.");
    }
  }, [userID]);

  const fetchPostCount = useCallback(async () => {
    if (!userID) return;
    try {
      const url  = `${API_ROOT}/search_review_es?size=500&sort=recent&viewer_id=${userID}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json = await resp.json();
      if (!json.success) throw new Error(json.error ?? "unknown");
      const mine = (json.result ?? []).filter(r => r.user_id === userID);
      setPostCount(mine.length);
    } catch (err) {
      console.error("[MyPage] post-count fetch failed:", err);
    }
  }, [userID]);

  /* run once per user-change */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userID) { setLoading(false); return; }
      setLoading(true);
      await Promise.all([fetchSocial(), fetchPostCount()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userID, fetchSocial, fetchPostCount]);

  /* ------------------------------------------------------------------ */
  /* click handlers                                                     */
  /* ------------------------------------------------------------------ */
  const goFollowers = () => userID && navigate("/follower");
  const goFollowing = () => userID && navigate("/following");

  /* ------------------------------------------------------------------ */
  /* render                                                             */
  /* ------------------------------------------------------------------ */
  if (!userID)
    return (
      <div className="mypage-layout">
        <Header />
        <main className="mypage-middle-area"><p>로그인이 필요합니다.</p></main>
      </div>
    );

  return (
    <div className="mypage-layout">
      <Header />

      <div className="mypage-main-wrapper">
        {loading &&  <div className="mypage-loading">불러오는 중...</div>}
        {error   && !loading && <div className="mypage-error">{error}</div>}

        {!loading && (
          <main className="mypage-middle-area">

            {/* profile card */}
            <div className="my-user-info">
              <div className="user-info-left">
                <div className="user-image-container">
                  <img src={profileImg} alt="profile" className="my-profile-img" />
                </div>
                <div className="user-nickname">{nickname}</div>
              </div>

              <div className="user-info-right">
                <UserInfo label="팔로워" value={followerCount} onClick={goFollowers} />
                <UserInfo label="팔로잉" value={followingCount} onClick={goFollowing} />
                <UserInfo label="게시물" value={postCount} disabled />
              </div>
            </div>

            {/* posts + word-cloud */}
            <div className="my-user-post">
              <section className="post-left-part">
                <PostList isMyPage={true} user_id={userID} columns={1} />
              </section>

              <aside className="post-right-part">
                {/* unified container with internal title + cloud */}
                <div className="word-cloud-container">
                  <h3 className="word-cloud-title">워드&nbsp;클라우드</h3>
                  <div className="word-cloud-content">
                    <WordCloud keywords={keywords} />
                  </div>
                </div>
              </aside>
            </div>
          </main>
        )}
      </div>
    </div>
  );
};

export default MyPage;
