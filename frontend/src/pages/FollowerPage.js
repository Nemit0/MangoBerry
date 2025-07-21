// FollowerPage.js
// Detailed list of users who follow `targetID`, showing compatibility stars
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./FollowerPage.css";
import foxImage from "../assets/photo/circular_image.png";
import Header from "../components/Header";
import RatingDisplay from "../components/RatingDisplay";

const API_ROOT = "/api";

const FollowerPage = () => {
  /* ─────────────────────────── viewer & target ─────────────────────────── */
  const { user } = useAuth();
  const viewerID = user?.user_id ?? null;
  const navigate = useNavigate();

  const handleProfileClick = (userId) =>
    userId === viewerID ? navigate("/my") : navigate(`/others/${userId}`);

  /* target user:  /follower?user={id} – default to “me” */
  const [searchParams] = useSearchParams();
  const targetIDParam  = searchParams.get("user");
  const targetID       = targetIDParam ? Number(targetIDParam) : viewerID;

  /* ───────────────────────────── state ───────────────────────────── */
  const [followers, setFollowers] = useState([]);   // [{user_id, nickname, ...}]
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  /* ───────────────────────────── helpers ─────────────────────────── */
  const fetchFollowers = useCallback(async () => {
    if (!targetID) return;
    setLoading(true);

    try {
      const perspectiveID = viewerID ?? targetID;
      const resp = await fetch(
        `${API_ROOT}/followers/${targetID}?perspective_id=${perspectiveID}`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();

      setFollowers(
        (json.followers ?? []).map((u) => {
          console.log(u.compatibility);
          const rating = u.compatibility ?? 0;
          return {
            user_id:     u.user_id,
            nickname:    u.nickname      ?? "알 수 없음",
            profile_url: u.profile_url ? u.profile_url : foxImage,
            isFollowing: !!u.is_following,
            rating,
          };
        })
      );
      setError(null);
    } catch (err) {
      console.error("[FollowerPage] fetch failed:", err);
      setError("팔로워 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [targetID, viewerID]);

  /* mount / reload */
  useEffect(() => { fetchFollowers(); }, [fetchFollowers]);

  /* ───── follow / unfollow toggle ───── */
  const toggleFollow = async (targetUserID, currentlyFollowing) => {
    if (!viewerID || viewerID === targetUserID) return;
    const endpoint = currentlyFollowing
      ? `${API_ROOT}/unfollow/${viewerID}/${targetUserID}`
      : `${API_ROOT}/follow/${viewerID}/${targetUserID}`;

    try {
      const resp = await fetch(endpoint, { method: "POST" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setFollowers((prev) =>
        prev.map((f) =>
          f.user_id === targetUserID ? { ...f, isFollowing: !currentlyFollowing } : f
        )
      );
    } catch (err) {
      console.error("[FollowerPage] toggle failed:", err);
      alert("요청을 처리하지 못했습니다.");
    }
  };

  /* ───────────────────────────── render ─────────────────────────── */
  if (!targetID) return <p>사용자 정보가 없습니다.</p>;
  if (loading)   return <p>불러오는 중…</p>;
  if (error)     return <p>{error}</p>;

  return (
    <div className="follower-page">
      <Header />
      <div className="follower-wrapper">
        <h2 className="follower-title">팔로워</h2>
        <div className="follower-count">ALL&nbsp;{followers.length}</div>

        <div className="keyword-result-container">
          {followers.map((f) => (
            <div
              key={f.user_id}
              className="keyword-box"
            >
              <div className="profile-image-container">
                <img
                  src={f.profile_url}
                  alt={`${f.nickname} profile`}
                  className="profile-img"
                  onClick={() => handleProfileClick(f.user_id)}
                />
              </div>

              <div className="user-name" onClick={() => handleProfileClick(f.user_id)}>{f.nickname}</div>
              <RatingDisplay score={f.rating / 10} width={50} height={50} />
              <button
                className={`follow-button ${f.isFollowing ? "following" : "follow"}`}
                onClick={() => toggleFollow(f.user_id, f.isFollowing)}
                disabled={!viewerID || viewerID === f.user_id}
              >
                {f.isFollowing ? "팔로잉" : "팔로우"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FollowerPage;
