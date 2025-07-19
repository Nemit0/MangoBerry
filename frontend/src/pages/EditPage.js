/* -----------------------------------------------------------------------
   EditPage.js ― fully rewritten
   ‑ Accessed as  /edit/:reviewId      (reviewId URL param)
   ‑ On mount:    GET  /get_review/{id}        → fill form
   ‑ On “저장”:    PUT /update_reviews/{id}     (only changed fields)
   ‑ Structure intentionally mirrors NewPage.js to keep UI consistent.
   --------------------------------------------------------------------- */

import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header           from '../components/Header';
import { TbPhotoPlus }  from 'react-icons/tb';
import { FiSearch }     from 'react-icons/fi';        // optional: keep search UI
import './EditPage.css';

/* ───────────────────────────── constants ────────────────────────────── */
const API_ROOT = '/api';      // CRA proxy rewrites to FastAPI
const USER_ID  = 9;           // TODO: auth context

/* helpers */
const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/* ───────────────────────────── component ────────────────────────────── */
const EditPage = () => {
  const { reviewId } = useParams();           // URL param
  const navigate     = useNavigate();
  const dropdownRef  = useRef(null);          // close restaurant dropdown on click‑away

  /* original review snapshot (ref so it never triggers re‑render) */
  const originalRef = useRef(null);

  /* ── state mirrors NewPage ── */
  const [imageFiles, setImageFiles] = useState([]);   // new File[] to upload
  const [imagePrev,  setImagePrev]  = useState([]);   // preview URLs (existing + new)

  /* editable fields */
  const [searchQuery,        setSearchQuery]        = useState('');  // restaurant name (display)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null); // { r_id, name }

  const [showDropdown,   setShowDropdown]   = useState(false);
  const [restaurantList, setRestaurantList] = useState([]);

  const [oneLiner,   setOneLiner]   = useState('');
  const [reviewText, setReviewText] = useState('');

  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [positiveKeywords, setPositiveKeywords] = useState({}); // { kw: active }
  const [negativeKeywords, setNegativeKeywords] = useState({});

  /* ─────────────────────────── load existing review ──────────────────── */
  useEffect(() => {
    /* immediately‑invoked async fn */
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}/get_review/${reviewId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();          // full review payload
        console.log('Loaded review:', data);
        originalRef.current = data;             // keep raw snapshot

        /* fill inputs */
        setOneLiner(data.comments || '');
        setReviewText(data.review || '');
        setSearchQuery('');                     // optional: show name later
        setSelectedRestaurant({ r_id : data.restaurant_id, name : '' });

        /* keywords → object map */
        const pos  = {};
        const neg  = {};
        data.positive_keywords.forEach((k) => { pos[k] = true; });
        data.negative_keywords.forEach((k) => { neg[k] = true; });
        setPositiveKeywords(pos);
        setNegativeKeywords(neg);

        /* existing photos */
        setImagePrev(data.photo_urls || []);
      } catch (err) {
        console.error(err);
        alert(`리뷰 정보를 불러오지 못했습니다: ${err.message}`);
        navigate(-1);
      }
    })();
  }, [reviewId, navigate]);

  /* ──────────────────────── restaurant search (optional) ─────────────── */
  const searchRestaurants = async () => {
    if (!searchQuery.trim()) return;
    try {
      const url = `${API_ROOT}/search_restaurant_es?name=${encodeURIComponent(searchQuery.trim())}&size=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
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
  const handleSearchKeyDown = (e) =>
    e.key === 'Enter' && (e.preventDefault(), searchRestaurants());
  const handleSelectRestaurant = (r) => {
    setSelectedRestaurant(r);
    setSearchQuery(r.name);
    setShowDropdown(false);
  };

  /* click‑outside to close dropdown */
  useEffect(() => {
    const onClickAway = (e) =>
      dropdownRef.current && !dropdownRef.current.contains(e.target) && setShowDropdown(false);
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  /* ───────────────────────── photo picking / preview ─────────────────── */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const blobs = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files]);
    setImagePrev ((prev) => [...prev, ...blobs]);
  };

  /* ───────────────────────── keyword analysis ────────────────────────── */
  const handleAnalysis = async () => {
    if (!reviewText.trim()) { alert('리뷰 내용을 입력해주세요.'); return; }
    try {
      const payload = {
        name: selectedRestaurant?.name || searchQuery || '알수없음',
        one_liner: oneLiner,
        text: reviewText,
      };
      const res = await fetch(`${API_ROOT}/analyze_review`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.json();           // [{ keyword, sentiment }]
      const pos = {}; const neg = {};
      arr.forEach(({ keyword, sentiment }) =>
        (sentiment === 'positive' ? pos : neg)[keyword] = true
      );
      setPositiveKeywords(pos);
      setNegativeKeywords(neg);
      setAnalysisComplete(true);
    } catch (err) {
      console.error(err);
      alert(`키워드 분석 중 오류: ${err.message}`);
    }
  };
  const toggleKeyword = (type, kw) => {
    if (type === 'positive') {
      setPositiveKeywords((prev) => ({ ...prev, [kw]: !prev[kw] }));
    } else {
      setNegativeKeywords((prev) => ({ ...prev, [kw]: !prev[kw] }));
    }
  };

  /* ─────────────────────────── save (PUT) ────────────────────────────── */
  const handleSave = useCallback(async () => {
    if (!originalRef.current) return;     // still loading
    const orig = originalRef.current;

    /* 1) upload *new* images (if any) */
    let addedFilenames = [];
    let addedUrls      = [];
    if (imageFiles.length) {
      try {
        const uploadResults = await Promise.all(
          imageFiles.map(async (file) => {
            const fd  = new FormData();
            fd.append('file', file);
            const url = `${API_ROOT}/reviews/${USER_ID}/images?review_id=${reviewId}`;
            const res = await fetch(url, { method: 'POST', body: fd });
            if (!res.ok) throw new Error(`upload HTTP ${res.status}`);
            return res.json();            // { ok, key, public_url }
          })
        );
        addedFilenames = uploadResults.map((x) => x.key);
        addedUrls      = uploadResults.map((x) => x.public_url);
      } catch (err) {
        console.error(err);
        alert(`사진 업로드 오류: ${err.message}`);
        return;
      }
    }

    /* 2) build PATCH payload with only changed fields */
    const payload = {};

    /* restaurant change (rare) */
    if (selectedRestaurant?.r_id &&
        selectedRestaurant.r_id !== orig.restaurant_id) {
      payload.restaurant_id = selectedRestaurant.r_id;
    }

    if (oneLiner !== orig.comments) payload.comments = oneLiner;
    if (reviewText !== orig.review) payload.review = reviewText;

    /* photos */
    if (addedFilenames.length) {
      payload.photo_filenames = [...(orig.photo_filenames || []), ...addedFilenames];
      payload.photo_urls      = [...(orig.photo_urls      || []), ...addedUrls];
    }

    /* keywords */
    const curPos = Object.keys(positiveKeywords).filter((k) => positiveKeywords[k]);
    const curNeg = Object.keys(negativeKeywords).filter((k) => negativeKeywords[k]);
    if (!arraysEqual(curPos, orig.positive_keywords)) payload.positive_keywords = curPos;
    if (!arraysEqual(curNeg, orig.negative_keywords)) payload.negative_keywords = curNeg;

    /* nothing changed? */
    if (Object.keys(payload).length === 0) {
      alert('수정된 내용이 없습니다.');
      return;
    }

    /* 3) PUT update */
    try {
      const res = await fetch(`${API_ROOT}/update_reviews/${reviewId}`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert('리뷰가 수정되었습니다.');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert(`저장 실패: ${err.message}`);
    }
  }, [imageFiles, oneLiner, reviewText, positiveKeywords,
      negativeKeywords, selectedRestaurant, navigate, reviewId]);

  /* ─────────────────────────── cancel ────────────────────────────────── */
  const handleCancel = () =>
    window.confirm('해당 글이 저장되지 않습니다.') && navigate('/');

  /* ─────────────────────────── render ────────────────────────────────── */
  return (
    <div className="makepage-container">
      <Header />
      <div className="makepage-content">

        <main className="makepage-main">
          <div className="makepage-wrapper">

            {/* header row */}
            <div className="makepage-top">
              <div className="page-title-with-delete">
                <h1>글편집</h1>
                {/* delete button visibility left as‑is */}
                <button className="delete-button" style={{ visibility: 'hidden' }}>삭제</button>
              </div>
            </div>

            {/* two‑column grid */}
            <div className="makepage-bottom">
              {/* left: photo upload */}
              <div className="makepage-left">
                <div
                  className="makepage-photo-upload"
                  onClick={() => document.getElementById('imageInput').click()}
                >
                  <TbPhotoPlus size={50} color="#aaa" />
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
                    <img key={idx} src={src} alt={`preview-${idx}`} className="image-preview" />
                  ))}
                </div>
              </div>

              {/* right: form */}
              <div className="makepage-right">
                <div className="makepage-inputs">
                  {/* restaurant search (optional) */}
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
                      onClick={searchRestaurants}
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

                  {/* text inputs */}
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

                {/* keyword section + save / cancel */}
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
                              className={`edit-positive-button ${active ? 'active' : ''}`}
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
                        <div className="editpage-keyword-section">
                          {Object.entries(negativeKeywords).map(([kw, active]) => (
                            <button
                              key={kw}
                              className={`edit-nagative-button ${active ? 'active' : ''}`}
                              onClick={() => toggleKeyword('negative', kw)}
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* action buttons */}
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

export default EditPage;
