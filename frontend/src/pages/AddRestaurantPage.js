import React, { useState, useRef, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import Header                  from "../components/Header";
import LoadingSpinner          from "../components/LoadingSpinner";
import { useAuth }             from "../contexts/AuthContext";
import { FiSearch }            from "react-icons/fi";

import "./AddRestaurantPage.css";

/* ───────────── constants ───────────── */
const API_ROOT = "/api";

/* ───────────────────────────────── component ─────────────────────────────── */
export default function AddRestaurantPage () {
  /* navigation / auth */
  const navigate      = useNavigate();
  const { user }      = useAuth();

  /* ─── refs ─── */
  const dropdownRef   = useRef(null);

  /* ─── form state ─── */
  const [name,      setName]      = useState("");
  const [addr,      setAddr]      = useState("");
  const [cuisine,   setCuisine]   = useState("");
  const [latitude,  setLatitude]  = useState("");
  const [longitude, setLongitude] = useState("");

  /* ─── Kakao search state ─── */
  const [searchQuery,  setSearchQuery]  = useState("");
  const [placeList,    setPlaceList]    = useState([]); // [{ …mapped }]
  const [showDropdown, setShowDropdown] = useState(false);

  /* ─── ui state ─── */
  const [isPosting, setIsPosting] = useState(false);

  /* ───────────── helpers ───────────── */
  const clearForm = () => {
    setName(""); setAddr(""); setCuisine("");
    setLatitude(""); setLongitude("");
  };

  /* ─── Kakao place search helper (GET /search_kakao) ─── */
  const searchPlaces = async () => {
    if (!searchQuery.trim()) return;
    try {
      const url = `${API_ROOT}/search_kakao?keyword=${encodeURIComponent(searchQuery.trim())}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("Kakao search results:", data);
      if (data.success && Array.isArray(data.results))
        setPlaceList(data.results);
      else
        setPlaceList([]);
      setShowDropdown(true);
    } catch (err) {
      console.error(err);
      alert("카카오 장소 검색 중 오류가 발생했습니다.");
    }
  };
  const handleSearchKeyDown  = (e) => e.key === "Enter" && (e.preventDefault(), searchPlaces());
  const handleSearchButton   = () => searchPlaces();

  /* ─── dropdown selection handler ─── */
  const handleSelectPlace = (p) => {
    setName(p.name || "");
    setAddr(p.address || "");
    /* 카카오 category 예시: '음식점 > 한식 > 육류,고기 > 불고기,두루치기' */
    setCuisine(p.category);                    // auto‑fill
    setLatitude(String(p.latitude ?? ""));
    setLongitude(String(p.longitude ?? ""));
    setSearchQuery(p.name);
    setShowDropdown(false);
  };

  /* ─── POST /add_restaurant ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())    return alert("식당 이름을 입력하거나 선택해주세요!");
    if (!cuisine.trim()) return alert("음식 종류(카테고리)를 입력해주세요!");
    if (!addr.trim() && !(latitude && longitude))
      return alert("주소 또는 좌표(위도, 경도) 중 하나는 필요합니다.");

    const body = {
      name,
      location     : addr || null,
      cuisine_type : cuisine,
      latitude     : latitude  ? Number(latitude)  : null,
      longitude    : longitude ? Number(longitude) : null,
    };

    try {
      setIsPosting(true);
      const res = await fetch(`${API_ROOT}/add_restaurant`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(body),
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

  const handleCancel = () =>
    window.confirm("작성 중인 내용이 사라집니다. 계속하시겠습니까?") &&
    navigate(-1);

  /* auto‑close dropdown on outside click */
  useEffect(() => {
    const onClickAway = (e) =>
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target) &&
      setShowDropdown(false);
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="addrest-container">
      <Header />
      {isPosting && <LoadingSpinner />}
      <main className="addrest-main">
        <h1>새 식당 등록</h1>

        <form onSubmit={handleSubmit} className="addrest-form">

          {/* ─── Kakao restaurant search (name) ─── */}
          <div className="restaurant-search-container">
            <input
              className="restaurant-search-input"
              type="text"
              placeholder="식당이름 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchQuery && setShowDropdown(true)}
              required
            />
            <button
              className="restaurant-search-button"
              onClick={handleSearchButton}
              aria-label="search"
              type="button"
            >
              <FiSearch size={18} />
            </button>

            {/* dropdown */}
            {showDropdown && (
              <ul className="restaurant-dropdown" ref={dropdownRef}>
                {placeList.map((p) => (
                  <li
                    key={p.id}
                    className="restaurant-dropdown-item"
                    onClick={() => handleSelectPlace(p)}
                  >
                    <p className="place-name">{p.name}</p>
                    <p className="place-address">{p.address ?? "주소 정보 없음"}</p>
                  </li>
                ))}
                {/* (optional) no‑results notice (outside dropdown) */}
              </ul>
            )}
          </div>

          {/* cuisine – now free‑text */}
          <label className="addrest-label">
            <span>음식 종류<span className="req">*</span></span>
            <input
              type="text"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="예: 한식"
              required
            />
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

          {/* coordinates */}
          <div className="coord-row">
            <label className="addrest-label">
              <span>위도 (latitude)</span>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="37.4979"
              />
            </label>
            <label className="addrest-label">
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