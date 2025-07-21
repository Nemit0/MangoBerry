import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header       from "../components/Header";
import PostList     from "../components/PostList";
import WordCloud    from "../components/WordCloud";
import { useAuth }  from "../contexts/AuthContext";

import "./OthersPage.css";
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

const OthersPage = () => {
  const navigate     = useNavigate();
  const { userId }   = useParams();               // /others/:userId
  const targetId     = Number(userId);
  const { user }     = useAuth();
  const viewerId     = user?.user_id ?? null;

  /* ─────── profile state ─────── */
  const [nickname,       setNickname]       = useState("닉네임");
  const [profileImg,     setProfileImg]     = useState(foxImage);
  const [followerCount,  setFollowerCount]  = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount,      setPostCount]      = useState(0);
  const [keywords,       setKeywords]       = useState([]);
  const [isFollowing,    setIsFollowing]    = useState(false);

  /* UX flags */
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  /* ─────── helpers ─────── */
  const fetchSocial = useCallback(async () => {
    const resp = await fetch(`${API_ROOT}/social/${targetId}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();

    setNickname(json.nickname        ?? "닉네임");
    setProfileImg(json.profile_url   ?? foxImage);
    setFollowerCount(json.follower_count  ?? 0);
    setFollowingCount(json.following_count ?? 0);
    setKeywords(Array.isArray(json.keywords) ? json.keywords : []);
  }, [targetId]);

  const fetchPostCount = useCallback(async () => {
    const url  = `${API_ROOT}/search_review_es?size=500&user_id=${targetId}&sort=recent`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const { success, result } = await resp.json();
    if (success) setPostCount((result ?? []).length);
  }, [targetId]);

  const fetchIsFollowing = useCallback(async () => {
    if (!viewerId) return;
    const resp = await fetch(`${API_ROOT}/following/${viewerId}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const { following } = await resp.json();
    const ids = (following ?? []).map(u => u.user_id);
    setIsFollowing(ids.includes(targetId));
  }, [viewerId, targetId]);

  /* initial load */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([fetchSocial(), fetchPostCount(), fetchIsFollowing()]);
      } catch (err) {
        console.error("[OthersPage]", err);
        setError("사용자 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchSocial, fetchPostCount, fetchIsFollowing]);

  /* follow / unfollow */
  const toggleFollow = async () => {
    if (!viewerId || viewerId === targetId) return;
    const action = isFollowing ? "unfollow" : "follow";
    try {
      const resp = await fetch(`${API_ROOT}/${action}/${viewerId}/${targetId}`, { method: "POST" });
      if (!resp.ok) {
        const { detail } = await resp.json();
        throw new Error(detail ?? `HTTP ${resp.status}`);
      }
      setIsFollowing(prev => !prev);
      setFollowerCount(prev => (isFollowing ? prev - 1 : prev + 1));
    } catch (err) {
      alert(`요청 실패: ${err.message}`);
    }
  };

  /* ─────── navigation to follower / following list ─────── */
  const goFollowers  = () => navigate(`/follower?user=${targetId}`);
  const goFollowing  = () => navigate(`/following?user=${targetId}`);

  /* ─────── render ─────── */
  if (Number.isNaN(targetId))
    return <p style={{ padding: "2rem" }}>잘못된 URL입니다.</p>;

  return (
    <div className="mypage-layout">
      <Header />

      <div className="mypage-main-wrapper">
        {loading && <div className="mypage-loading">불러오는 중...</div>}
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
                <UserInfo label="팔로워"  value={followerCount}  onClick={goFollowers} />
                <UserInfo label="팔로잉"  value={followingCount} onClick={goFollowing} />
                <UserInfo label="게시물" value={postCount}      disabled />
                <div className="follow-button">
                  <button
                    onClick={toggleFollow}
                    className={isFollowing ? "following" : ""}
                    disabled={!viewerId || viewerId === targetId}
                  >
                    {viewerId === targetId ? "본인" : isFollowing ? "following" : "follow"}
                  </button>
                </div>
              </div>
            </div>

            {/* posts + word-cloud */}
            <div className="my-user-post">
              <section className="post-left-part">
                <PostList user_id={targetId} columns={1} />
              </section>

              <aside className="post-right-part">
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

export default OthersPage;