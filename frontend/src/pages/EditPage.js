import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header                    from "../components/Header";
import { TbPhotoPlus }           from "react-icons/tb";
import { FiSearch }              from "react-icons/fi";
import { useAuth }               from "../contexts/AuthContext";
import LoadingSpinner            from "../components/LoadingSpinner";
import "./EditPage.css";

/* ───────────────────────── constants ───────────────────────── */
const API_ROOT = "/api";
const USER_ID  = 9;       // fallback when anonymous

/* helper */
const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export default function EditPage () {
  const { reviewId }  = useParams();
  const navigate      = useNavigate();
  const dropdownRef   = useRef(null);
  const originalRef   = useRef(null);
  const { user }      = useAuth();
  const userID        = user?.user_id ?? USER_ID;

  /* photos */
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePrev,  setImagePrev]  = useState([]);

  /* restaurant search */
  const [searchQuery,        setSearchQuery]        = useState("");
  const [restaurantList,     setRestaurantList]     = useState([]);
  const [showDropdown,       setShowDropdown]       = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  /* texts */
  const [oneLiner,   setOneLiner]   = useState("");
  const [reviewText, setReviewText] = useState("");

  /* keywords */
  const [analysisComplete,  setAnalysisComplete]  = useState(false);
  const [isAnalyzing,       setIsAnalyzing]       = useState(false);
  const [positiveKeywords,  setPositiveKeywords]  = useState({});
  const [negativeKeywords,  setNegativeKeywords]  = useState({});

  /* ───────────────── initial fetch ───────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}/get_review/${reviewId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        originalRef.current = data;

        setOneLiner(data.comments ?? "");
        setReviewText(data.review ?? "");
        setSearchQuery(data.restaurant_name ?? "");
        setSelectedRestaurant({
          r_id:     data.restaurant_id,
          name:     data.restaurant_name,
          address:  data.restaurant_address ?? "",
        });
        /* keywords */
        const pos = {}, neg = {};
        data.positive_keywords.forEach((k) => (pos[k] = true));
        data.negative_keywords.forEach((k) => (neg[k] = true));
        setPositiveKeywords(pos);
        setNegativeKeywords(neg);
        /* photos */
        setImagePrev(data.photo_urls ?? []);
        setAnalysisComplete(true);
      } catch (err) {
        console.error(err);
        alert(`리뷰 데이터를 불러오지 못했습니다: ${err.message}`);
        navigate(-1);
      }
    })();
  }, [reviewId, navigate]);

  /* restaurant search */
  const searchRestaurants = async () => {
    if (!searchQuery.trim()) return;
    try {
      const url = `${API_ROOT}/search_restaurant_es?name=${encodeURIComponent(searchQuery.trim())}&size=10`;
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

  /* dropdown auto‑close */
  useEffect(() => {
    const clickAway = (e) =>
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target) &&
      setShowDropdown(false);
    document.addEventListener("mousedown", clickAway);
    return () => document.removeEventListener("mousedown", clickAway);
  }, []);

  /* image helpers */
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

  /* keyword re‑analysis */
  const handleAnalysis = async () => {
    if (isAnalyzing) return;
    if (!reviewText.trim()) {
      alert("리뷰 내용을 입력해주세요.");
      return;
    }
    setIsAnalyzing(true);
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
      const arr = await res.json();
      const pos = {}, neg = {};
      arr.forEach(({ keyword, sentiment }) =>
        (sentiment === "positive" ? pos : neg)[keyword] = true
      );
      setPositiveKeywords(pos);
      setNegativeKeywords(neg);
      setAnalysisComplete(true);
    } catch (err) {
      console.error(err);
      alert(`키워드 분석 중 오류: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* delete review */
  const handleDeleteReview = () => {
    if (!window.confirm("이 리뷰를 삭제하시겠습니까?")) return;
    fetch(`${API_ROOT}/delete_reviews/${reviewId}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        alert("리뷰가 삭제되었습니다.");
        navigate("/");
      })
      .catch((err) => {
        console.error(err);
        alert(`삭제 실패: ${err.message}`);
      });
  };

  /* save PATCH */
  const handleSave = useCallback(async () => {
    if (!originalRef.current) return;
    const orig = originalRef.current;

    /* upload NEW images */
    let addedFns = [], addedUrls = [];
    if (imageFiles.length) {
      try {
        const uploaded = await Promise.all(
          imageFiles.map(async (file) => {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(
              `${API_ROOT}/reviews/${userID}/images?review_id=${reviewId}`,
              { method: "POST", body: fd }
            );
            if (!res.ok) throw new Error(`upload HTTP ${res.status}`);
            return res.json(); // { key, public_url }
          })
        );
        addedFns  = uploaded.map((x) => x.key);
        addedUrls = uploaded.map((x) => x.public_url);
      } catch (err) {
        console.error(err);
        alert(`사진 업로드 오류: ${err.message}`);
        return;
      }
    }

    /* kept originals */
    const keptUrls = orig.photo_urls.filter((url) => imagePrev.includes(url));
    const keptFns  = orig.photo_filenames.filter((_, i) =>
      imagePrev.includes(orig.photo_urls[i])
    );

    /* final arrays */
    const finalUrls = [...keptUrls, ...addedUrls];
    const finalFns  = [...keptFns,  ...addedFns];

    /* diff */
    const payload = {};
    if (selectedRestaurant?.r_id && selectedRestaurant.r_id !== orig.restaurant_id)
      payload.restaurant_id = selectedRestaurant.r_id;
    if (oneLiner   !== orig.comments)           payload.comments           = oneLiner;
    if (reviewText !== orig.review)             payload.review             = reviewText;
    if (!arraysEqual(finalFns,  orig.photo_filenames)) payload.photo_filenames = finalFns;
    if (!arraysEqual(finalUrls, orig.photo_urls))      payload.photo_urls      = finalUrls;

    const curPos = Object.keys(positiveKeywords).filter((k) => positiveKeywords[k]);
    const curNeg = Object.keys(negativeKeywords).filter((k) => negativeKeywords[k]);
    if (!arraysEqual(curPos, orig.positive_keywords)) payload.positive_keywords = curPos;
    if (!arraysEqual(curNeg, orig.negative_keywords)) payload.negative_keywords = curNeg;

    if (Object.keys(payload).length === 0)
      return alert("수정된 내용이 없습니다.");

    try {
      const res = await fetch(`${API_ROOT}/update_reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("리뷰가 수정되었습니다.");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert(`저장 실패: ${err.message}`);
    }
  }, [
    imageFiles, imagePrev, oneLiner, reviewText,
    positiveKeywords, negativeKeywords,
    selectedRestaurant, navigate, reviewId, userID,
  ]);

  const handleCancel = () =>
    window.confirm("해당 글이 저장되지 않습니다.") && navigate("/");

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="editpage-container">
      <Header />
      {isAnalyzing && <LoadingSpinner />}
      <div className="editpage-content">
        <main className="editpage-main">
          <div className="editpage-wrapper">
            <div className="editpage-top">
              <div className="page-title-with-delete">
                <h1>글편집</h1>
                <button className="delete-button" onClick={handleDeleteReview}>
                  삭제
                </button>
              </div>
            </div>

            <div className="editpage-bottom">
              {/* left column */}
              <div className="editpage-left">
                {/* previews */}
                <div className="editpage-image-preview-container">
                  {imagePrev.map((src, idx) => (
                    <div key={idx} className="editpage-image-preview-wrapper">
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
                  className="editpage-photo-upload"
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

              {/* right column */}
              <div className="editpage-right">
                <div className="editpage-inputs">
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
                  <button
                    onClick={handleAnalysis}
                    className="analysis-button"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? "분석 중…" : "재분석"}
                  </button>
                </div>

                {analysisComplete && (
                  <div className="analysis-results">
                    <div className="keyword-sections-container">
                      {/* positive */}
                      <div className="keyword-type-section">
                        <h2>긍정 키워드</h2>
                        <div className="editpage-keyword-section">
                          {Object.entries(positiveKeywords).map(([kw, active]) => (
                            <button
                              key={kw}
                              className={`edit-positive-button ${active ? "active" : ""}`}
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
                        <div className="editpage-keyword-section">
                          {Object.entries(negativeKeywords).map(([kw, active]) => (
                            <button
                              key={kw}
                              className={`edit-nagative-button ${active ? "active" : ""}`}
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

                    <div className="action-buttons">
                      <button className="cancel-button" onClick={handleCancel}>
                        취소
                      </button>
                      <button className="save-button" onClick={handleSave}>
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