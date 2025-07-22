import React, {
  useState, useEffect, useRef, useCallback,
} from "react";
import { useNavigate }                 from "react-router-dom";
import { FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useAuth }                     from "../contexts/AuthContext";
import foxImage                        from "../assets/photo/circular_image.png";
import "./MapSidebar.css";

/* ───────────────────────── constants ───────────────────────── */
const API_URL = "/api";
const preferenceFilters = [
  { label: "취향률 90% 이상", value: 90 },
  { label: "취향률 80% 이상", value: 80 },
  { label: "취향률 70% 이상", value: 70 },
  { label: "취향률 60% 이상", value: 60 },
];

/* ───────────────────────── component ───────────────────────── */
const MapSidebar = ({
  restaurants,
  onPreferenceFilterChange,
  currentThreshold,
  onFollowerSelectionChange,
}) => {
  /* viewer info */
  const { user } = useAuth();
  const viewerID = user?.user_id ?? null;

  /* UI state */
  const [isCollapsed, setIsCollapsed]       = useState(false);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [followingList, setFollowingList]   = useState([]);   // [{ id, name, avatar }]
  const [followError, setFollowError]       = useState(null);
  const [selectedFollowers, setSelectedFollowers] = useState(new Set()); // 0 or 1 id

  /* refs */
  const searchBarRef = useRef(null);
  const navigate     = useNavigate();

  /* ─────────────────── data fetch ─────────────────── */
  const fetchFollowing = useCallback(async () => {
    if (!viewerID) { setFollowingList([]); return; }
    try {
      const resp = await fetch(`${API_URL}/following/${viewerID}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { following = [] } = await resp.json();

      const mapped = following.map((u) => ({
        id:     u.user_id,
        name:   u.nickname ?? "알 수 없음",
        avatar: u.profile_url || foxImage,
      }));
      setFollowingList(mapped);
      setFollowError(null);
    } catch (err) {
      console.error("[MapSidebar] fetchFollowing failed:", err);
      setFollowError("팔로잉 목록을 불러오지 못했습니다.");
    }
  }, [viewerID]);

  useEffect(() => { fetchFollowing(); }, [fetchFollowing]);

  /* ─────────────────── search helpers ─────────────────── */
  const handleSearchButtonClick = () => setShowSearchResults(true);
  const handleResultClick       = (rest) => {
    setSearchInputValue(rest.name);
    setShowSearchResults(false);
  };

  /* click‑outside close */
  useEffect(() => {
    const clickOutside = (e) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  /* ─────────────────── preference filter ─────────────────── */
  const handlePrefClick = (val) => onPreferenceFilterChange(val);

  /* ─────────────────── follower select (single) ─────────────────── */
  const toggleFollower = (id) => {
    const next = new Set();
    if (!selectedFollowers.has(id)) next.add(id);     // select new (single)
    setSelectedFollowers(next);
    onFollowerSelectionChange([...next]);             // array (0 or 1 id)
  };

  /* ─────────────────── render ─────────────────── */
  return (
    <div className={`map-sidebar-container ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-content">
        <p className="map-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          GUMIO
        </p>

        {/* ── 검색 박스 ── */}
        <h2 className="sidebar-title">지도 내 검색</h2>
        <div className="sidebar-search-bar" ref={searchBarRef}>
          <input
            type="text"
            placeholder="식당 이름 검색"
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearchButtonClick()}
            onFocus={() => setShowSearchResults(true)}
          />
          <button onClick={handleSearchButtonClick} className="search-icon-button">
            <FaSearch />
          </button>

          {showSearchResults && (
            <div className="search-results-list">
              {restaurants
                .filter((r) => r.name.includes(searchInputValue))
                .slice(0, 20)
                .map((r) => (
                  <div
                    key={r.restaurant_id}
                    className="search-result-item"
                    onClick={() => handleResultClick(r)}
                  >
                    <p className="place-name">{r.name}</p>
                    <p className="place-address">{r.address}</p>
                    <p className="place-phone">취향률 {r.mean_rating.toFixed(0)}%</p>
                  </div>
                ))}
              {searchInputValue &&
                restaurants.filter((r) => r.name.includes(searchInputValue)).length === 0 && (
                  <p className="no-results-message">검색 결과가 없습니다.</p>
              )}
            </div>
          )}
        </div>

        {/* ── 취향률 필터 ── */}
        <h3 className="sidebar-subtitle">취향률</h3>
        <div className="sidebar-filter-group">
          {preferenceFilters.map(({ label, value }) => (
            <button
              key={value}
              className={`sidebar-custom-button sidebar-custom-button-like${
                currentThreshold === value ? " active" : ""
              }`}
              onClick={() => handlePrefClick(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── 팔로잉 목록 ── */}
        <h3 className="sidebar-subtitle">팔로잉</h3>
        {followError ? (
          <p className="fetch-error">{followError}</p>
        ) : (
          <ul className="sidebar-following-list">
            {followingList.map((u) => (
              <li
                key={u.id}
                className="following-item"
                onClick={() => toggleFollower(u.id)}
              >
                <img src={u.avatar} alt={u.name} className="following-avatar" />
                <span className="following-name">{u.name}</span>
                <input
                  type="checkbox"
                  className="following-checkbox"
                  checked={selectedFollowers.has(u.id)}
                  readOnly
                  onClick={(e) => e.stopPropagation()}
                />
              </li>
            ))}
            {viewerID && followingList.length === 0 && (
              <li className="following-empty">아직 팔로잉한 사용자가 없습니다.</li>
            )}
            {!viewerID && (
              <li className="following-empty">로그인하면 팔로잉 목록이 표시됩니다.</li>
            )}
          </ul>
        )}
      </div>

      {/* collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="sidebar-toggle-button"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </button>
    </div>
  );
};

export default MapSidebar;