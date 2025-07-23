import React, { useState }     from "react";
import { useNavigate }         from "react-router-dom";
import Header                  from "../components/Header";
import LoadingSpinner          from "../components/LoadingSpinner";
import { useAuth }             from "../contexts/AuthContext";

import "./AddRestaurantPage.css";

/* ───────────── constants ───────────── */
const API_ROOT          = "/api";
const CUISINE_PRESETS   = [
  "한식", "중식", "일식", "양식", "분식",
  "카페 / 디저트", "패스트푸드", "주점", "기타"
];

/* ───────────────────────────────── component ─────────────────────────────── */
export default function AddRestaurantPage () {
  /* navigation / auth */
  const navigate          = useNavigate();
  const { user }          = useAuth();   // not strictly needed, but available

  /* form state */
  const [name,        setName]        = useState("");
  const [addr,        setAddr]        = useState("");
  const [cuisine,     setCuisine]     = useState("");
  const [latitude,    setLatitude]    = useState("");  // optional
  const [longitude,   setLongitude]   = useState("");  // optional

  /* ui state */
  const [isPosting,   setIsPosting]   = useState(false);

  /* ───────────── helpers ───────────── */
  const clearForm = () => {
    setName(""); setAddr(""); setCuisine("");
    setLatitude(""); setLongitude("");
  };

  /* POST /add_restaurant */
  const handleSubmit = async (e) => {
    e.preventDefault();
    /* basic validation */
    if (!name.trim())   return alert("식당 이름을 입력해주세요!");
    if (!cuisine.trim())return alert("음식 종류(카테고리)를 선택해주세요!");
    if (!addr.trim() && !(latitude && longitude))
      return alert("주소 또는 좌표(위도, 경도) 중 하나는 필요합니다.");

    /* payload as required by RestaurantCreate Pydantic model */
    const body = {
      name,
      location     : addr || null,
      cuisine_type : cuisine,
      latitude     : latitude ? Number(latitude)  : null,
      longitude    : longitude ? Number(longitude): null,
    };

    try {
      setIsPosting(true);
      const res = await fetch(`${API_ROOT}/add_restaurant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { success, restaurant_id, error } = await res.json();
      if (!success) throw new Error(error || "unknown");

      alert(`등록되었습니다! (ID: ${restaurant_id})`);
      navigate(`/restaurantInfo/${restaurant_id}`);
    } catch (err) {
      console.error(err);
      alert(`저장 실패: ${err.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  /* cancel button */
  const handleCancel = () =>
    window.confirm("작성 중인 내용이 사라집니다. 계속하시겠습니까?") &&
    navigate(-1);

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="addrest-container">
      <Header />
      {isPosting && <LoadingSpinner />}
      <main className="addrest-main">
        <h1>새 식당 등록</h1>

        <form onSubmit={handleSubmit} className="addrest-form">

          {/* name */}
          <label className="addrest-label">
            <span>식당 이름<span className="req">*</span></span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 고양이김밥"
              required
            />
          </label>

          {/* cuisine selector */}
          <label className="addrest-label">
            <span>음식 종류<span className="req">*</span></span>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              required
            >
              <option value="" disabled hidden>카테고리 선택</option>
              {CUISINE_PRESETS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          {/* address */}
          <label className="addrest-label">
            <span>도로명 / 지번 주소</span>
            <input
              type="text"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="예: 서울 강남구 테헤란로 1길 17"
            />
          </label>

          {/* coordinates – mutually optional with address */}
          <div className="coord-row">
            <label className="addrest-label half">
              <span>위도 (latitude)</span>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="37.4979"
              />
            </label>
            <label className="addrest-label half">
              <span>경도 (longitude)</span>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="127.0276"
              />
            </label>
          </div>

          {/* action buttons */}
          <div className="addrest-actions">
            <button type="button" onClick={handleCancel} className="cancel-btn">
              취소
            </button>
            <button type="submit" className="save-btn" disabled={isPosting}>
              {isPosting ? "등록 중..." : "저장"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}