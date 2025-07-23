import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import { TbPhotoPlus } from "react-icons/tb";
import { FiSearch } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import "./EditPage.css";

/* ───────────────────────── constants ───────────────────────── */
const API_ROOT = "/api";
const USER_ID = 9; // Fallback

/* tiny helper */
const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/* ───────────────────────── component ───────────────────────── */
const EditPage = () => {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const originalRef = useRef(null);
  const { user } = useAuth();
  const userID = user?.user_id ?? USER_ID;

  /* photo handling */
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePrev, setImagePrev] = useState([]);

  /* restaurant search */
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurantList, setRestaurantList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  /* texts */
  const [oneLiner, setOneLiner] = useState("");
  const [reviewText, setReviewText] = useState("");

  /* keywords */
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [positiveKeywords, setPositiveKeywords] = useState({});
  const [negativeKeywords, setNegativeKeywords] = useState({});

  /* ───────────── initial review fetch ───────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}/get_review/${reviewId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        originalRef.current = data;

        /* fill fields */
        setOneLiner(data.comments || "");
        setReviewText(data.review || "");
        setSearchQuery(data.restaurant_name || "");
        setSelectedRestaurant({
          r_id: data.restaurant_id,
          name: data.restaurant_name,
          address: data.restaurant_address ?? "",
        });

        /* keyword maps */
        const pos = {};
        const neg = {};
        data.positive_keywords.forEach((k) => (pos[k] = true));
        data.negative_keywords.forEach((k) => (neg[k] = true));
        setPositiveKeywords(pos);
        setNegativeKeywords(neg);

        /* photos */
        setImagePrev(data.photo_urls || []);

        /* show analysis immediately */
        setAnalysisComplete(true);
      } catch (err) {
        console.error(err);
        alert(`리뷰 정보를 불러오지 못했습니다: ${err.message}`);
        navigate(-1);
      }
    })();
  }, [reviewId, navigate]);

  /* ───────────── restaurant search ───────────── */
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
        setRestaurantList(data.result);
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
  const handleSearchKeyDown = (e) =>
    e.key === "Enter" && (e.preventDefault(), searchRestaurants());
  const handleSelectRestaurant = (r) => {
    setSelectedRestaurant(r);
    setSearchQuery(r.name);
    setShowDropdown(false);
  };

  /* click‑away closes dropdown */
  useEffect(() => {
    const onClickAway = (e) =>
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target) &&
      setShowDropdown(false);
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  /* ───────────── photo selection ───────────── */
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

  /* ───────────── keyword (re)analysis ───────────── */
  const handleAnalysis = async () => {
    if (isAnalyzing) return;
    if (!reviewText.trim()) {
      alert("리뷰 내용을 입력해주세요.");
      return;
    }
    setIsAnalyzing(true);
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
      const arr = await res.json(); // [{ keyword, sentiment }]
      const pos = {};
      const neg = {};
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

  /* ───────────── delete review ───────────── */
  const handleDeleteReview = () => {
    if (window.confirm("이 리뷰를 정말 삭제하시겠습니까?")) {
      fetch(`${API_ROOT}/delete_reviews/${reviewId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          alert("리뷰가 삭제되었습니다.");
          navigate("/");
        })
        .catch((err) => {
          console.error(err);
          alert(`삭제 실패: ${err.message}`);
        });
    }
  };

  /* ───────────── save PATCH ───────────── */
  const handleSave = useCallback(async () => {
    if (!originalRef.current) return;
    const orig = originalRef.current;

    /* 1) upload NEW images */
    let addedFilenames = [];
    let addedUrls = [];
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
        addedFilenames = uploaded.map((x) => x.key);
        addedUrls = uploaded.map((x) => x.public_url);
      } catch (err) {
        console.error(err);
        alert(`사진 업로드 오류: ${err.message}`);
        return;
      }
    }

    /* 2) kept originals */
    const keptUrls = orig.photo_urls.filter((url) => imagePrev.includes(url));
    const keptFns = orig.photo_filenames.filter((_, i) =>
      imagePrev.includes(orig.photo_urls[i])
    );

    /* 3) final lists */
    const finalPhotoUrls = [...keptUrls, ...addedUrls];
    const finalPhotoFilenames = [...keptFns, ...addedFilenames];

    /* 4) diff → payload */
    const payload = {};
    if (
      selectedRestaurant?.r_id &&
      selectedRestaurant.r_id !== orig.restaurant_id
    )
      payload.restaurant_id = selectedRestaurant.r_id;
    if (oneLiner !== orig.comments) payload.comments = oneLiner;
    if (reviewText !== orig.review) payload.review = reviewText;
    if (!arraysEqual(finalPhotoFilenames, orig.photo_filenames))
      payload.photo_filenames = finalPhotoFilenames;
    if (!arraysEqual(finalPhotoUrls, orig.photo_urls))
      payload.photo_urls = finalPhotoUrls;

    const curPos = Object.keys(positiveKeywords).filter(
      (k) => positiveKeywords[k]
    );
    const curNeg = Object.keys(negativeKeywords).filter(
      (k) => negativeKeywords[k]
    );
    if (!arraysEqual(curPos, orig.positive_keywords))
      payload.positive_keywords = curPos;
    if (!arraysEqual(curNeg, orig.negative_keywords))
      payload.negative_keywords = curNeg;

    if (Object.keys(payload).length === 0) {
      alert("수정된 내용이 없습니다.");
      return;
    }

    /* 5) PUT */
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
    imageFiles,
    imagePrev,
    oneLiner,
    reviewText,
    positiveKeywords,
    negativeKeywords,
    selectedRestaurant,
    navigate,
    reviewId,
    userID,
  ]);

  const handleCancel = () =>
    window.confirm("해당 글이 저장되지 않습니다.") && navigate("/");

  /* ───────────── render ───────────── */
  return (
    <div className="editpage-container">
      <Header />
      {isAnalyzing && <LoadingSpinner />}
      <div className="editpage-content">
        <main className="editpage-main">
          <div className="editpage-wrapper">
            {/* page header */}
            <div className="editpage-top">
              <div className="page-title-with-delete">
                <h1>글편집</h1>
                <button className="delete-button" onClick={handleDeleteReview}>
                  삭제
                </button>
              </div>
            </div>

            {/* two‑column */}
            <div className="editpage-bottom">
              {/* column 1 – photos */}
              <div className="editpage-left">
                <div
                  className="editpage-photo-upload"
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
                <div className="editpage-image-preview-container">
                  {imagePrev.map((src, idx) => (
                    <div key={idx} className="editpage-image-preview-wrapper">
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
              <div className="editpage-right">
                <div className="editpage-inputs">
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
                      onClick={searchRestaurants}
                      aria-label="search"
                    >
                      <FiSearch size={18} />
                    </button>

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
                    {showDropdown && restaurantList.length === 0 && (
                      <p className="no-results-message">검색 결과가 없습니다.</p>
                    )}
                  </div>

                  {/* texts */}
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

                  {/* re‑analysis */}
                  <button
                    onClick={handleAnalysis}
                    className="analysis-button"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? "분석 중…" : "재분석"}
                  </button>
                </div>

                {/* keywords + action buttons */}
                {analysisComplete && (
                  <div className="analysis-results">
                    <div className="keyword-sections-container">
                      {/* positive */}
                      <div className="keyword-type-section">
                        <h2>긍정 키워드</h2>
                        <div className="editpage-keyword-section">
                          {Object.entries(positiveKeywords).map(
                            ([kw, active]) => (
                              <button
                                key={kw}
                                className={`edit-positive-button ${
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
                        <div className="editpage-keyword-section">
                          {Object.entries(negativeKeywords).map(
                            ([kw, active]) => (
                              <button
                                key={kw}
                                className={`edit-nagative-button ${
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

export default EditPage;
