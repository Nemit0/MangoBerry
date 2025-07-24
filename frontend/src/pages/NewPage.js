import React, { useState, useEffect, useRef } from "react";
import { useNavigate }           from "react-router-dom";
import Header                    from "../components/Header";
import { TbPhotoPlus }           from "react-icons/tb";
import { FiSearch }              from "react-icons/fi";
import { useAuth }               from "../contexts/AuthContext";
import LoadingSpinner            from "../components/LoadingSpinner";
import "./NewPage.css";

/* ───────────────────────── constants ───────────────────────── */
const API_ROOT  = "/api";
const USER_ID   = 1;          // fallback when not logged‑in
const REVIEW_FIX = 1000;      // temporary review_id used while images are still local

/* ───────────────────────── component ───────────────────────── */
export default function NewPage () {
  /* navigation / auth */
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const userID    = user?.user_id ?? USER_ID;

  /* DOM refs */
  const dropdownRef = useRef(null);

  /* photo state */
  const [imageFiles, setImageFiles] = useState([]);  // File[]
  const [imagePrev,  setImagePrev]  = useState([]);  // blob URLs

  /* restaurant search state */
  const [searchQuery,        setSearchQuery]        = useState("");
  const [restaurantList,     setRestaurantList]     = useState([]);
  const [showDropdown,       setShowDropdown]       = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  /* review text state */
  const [oneLiner,   setOneLiner]   = useState("");
  const [reviewText, setReviewText] = useState("");

  /* keyword analysis state */
  const [analysisComplete,  setAnalysisComplete]  = useState(false);
  const [positiveKeywords,  setPositiveKeywords]  = useState({});
  const [negativeKeywords,  setNegativeKeywords]  = useState({});
  const [isAnalyzing,       setIsAnalyzing]       = useState(false);

  /* ───────────────────────── helpers ───────────────────────── */
  const searchRestaurants = async () => {
    if (!searchQuery.trim()) return;
    try {
      const url = `${API_ROOT}/search_restaurant_es?name=${encodeURIComponent(searchQuery.trim())}&size=50`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { success, result } = await res.json();
      setRestaurantList(success && Array.isArray(result) ? result : []);
      setShowDropdown(true);
    } catch (err) {
      console.error(err);
      alert("식당 검색 중 오류가 발생했습니다.");
    }
  };

  const handleSearchKeyDown = (e) =>
    e.key === "Enter" && (e.preventDefault(), searchRestaurants());

  const handleSelectRestaurant = (r) => {
    setSelectedRestaurant(r);
    setSearchQuery(r.name);
    setShowDropdown(false);
  };

  /* image handlers */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const blobs = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files]);
    setImagePrev((prev)  => [...prev,  ...blobs]);
  };

  const handleDeleteImage = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePrev((prev)  => prev.filter((_, i) => i !== idx));
  };

  /* keyword analysis */
  const handleAnalysis = async () => {
    if (isAnalyzing || analysisComplete) return;
    if (!reviewText.trim()) {
      alert("리뷰 내용을 입력해주세요.");
      return;
    }
    setIsAnalyzing(true);
    setTimeout(async () => {
      try {
        const payload = {
          name:       selectedRestaurant?.name || searchQuery || "알수없음",
          one_liner:  oneLiner,
          text:       reviewText,
        };
        const res = await fetch(`${API_ROOT}/analyze_review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = await res.json();                     // [{ keyword, sentiment }]
        const pos = {},  neg = {};
        arr.forEach(({ keyword, sentiment }) =>
          (sentiment === "positive" ? pos : neg)[keyword] = true
        );
        setPositiveKeywords(pos);
        setNegativeKeywords(neg);
        setAnalysisComplete(true);
      } catch (err) {
        console.error(err);
        alert("키워드 분석 중 오류가 발생했습니다.");
      } finally {
        setIsAnalyzing(false);
      }
    }, 1000); // spinner delay
  };

  /* save review */
  const handleSave = async () => {
    if (!selectedRestaurant) return alert("식당을 선택해주세요.");
    if (!analysisComplete)   return alert("분석을 먼저 완료해주세요.");

    try {
      /* 1) upload photos */
      const uploaded = await Promise.all(
        imageFiles.map(async (file) => {
          const fd  = new FormData();
          fd.append("file", file);
          const res = await fetch(
            `${API_ROOT}/reviews/${userID}/images?review_id=${REVIEW_FIX}`,
            { method: "POST", body: fd }
          );
          if (!res.ok) throw new Error(`Image upload HTTP ${res.status}`);
          return res.json(); // { key, public_url }
        })
      );
      const photoFilenames = uploaded.map((x) => x.key);
      const photoUrls      = uploaded.map((x) => x.public_url);

      /* 2) review body */
      const body = {
        user_id:           userID,
        restaurant_id:     selectedRestaurant.restaurant_id,
        comments:          oneLiner,
        review:            reviewText,
        photo_filenames:   photoFilenames,
        photo_urls:        photoUrls,
        positive_keywords: Object.keys(positiveKeywords).filter((k) => positiveKeywords[k]),
        negative_keywords: Object.keys(negativeKeywords).filter((k) => negativeKeywords[k]),
      };

      console.log("[NewPage] Review body:", body);

      /* 3) POST review */
      const res = await fetch(`${API_ROOT}/reviews`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Review POST HTTP ${res.status}`);
      const { review_id } = await res.json();
      alert(`리뷰가 등록되었습니다 (ID: ${review_id})`);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert(`저장 중 오류: ${err.message}`);
    }
  };

  const handleCancel = () =>
    window.confirm("해당 글이 저장되지 않습니다.") && navigate("/");

  /* auto‑close dropdown */
  useEffect(() => {
    const clickAway = (e) =>
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target) &&
      setShowDropdown(false);
    document.addEventListener("mousedown", clickAway);
    return () => document.removeEventListener("mousedown", clickAway);
  }, []);

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="newpage-container">
      <Header />
      {isAnalyzing && <LoadingSpinner />}
      <div className="newpage-content">
        <main className="newpage-main">
          <div className="newpage-wrapper">
            {/* page title */}
            <div className="newpage-top"><h1>글쓰기</h1></div>

            {/* two‑column layout */}
            <div className="newpage-bottom">
              {/* ── left: photos ── */}
              <div className="newpage-left">
                {/* previews */}
                <div className="newpage-image-preview-container">
                  {imagePrev.map((src, idx) => (
                    <div key={idx} className="newpage-image-preview-wrapper">
                      <img
                        src={src}
                        alt={`preview-${idx}`}
                        className="image-preview"
                      />
                      <button
                        className="delete-image-button"
                        onClick={() => handleDeleteImage(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* floating upload button */}
                <div
                  className="newpage-photo-upload"
                  onClick={() => document.getElementById("imageInput").click()}
                  role="button"
                  aria-label="사진 추가"
                >
                  <TbPhotoPlus size={24} />
                  <input
                    id="imageInput"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>

              {/* ── right: form ── */}
              <div className="newpage-right">
                <div className="newpage-inputs">
                  {/* restaurant search */}
                  <div className="restaurant-search-container">
                    <input
                      className="restaurant-search-input"
                      type="text"
                      placeholder="식당이름 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => searchQuery && setShowDropdown(true)}
                    />
                    <button
                      className="restaurant-search-button"
                      aria-label="search"
                      onClick={searchRestaurants}
                    >
                      <FiSearch size={18} />
                    </button>

                    {/* dropdown */}
                    {showDropdown && (
                      <ul className="restaurant-dropdown" ref={dropdownRef}>
                        {restaurantList.map((r) => (
                          <li
                            key={r.r_id}
                            className="restaurant-dropdown-item"
                            onClick={() => handleSelectRestaurant(r)}
                          >
                            <p className="place-name">{r.name}</p>
                            <p className="place-address">
                              {r.address ?? "주소 정보 없음"}
                            </p>
                          </li>
                        ))}
                        <li
                          key="add-new-restaurant"
                          className="restaurant-dropdown-item add-new-restaurant"
                          onClick={() => {
                            setShowDropdown(false);
                            navigate("/restaurant/new");
                          }}
                        >
                          <p className="place-name">새로운 식당 등록</p>
                        </li>
                      </ul>
                    )}
                    {showDropdown && restaurantList.length === 0 && (
                      <p className="no-results-message">검색 결과가 없습니다.</p>
                    )}
                  </div>

                  {/* text fields */}
                  <input
                    type="text"
                    placeholder="한줄평"
                    value={oneLiner}
                    onChange={(e) => setOneLiner(e.target.value)}
                  />
                  <textarea
                    placeholder="리뷰"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />

                  {/* analysis */}
                  <button
                    onClick={handleAnalysis}
                    className="analysis-button"
                    disabled={isAnalyzing || analysisComplete}
                  >
                    {isAnalyzing
                      ? "분석 중…"
                      : analysisComplete
                      ? "분석 완료"
                      : "분석 시작"}
                  </button>
                </div>

                {/* keywords + save/cancel */}
                {analysisComplete && (
                  <div className="analysis-results">
                    <div className="keyword-sections-container">
                      {/* positive */}
                      <div className="keyword-type-section">
                        <h2>긍정 키워드</h2>
                        <div className="newpage-keyword-section">
                          {Object.entries(positiveKeywords).map(([kw, active]) => (
                            <button
                              key={kw}
                              className={`new-positive-button ${active ? "active" : ""}`}
                              onClick={() =>
                                setPositiveKeywords((prev) => ({
                                  ...prev,
                                  [kw]: !prev[kw],
                                }))
                              }
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* negative */}
                      <div className="keyword-type-section">
                        <h2>부정 키워드</h2>
                        <div className="newpage-keyword-section">
                          {Object.entries(negativeKeywords).map(([kw, active]) => (
                            <button
                              key={kw}
                              className={`new-nagative-button ${active ? "active" : ""}`}
                              onClick={() =>
                                setNegativeKeywords((prev) => ({
                                  ...prev,
                                  [kw]: !prev[kw],
                                }))
                              }
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* save / cancel */}
                    <div className="action-buttons">
                      <button
                        onClick={handleCancel}
                        className="cancel-button"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSave}
                        className="save-button"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}