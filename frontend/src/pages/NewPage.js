import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { TbPhotoPlus } from 'react-icons/tb';
import { FiSearch }    from 'react-icons/fi';
import './NewPage.css';


const API_ROOT   = '/api';
const USER_ID    = 1;      // TODO: auth
const REVIEW_FIX = 1000;   // temporary review_id for image uploads

const NewPage = () => {
  /* ─────────── navigation ─────────── */
  const navigate = useNavigate();

  /* ───── refs ───── */
  const dropdownRef = useRef(null);

  /* ───── state: images ───── */
  const [imageFiles, setImageFiles] = useState([]);  // File objects
  const [imagePrev,  setImagePrev]  = useState([]);  // blob URLs

  /* ───── state: restaurant search ───── */
  const [searchQuery,        setSearchQuery]        = useState('');
  const [restaurantList,     setRestaurantList]     = useState([]);
  const [showDropdown,       setShowDropdown]       = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null); // { r_id, name }

  /* ───── state: review text ───── */
  const [oneLiner,   setOneLiner]   = useState('');
  const [reviewText, setReviewText] = useState('');

  /* ───── state: keyword analysis ───── */
  const [analysisComplete,  setAnalysisComplete]  = useState(false);
  const [positiveKeywords,  setPositiveKeywords]  = useState({}); // { kw: active }
  const [negativeKeywords,  setNegativeKeywords]  = useState({});

  /* ──────────────────────────────────────────────────────────────
     Helper: restaurant search
     GET /search_restaurant_es?name=…&size=10
  ────────────────────────────────────────────────────────────── */
  const searchRestaurants = async () => {
    if (!searchQuery.trim()) return;
    try {
      const url =
        `${API_ROOT}/search_restaurant_es?name=${encodeURIComponent(searchQuery.trim())}&size=10`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();         // { success, result }
      if (data.success && Array.isArray(data.result)) {
        setRestaurantList(data.result);
        setShowDropdown(true);
      } else {
        setRestaurantList([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error(err);
      alert('식당 검색 중 오류가 발생했습니다.');
    }
  };

  /* allow ⏎ as well as the 🔍 icon */
  const handleSearchKeyDown   = (e) => e.key === 'Enter' && (e.preventDefault(), searchRestaurants());
  const handleSearchButton    = ()  => searchRestaurants();
  const handleSelectRestaurant = (item) => {
    setSelectedRestaurant(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
  };

  /* ──────────────────────────────────────────────────────────────
     Helper: handle local image selection
  ────────────────────────────────────────────────────────────── */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);                 // File[]
    const blobs = files.map((f) => URL.createObjectURL(f));   // for preview
    setImageFiles((prev) => [...prev, ...files]);
    setImagePrev ((prev) => [...prev, ...blobs]);
  };

  const handleDeleteImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePrev((prev) => prev.filter((_, i) => i !== index));
  };

  /* ──────────────────────────────────────────────────────────────
     Helper: toggle keyword on/off
  ────────────────────────────────────────────────────────────── */
  const toggleKeyword = (type, kw) => {
    if (type === 'positive') {
      setPositiveKeywords((prev) => ({ ...prev, [kw]: !prev[kw] }));
    } else {
      setNegativeKeywords((prev) => ({ ...prev, [kw]: !prev[kw] }));
    }
  };

  /* ──────────────────────────────────────────────────────────────
     Helper: keyword analysis POST /analyze_review
  ────────────────────────────────────────────────────────────── */
  const handleAnalysis = async () => {
    if (!reviewText.trim()) { alert('리뷰 내용을 입력해주세요.'); return; }
    try {
      const payload = {
        name:        selectedRestaurant?.name || searchQuery || '알수없음',
        one_liner:   oneLiner,
        text:        reviewText,
      };
      const res = await fetch(`${API_ROOT}/analyze_review`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();          // [{ keyword, sentiment }]
      const pos  = {};
      const neg  = {};
      data.forEach(({ keyword, sentiment }) =>
        (sentiment === 'positive' ? pos : neg)[keyword] = true
      );
      setPositiveKeywords(pos);
      setNegativeKeywords(neg);
      setAnalysisComplete(true);
    } catch (err) {
      console.error(err);
      alert('키워드 분석 중 오류가 발생했습니다.');
    }
  };

  /* ──────────────────────────────────────────────────────────────
     Helper: Save (upload images first, then create review)
  ────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    /* basic validation – you may customise further */
    if (!selectedRestaurant) { alert('식당을 선택해주세요.'); return; }
    if (!analysisComplete)   { alert('분석을 먼저 완료해주세요.'); return; }

    try {
      /* 1) upload every image (if any) */
      const uploadResults = await Promise.all(
        imageFiles.map(async (file) => {
          const fd  = new FormData();
          fd.append('file', file);
          const url = `${API_ROOT}/reviews/${USER_ID}/images?review_id=${REVIEW_FIX}`;
          const res = await fetch(url, { method: 'POST', body: fd });
          if (!res.ok) throw new Error(`Image upload failed (${res.status})`);
          return res.json(); // { ok, key, public_url }
        })
      );

      const photoFilenames = uploadResults.map((x) => x.key);
      const photoUrls      = uploadResults.map((x) => x.public_url);

      /* 2) build review payload */
      const body = {
        user_id          : USER_ID,
        restaurant_id    : selectedRestaurant.r_id,
        comments         : oneLiner,
        review           : reviewText,
        photo_filenames  : photoFilenames,
        photo_urls       : photoUrls,
        positive_keywords: Object.keys(positiveKeywords).filter((k) => positiveKeywords[k]),
        negative_keywords: Object.keys(negativeKeywords).filter((k) => negativeKeywords[k]),
      };

      /* 3) create review */
      const res = await fetch(`${API_ROOT}/reviews`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Review POST failed (${res.status})`);
      const { review_id } = await res.json();

      alert(`리뷰가 등록되었습니다 (ID: ${review_id}).`);
      navigate('/');      // back to homepage
    } catch (err) {
      console.error(err);
      alert(`저장 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  /* cancel */
  const handleCancel = () => window.confirm('해당 글이 저장되지 않습니다.') && navigate('/');

  /* click‑outside to close dropdown */
  useEffect(() => {
    const onClickAway = (e) =>
      dropdownRef.current && !dropdownRef.current.contains(e.target) && setShowDropdown(false);
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  /* ──────────────────────────────────────────────────────────────
     render
  ────────────────────────────────────────────────────────────── */
  return (
    <div className="makepage-container">
      <Header />
      <div className="makepage-content">
        <main className="makepage-main">
          <div className="makepage-wrapper">

            {/* header row */}
            <div className="makepage-top">
              <div className="page-title-with-delete">
                <h1>글쓰기</h1>
              </div>
            </div>

            {/* ─── main two‑column grid ─── */}
            <div className="makepage-bottom">
              {/* left: image picker */}
              <div className="makepage-left">
                <div
                  className="makepage-photo-upload"
                  onClick={() => document.getElementById('imageInput').click()}
                >
                  <TbPhotoPlus size={30} color="#aaa" />
                  <input
                    id="imageInput"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* previews */}
                <div className="image-preview-container">
                  {imagePrev.map((src, idx) => (
                    <div key={idx} className="image-preview-wrapper">
                      <img src={src} alt={`preview-${idx}`} className="image-preview" />
                      <button onClick={() => handleDeleteImage(idx)} className="delete-image-button">X</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* right: review form */}
              <div className="makepage-right">
                <div className="makepage-inputs">
                  {/* restaurant finder */}
                  <div className="restaurant-search-container">
                    <input
                      className="restaurant-search-input"
                      type="text"
                      placeholder="식당이름 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                    />
                    <button
                      className="restaurant-search-button"
                      onClick={handleSearchButton}
                      aria-label="search"
                    >
                      <FiSearch size={18} />
                    </button>

                    {showDropdown && restaurantList.length > 0 && (
                      <ul className="restaurant-dropdown" ref={dropdownRef}>
                        {restaurantList.map((r) => (
                          <li
                            key={r.r_id}
                            className="restaurant-dropdown-item"
                            onClick={() => handleSelectRestaurant(r)}
                          >
                            {r.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* one‑liner + review */}
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
                    disabled={analysisComplete}
                  >
                    {analysisComplete ? '분석 완료' : '분석 시작'}
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
                          {Object.entries(positiveKeywords).map(([kw, active]) => (
                            <button
                              key={kw}
                              className={`new-positive-button ${active ? 'active' : ''}`}
                              onClick={() => toggleKeyword('positive', kw)}
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
                              className={`new-nagative-button ${active ? 'active' : ''}`}
                              onClick={() => toggleKeyword('negative', kw)}
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* save / cancel */}
                    <div className="action-buttons">
                      <button onClick={handleCancel} className="cancel-button">취소</button>
                      <button onClick={handleSave}   className="save-button">저장</button>
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
