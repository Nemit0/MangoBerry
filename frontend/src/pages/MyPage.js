import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";

import Header     from "../components/Header";
import PostList   from "../components/PostList";
import WordCloud  from "../components/WordCloud";
import { useAuth } from "../contexts/AuthContext";

import "./MyPage.css";
import foxImage from "../assets/photo/circular_image.png";

/* ───────────────────────── constants ───────────────────────── */
const API_ROOT = "/api";

/* Tiny stateless helper for profile stats */
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

/* ───────────────────────── component ───────────────────────── */
const MyPage = () => {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const userID      = user?.user_id ?? null;

  /* Social profile state */
  const [nickname,        setNickname]        = useState("닉네임");
  const [profileImg,      setProfileImg]      = useState(foxImage);
  const [followerCount,   setFollowerCount]   = useState(0);
  const [followingCount,  setFollowingCount]  = useState(0);
  const [postCount,       setPostCount]       = useState(0);
  const [keywords,        setKeywords]        = useState([]);
  const [windowWidth,     setWindowWidth]     = useState(window.innerWidth);

  /* UX flags */
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  /* Refs */
  const fileInputRef = useRef(null);

  /* ------------------------------------------------------------------ */
  /* Fetch helpers                                                      */
  /* ------------------------------------------------------------------ */
  const fetchSocial = useCallback(async () => {
    if (!userID) return;
    try {
      const resp  = await fetch(`${API_ROOT}/social/${userID}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json  = await resp.json();
      setNickname(json.nickname ?? "닉네임");
      setProfileImg(json.profile_url ? json.profile_url : foxImage);
      setFollowerCount(json.follower_count ?? 0);
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

  /* ------------------------------------------------------------------ */
  /* Avatar upload flow                                                 */
  /* ------------------------------------------------------------------ */
  const handleProfileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userID) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("5MB 이하의 이미지만 업로드 가능합니다.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(
        `${API_ROOT}/upload-profile-image/${userID}`,
        { method: "POST", body: formData }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json = await resp.json();
      if (json.profile_url) setProfileImg(json.profile_url);

      fetchSocial();
    } catch (err) {
      console.error("[MyPage] avatar upload failed:", err);
      alert("프로필 이미지를 업로드하지 못했습니다.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  /* Click‑handlers for navigation                                      */
  /* ------------------------------------------------------------------ */
  const goFollowers = () => userID && navigate("/follower");
  const goFollowing = () => userID && navigate("/following");

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */
  if (!userID) {
    return (
      <div className="mypage-layout">
        <Header />
        <main className="mypage-middle-area"><p>로그인이 필요합니다.</p></main>
      </div>
    );
  }

  return (
    <div className="mypage-layout">
      <Header />
      <div className="mypage-main-wrapper">
        {error && !loading && <div className="mypage-error">{error}</div>}

        {/* ───────────────── Loading state (matches HomePage PostList style) ───────────────── */}
        {loading ? (
          <main className="mypage-middle-area">
            <div className="postlist-loading" role="status" aria-live="polite">
              <span className="postlist-loader" aria-hidden="true"></span>
              <span className="postlist-loading-text">게시글을 불러오는 중입니다…</span>
            </div>
          </main>
        ) : (
          <main className="mypage-middle-area">
            {/* Hidden file input – LIVE in the DOM but invisible */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* Profile card */}
            <div className="my-user-info">
              <div className="user-info-left">
                <div
                  className="user-image-container"
                  onClick={handleProfileClick}
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={profileImg}
                    alt="profile"
                    className="my-profile-img"
                  />
                </div>
                <div className="user-nickname">{nickname}</div>
              </div>

              <div className="user-info-right">
                <UserInfo label="팔로워" value={followerCount} onClick={goFollowers} />
                <UserInfo label="팔로잉" value={followingCount} onClick={goFollowing} />
                <UserInfo label="게시물" value={postCount} disabled />
              </div>
            </div>

            {/* Posts + word‑cloud */}
            <div className={`my-user-post ${windowWidth <= 700 ? 'mobile-layout' : ''}`}>
              <section className="post-left-part">
                <PostList isMyPage={true} user_id={userID} columns={1} />
              </section>

              <aside className="post-right-part">
                <div className="mypage-word-cloud-container">
                  <div className="mypage-word-cloud-content">
                    <WordCloud
                      keywords={keywords}
                      width={windowWidth <= 700 ? 600 : 300}
                      height={windowWidth <= 700 ? 200 : 300}
                    />
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