import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import foxImage from "../assets/photo/circular_image.png";
import "./MapSidebar.css";

/* ───────────────────────── constants ───────────────────────── */
const API_URL = "/api";
const preferenceFilters = [
  "취향률 90% 이상",
  "취향률 80% 이상",
  "취향률 70% 이상",
  "취향률 60% 이상",
];

/* ───────────────────────── component ───────────────────────── */
const MapSidebar = ({
  onSearch,
  searchResults,
  currentKeyword,
  onResultItemClick,
}) => {
  /* viewer info (NULL when not logged‑in) */
  const { user } = useAuth();
  const viewerID = user?.user_id ?? null;

  /* UI state */
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState(
    currentKeyword || ""
  );
  const [showSearchResults, setShowSearchResults] = useState(false);

  /* 팔로잉 목록 – fetched from backend */
  const [followingList, setFollowingList] = useState([]);       // [{ id, name, avatar }]
  const [followError, setFollowError] = useState(null);

  /* refs */
  const searchBarRef = useRef(null);

  /* ─────────────────────── helpers ──────────────────────── */
  const navigate = useNavigate();
  const goToHomePage = () => navigate("/");

  const handleProfileClick = (targetID) =>
    targetID === viewerID ? navigate("/my") : navigate(`/others/${targetID}`);

  const fetchFollowing = useCallback(async () => {
    if (!viewerID) {
      setFollowingList([]);
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/following/${viewerID}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json = await resp.json();
      const raw = json.following ?? [];

      setFollowingList(
        raw.map((u) => ({
          id: u.user_id,
          name: u.nickname ?? "알 수 없음",
          avatar: u.profile_url ? u.profile_url : foxImage,
        }))
      );
      setFollowError(null);
    } catch (err) {
      console.error("[MapSidebar] fetchFollowing failed:", err);
      setFollowError("팔로잉 목록을 불러오지 못했습니다.");
    }
  }, [viewerID]);

  /* fetch 팔로잉 once (and whenever viewerID changes) */
  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  /* keep local input in sync with prop */
  useEffect(() => {
    setSearchInputValue(currentKeyword || "");
  }, [currentKeyword]);

  /* hide search results when clicking outside */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ─────────────────────── event handlers ─────────────────────── */
  const handleSearchButtonClick = () => {
    if (onSearch) {
      onSearch(searchInputValue);
      setShowSearchResults(true);
    }
  };

  const handleResultClick = (place) => {
    onResultItemClick?.(place);
    setShowSearchResults(false);
  };

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className={`map-sidebar-container ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-content">
        <p className="map-logo" onClick={goToHomePage} style={{ cursor: "pointer" }}>
          GUMIO
        </p>

        {/* ── 검색 박스 ── */}
        <h2 className="sidebar-title">지도 내 검색</h2>

        <div className="sidebar-search-bar" ref={searchBarRef}>
          <input
            type="text"
            placeholder="장소, 주소 검색"
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearchButtonClick()}
            onFocus={() => setShowSearchResults(true)}
          />
          <button
            onClick={handleSearchButtonClick}
            className="search-icon-button"
          >
            <FaSearch />
          </button>

          {showSearchResults &&
            (searchResults.length > 0 ? (
              <div className="search-results-list">
                {searchResults.map((place) => (
                  <div
                    key={place.id}
                    className="search-result-item"
                    onClick={() => handleResultClick(place)}
                  >
                    <p className="place-name">{place.place_name}</p>
                    <p className="place-address">{place.address_name}</p>
                    {place.phone && (
                      <p className="place-phone">{place.phone}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              searchInputValue && (
                <div className="search-results-list">
                  <p className="no-results-message">검색 결과가 없습니다.</p>
                </div>
              )
            ))}
        </div>

        {/* ── 취향률 필터 ── */}
        <h3 className="sidebar-subtitle">취향률</h3>
        <div className="sidebar-filter-group">
          {preferenceFilters.map((filter) => (
            <button
              key={filter}
              className="sidebar-custom-button sidebar-custom-button-like"
            >
              {filter}
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
                onClick={() => handleProfileClick(u.id)}
              >
                <img
                  src={u.avatar}
                  alt={u.name}
                  className="following-avatar"
                />
                <span className="following-name">{u.name}</span>

                {/* ── NEW: tiny checkbox for future batch actions ── */}
                <input
                  type="checkbox"
                  className="following-checkbox"
                  onClick={(e) => e.stopPropagation()} // don’t trigger profile nav when ticking
                />
              </li>
            ))}

            {viewerID && followingList.length === 0 && (
              <li className="following-empty">
                아직 팔로잉한 사용자가 없습니다.
              </li>
            )}
            {!viewerID && (
              <li className="following-empty">
                로그인하면 팔로잉 목록이 표시됩니다.
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── collapse toggle ── */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="sidebar-toggle-button"
      >
        {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </button>
    </div>
  );
};

export default MapSidebar;