import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { TbPhotoPlus } from "react-icons/tb";
import { FiSearch } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import "./NewPage.css";

/* ───────────────────────── constants ───────────────────────── */
const API_ROOT = "/api";
const USER_ID = 1; // FALLBACK
const REVIEW_FIX = 1000; // temporary review_id for image uploads

/* ───────────────────────── component ───────────────────────── */
const NewPage = () => {
  /* ─────────── navigation / auth ─────────── */
  const navigate = useNavigate();
  const { user } = useAuth();
  const userID = user?.user_id ?? USER_ID;

  /* ─────────── refs ─────────── */
  const dropdownRef = useRef(null);

  /* ─────────── state: images ─────────── */
  const [imageFiles, setImageFiles] = useState([]); // File[]
  const [imagePrev, setImagePrev] = useState([]); // blob URLs

  /* ─────────── state: restaurant search ─────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurantList, setRestaurantList] = useState([]); // [{ r_id, name, address? }]
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null); // { r_id, name }

  /* ─────────── state: review text ─────────── */
  const [oneLiner, setOneLiner] = useState("");
  const [reviewText, setReviewText] = useState("");

  /* ─────────── state: keyword analysis ─────────── */
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [positiveKeywords, setPositiveKeywords] = useState({}); // { kw: active }
  const [negativeKeywords, setNegativeKeywords] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /* ─────────────────────────────────────────────────────────────
     Helper: search restaurants
     GET /search_restaurant_es?name=…&size=10
  ───────────────────────────────────────────────────────────── */
  const searchRestaurants = async () => {
    if (!searchQuery.trim()) return;
    try {
      const url = `${API_ROOT}/search_restaurant_es?name=${encodeURIComponent(
        searchQuery.trim()
      )}&size=50`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json(); // { success, result }
      if (data.success && Array.isArray(data.result)) {
        setRestaurantList(data.result); // result items already contain address
        setShowDropdown(true);
      } else {
        setRestaurantList([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error(err);
      alert("식당 검색 중 오류가 발생했습니다.");
    }
  };

  /* allow ⏎ as well as click */
  const handleSearchKeyDown = (e) =>
    e.key === "Enter" && (e.preventDefault(), searchRestaurants());
  const handleSearchButton = () => searchRestaurants();

  /* choose from dropdown */
  const handleSelectRestaurant = (item) => {
    setSelectedRestaurant(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
  };

  /* ────────────────────────────────────────────────
     Helper: local image selection for previews
  ──────────────────────────────────────────────── */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const blobs = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files]);
    setImagePrev((prev) => [...prev, ...blobs]);
  };
  const handleDeleteImage = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePrev((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ────────────────────────────────────────────────
     Helper: keyword analysis POST /analyze_review
  ──────────────────────────────────────────────── */
  const handleAnalysis = async () => {
    if (isAnalyzing || analysisComplete) return;
    if (!reviewText.trim()) {
      alert("리뷰 내용을 입력해주세요.");
      return;
    }
    setIsAnalyzing(true);

    // Simulate 1 s analysis to show spinner
    setTimeout(async () => {
      try {
        const payload = {
          name: selectedRestaurant?.name || searchQuery || "알수없음",
          one_liner: oneLiner,
          text: reviewText,
        };
        const res = await fetch(`${API_ROOT}/analyze_review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json(); // [{ keyword, sentiment }]
        const pos = {};
        const neg = {};
        data.forEach(({ keyword, sentiment }) =>
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
    }, 1000);
  };

  /* ────────────────────────────────────────────────
     Helper: save review (uploads → POST /reviews)
  ──────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!selectedRestaurant) {
      alert("식당을 선택해주세요.");
      return;
    }
    if (!analysisComplete) {
      alert("분석을 먼저 완료해주세요.");
      return;
    }

    try {
      /* 1) upload images */
      const uploadResults = await Promise.all(
        imageFiles.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const url = `${API_ROOT}/reviews/${userID}/images?review_id=${REVIEW_FIX}`;
          const res = await fetch(url, { method: "POST", body: fd });
          if (!res.ok) throw new Error(`Image upload failed (${res.status})`);
          return res.json(); // { key, public_url }
        })
      );
      const photoFilenames = uploadResults.map((x) => x.key);
      const photoUrls = uploadResults.map((x) => x.public_url);

      /* 2) build review body */
      const body = {
        user_id: userID,
        restaurant_id: selectedRestaurant.r_id,
        comments: oneLiner,
        review: reviewText,
        photo_filenames: photoFilenames,
        photo_urls: photoUrls,
        positive_keywords: Object.keys(positiveKeywords).filter(
          (k) => positiveKeywords[k]
        ),
        negative_keywords: Object.keys(negativeKeywords).filter(
          (k) => negativeKeywords[k]
        ),
      };

      /* 3) POST */
      const res = await fetch(`${API_ROOT}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Review POST failed (${res.status})`);
      const { review_id } = await res.json();
      alert(`리뷰가 등록되었습니다 (ID: ${review_id}).`);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert(`저장 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const handleCancel = () =>
    window.confirm("해당 글이 저장되지 않습니다.") && navigate("/");

  /* click‑outside closes dropdown */
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
    <div className="newpage-container">
      <Header />
      {isAnalyzing && <LoadingSpinner />}
      <div className="newpage-content">
        <main className="newpage-main">
          <div className="newpage-wrapper">
            {/* header row */}
            <div className="newpage-top">
              <h1>글쓰기</h1>
            </div>

            {/* two‑column */}
            <div className="newpage-bottom">
              {/* column 1 – photos */}
              <div className="newpage-left">
                <div
                  className="newpage-photo-upload"
                  onClick={() => document.getElementById("imageInput").click()}
                >
                  <TbPhotoPlus size={30} color="#aaa" />
                  <input
                    id="imageInput"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                </div>

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
                        onClick={() => handleDeleteImage(idx)}
                        className="delete-image-button"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* column 2 – form */}
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
                      onClick={handleSearchButton}
                      aria-label="search"
                    >
                      <FiSearch size={18} />
                    </button>

                    {/* dropdown */}
                    {showDropdown && restaurantList.length > 0 && (
                      <ul
                        className="restaurant-dropdown"
                        ref={dropdownRef}
                      >
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
                      </ul>
                    )}
                    {/* no‑result notice */}
                    {showDropdown && restaurantList.length === 0 && (
                      <p className="no-results-message">
                        검색 결과가 없습니다.
                      </p>
                    )}
                  </div>

                  {/* one‑liner & review textarea */}
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

                  {/* analysis button */}
                  <button
                    onClick={handleAnalysis}
                    className="analysis-button"
                    disabled={isAnalyzing || analysisComplete}
                  >
                    {isAnalyzing
                      ? "분석 중..."
                      : analysisComplete
                      ? "분석 완료"
                      : "분석 시작"}
                  </button>
                </div>

                {/* analysis result */}
                {analysisComplete && (
                  <div className="analysis-results">
                    <div className="keyword-sections-container">
                      {/* positive */}
                      <div className="keyword-type-section">
                        <h2>긍정 키워드</h2>
                        <div className="newpage-keyword-section">
                          {Object.entries(positiveKeywords).map(
                            ([kw, active]) => (
                              <button
                                key={kw}
                                className={`new-positive-button ${
                                  active ? "active" : ""
                                }`}
                                onClick={() =>
                                  setPositiveKeywords((prev) => ({
                                    ...prev,
                                    [kw]: !prev[kw],
                                  }))
                                }
                              >
                                {kw}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* negative */}
                      <div className="keyword-type-section">
                        <h2>부정 키워드</h2>
                        <div className="newpage-keyword-section">
                          {Object.entries(negativeKeywords).map(
                            ([kw, active]) => (
                              <button
                                key={kw}
                                className={`new-nagative-button ${
                                  active ? "active" : ""
                                }`}
                                onClick={() =>
                                  setNegativeKeywords((prev) => ({
                                    ...prev,
                                    [kw]: !prev[kw],
                                  }))
                                }
                              >
                                {kw}
                              </button>
                            )
                          )}
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
                      <button onClick={handleSave} className="save-button">
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
};

export default NewPage;
