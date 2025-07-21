// FollowingPage.js
// Detailed list of users whom `targetID` follows, showing compatibility stars
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./FollowingPage.css";
import foxImage from "../assets/photo/circular_image.png";
import Header from "../components/Header";
import RatingDisplay from "../components/RatingDisplay";

const API_ROOT = "/api";

const FollowingPage = () => {
  /* ─────────────────────────── viewer & target ─────────────────────────── */
  const { user } = useAuth();
  const viewerID = user?.user_id ?? null;
  const navigate = useNavigate();

  const handleProfileClick = (userId) =>
    userId === viewerID ? navigate("/my") : navigate(`/others/${userId}`);

  /* target user:  /following?user={id} – default to “me” */
  const [searchParams] = useSearchParams();
  const targetIDParam  = searchParams.get("user");
  const targetID       = targetIDParam ? Number(targetIDParam) : viewerID;

  /* ───────────────────────────── state ───────────────────────────── */
  const [following, setFollowing] = useState([]); // [{user_id, nickname, ...}]
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  /* ───────────────────────────── helpers ─────────────────────────── */
  const fetchFollowing = useCallback(async () => {
    if (!targetID) return;
    setLoading(true);

    try {
      /* 1) whom does target user follow? */
      const perspectiveID = viewerID ?? targetID;
      const url   = `${API_ROOT}/following/${targetID}?perspective_id=${perspectiveID}`;
      const resp  = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json  = await resp.json();
      const base  = json.following ?? [];

      /* 2) viewer’s own following list – to flag buttons */
      let viewerFollowingIds = [];
      if (viewerID) {
        const resp2 = await fetch(`${API_ROOT}/following/${viewerID}`);
        if (resp2.ok) {
          const json2 = await resp2.json();
          viewerFollowingIds = (json2.following ?? []).map((u) => u.user_id);
        }
      }

      /* 3) merge + map */
      setFollowing(
        base.map((u) => {
          const compat = u.compatibility ?? 0;                // 0‑100
          const rating = Math.round(compat / 20);             // 0‑5
          return {
            user_id:     u.user_id,
            nickname:    u.nickname      ?? "알 수 없음",
            profile_url: u.profile_url   ?? foxImage,
            isFollowing: viewerFollowingIds.includes(u.user_id),
            rating,
          };
        })
      );
      setError(null);
    } catch (err) {
      console.error("[FollowingPage] fetch failed:", err);
      setError("팔로잉 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [targetID, viewerID]);

  /* mount / reload */
  useEffect(() => { fetchFollowing(); }, [fetchFollowing]);

  /* ───── follow / unfollow toggle ───── */
  const toggleFollow = async (targetUserID, currentlyFollowing) => {
    if (!viewerID || viewerID === targetUserID) return;
    const endpoint = currentlyFollowing
      ? `${API_ROOT}/unfollow/${viewerID}/${targetUserID}`
      : `${API_ROOT}/follow/${viewerID}/${targetUserID}`;

    try {
      const resp = await fetch(endpoint, { method: "POST" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setFollowing((prev) =>
        prev.map((u) =>
          u.user_id === targetUserID ? { ...u, isFollowing: !currentlyFollowing } : u
        )
      );
    } catch (err) {
      console.error("[FollowingPage] toggle failed:", err);
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
      <div className="following-wrapper">
        <h2 className="following-title">팔로잉</h2>
        <div className="follower-count">ALL&nbsp;{following.length}</div>

        <div className="keyword-result-container">
          {following.map((u) => (
            <div
              key={u.user_id}
              className="keyword-box"
              onClick={() => handleProfileClick(u.user_id)}
            >
              <div className="profile-image-container">
                <img
                  src={u.profile_url}
                  alt={`${u.nickname} profile`}
                  className="profile-img"
                />
              </div>

              <div className="user-name">{u.nickname}</div>
              <RatingDisplay score={u.rating / 10} width={50} height={50} />
              <button
                className={`follow-button ${u.isFollowing ? "following" : "follow"}`}
                onClick={() => toggleFollow(u.user_id, u.isFollowing)}
                disabled={!viewerID || viewerID === u.user_id}
              >
                {u.isFollowing ? "팔로잉" : "팔로우"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FollowingPage;
