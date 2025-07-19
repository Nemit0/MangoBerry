import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header           from '../components/Header';
import { TbPhotoPlus }  from 'react-icons/tb';
import { FiSearch }     from 'react-icons/fi';
import './EditPage.css';

/* ───────────────────────── constants ───────────────────────── */
const API_ROOT = '/api';     // CRA proxy rewrites to FastAPI
const USER_ID  = 9;          // TODO: pull from auth context

/* tiny helper */
const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/* ───────────────────────── component ───────────────────────── */
const EditPage = () => {
  const { reviewId } = useParams();
  const navigate     = useNavigate();
  const dropdownRef  = useRef(null);           // click‑away target
  const originalRef  = useRef(null);           // immutable snapshot

  /* photo handling */
  const [imageFiles, setImageFiles] = useState([]);   // newly picked File[]
  const [imagePrev,  setImagePrev]  = useState([]);   // previews (existing + new)

  /* restaurant */
  const [searchQuery,        setSearchQuery]        = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null); // { r_id, name }
  const [restaurantList,     setRestaurantList]     = useState([]);
  const [showDropdown,       setShowDropdown]       = useState(false);

  /* texts */
  const [oneLiner,   setOneLiner]   = useState('');
  const [reviewText, setReviewText] = useState('');

  /* keywords */
  const [analysisComplete, setAnalysisComplete] = useState(false); // controls initial render
  const [isAnalyzing,      setIsAnalyzing]      = useState(false); // debounce “재분석” clicks
  const [positiveKeywords, setPositiveKeywords] = useState({});    // { kw: active }
  const [negativeKeywords, setNegativeKeywords] = useState({});

  /* ───────────── initial review fetch ───────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}/get_review/${reviewId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('Loaded review:', data);
        originalRef.current = data;                   // save snapshot

        /* fill fields */
        setOneLiner(data.comments || '');
        setReviewText(data.review || '');
        setSearchQuery(data.restaurant_name || '');
        setSelectedRestaurant({ r_id: data.restaurant_id, name: data.restaurant_name });

        /* keywords → object maps */
        const pos = {}; data.positive_keywords.forEach((k) => { pos[k] = true; });
        const neg = {}; data.negative_keywords.forEach((k) => { neg[k] = true; });
        setPositiveKeywords(pos);
        setNegativeKeywords(neg);

        /* photos */
        setImagePrev(data.photo_urls || []);

        /* ✅ show keyword panes immediately */
        setAnalysisComplete(true);
      } catch (err) {
        console.error(err);
        alert(`리뷰 정보를 불러오지 못했습니다: ${err.message}`);
        navigate(-1);
      }
    })();
  }, [reviewId, navigate]);

  /* ───────────── restaurant search helpers ───────────── */
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

  /* click‑away to close dropdown */
  useEffect(() => {
    const onClickAway = (e) =>
      dropdownRef.current && !dropdownRef.current.contains(e.target) && setShowDropdown(false);
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  /* ───────────── photo selection ───────────── */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const blobs = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files]);
    setImagePrev ((prev) => [...prev, ...blobs]);
  };

  /* ───────────── keyword (re)analysis ───────────── */
  const handleAnalysis = async () => {
    if (isAnalyzing) return;          // guard
    if (!reviewText.trim()) { alert('리뷰 내용을 입력해주세요.'); return; }
    setIsAnalyzing(true);
    try {
      const payload = {
        name      : selectedRestaurant?.name || searchQuery || '알수없음',
        one_liner : oneLiner,
        text      : reviewText,
      };
      const res = await fetch(`${API_ROOT}/analyze_review`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.json();     // [{ keyword, sentiment }]
      const pos = {}; const neg = {};
      arr.forEach(({ keyword, sentiment }) =>
        (sentiment === 'positive' ? pos : neg)[keyword] = true
      );
      setPositiveKeywords(pos);
      setNegativeKeywords(neg);
      setAnalysisComplete(true);        // stays true anyway
    } catch (err) {
      console.error(err);
      alert(`키워드 분석 중 오류: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };
  const toggleKeyword = (type, kw) => {
    if (type === 'positive') {
      setPositiveKeywords((prev) => ({ ...prev, [kw]: !prev[kw] }));
    } else {
      setNegativeKeywords((prev) => ({ ...prev, [kw]: !prev[kw] }));
    }
  };

  /* ───────────── save PATCH ───────────── */
  const handleSave = useCallback(async () => {
    if (!originalRef.current) return;   // still loading
    const orig = originalRef.current;

    /* 1) upload new images */
    let addedFilenames = [];
    let addedUrls      = [];
    if (imageFiles.length) {
      try {
        const uploadResults = await Promise.all(
          imageFiles.map(async (file) => {
            const fd = new FormData(); fd.append('file', file);
            const res = await fetch(`${API_ROOT}/reviews/${USER_ID}/images?review_id=${reviewId}`, {
              method: 'POST', body: fd,
            });
            if (!res.ok) throw new Error(`upload HTTP ${res.status}`);
            return res.json();          // { key, public_url }
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

    /* 2) diff → payload */
    const payload = {};
    if (selectedRestaurant?.r_id &&
        selectedRestaurant.r_id !== orig.restaurant_id) payload.restaurant_id = selectedRestaurant.r_id;

    if (oneLiner   !== orig.comments) payload.comments = oneLiner;
    if (reviewText !== orig.review)   payload.review   = reviewText;

    if (addedFilenames.length) {
      payload.photo_filenames = [...(orig.photo_filenames || []), ...addedFilenames];
      payload.photo_urls      = [...(orig.photo_urls      || []), ...addedUrls];
    }

    const curPos = Object.keys(positiveKeywords).filter((k) => positiveKeywords[k]);
    const curNeg = Object.keys(negativeKeywords).filter((k) => negativeKeywords[k]);
    if (!arraysEqual(curPos, orig.positive_keywords)) payload.positive_keywords = curPos;
    if (!arraysEqual(curNeg, orig.negative_keywords)) payload.negative_keywords = curNeg;

    if (Object.keys(payload).length === 0) {
      alert('수정된 내용이 없습니다.');
      return;
    }

    /* 3) PUT */
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

  /* cancel */
  const handleCancel = () =>
    window.confirm('해당 글이 저장되지 않습니다.') && navigate('/');

  /* ───────────── render ───────────── */
  return (
    <div className="makepage-container">
      <Header />
      <div className="makepage-content">
        <main className="makepage-main">
          <div className="makepage-wrapper">

            {/* page header */}
            <div className="makepage-top">
              <div className="page-title-with-delete">
                <h1>글편집</h1>
                <button className="delete-button" style={{ visibility: 'hidden' }}>삭제</button>
              </div>
            </div>

            {/* two‑column grid */}
            <div className="makepage-bottom">
              {/* left: photos */}
              <div className="makepage-left">
                <div
                  className="makepage-photo-upload"
                  onClick={() => document.getElementById('imageInput').click()}
                >
                  <TbPhotoPlus size={50} color="#aaa" />
                  <input
                    id="imageInput" type="file" multiple accept="image/*"
                    onChange={handleImageChange} style={{ display: 'none' }}
                  />
                </div>
                <div className="image-preview-container">
                  {imagePrev.map((src, idx) => (
                    <img key={idx} src={src} alt={`preview-${idx}`} className="image-preview" />
                  ))}
                </div>
              </div>

              {/* right: form */}
              <div className="makepage-right">
                <div className="makepage-inputs">
                  {/* restaurant search */}
                  <div className="restaurant-search-container">
                    <input
                      className="restaurant-search-input"
                      type="text" placeholder="식당이름 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                    />
                    <button
                      className="restaurant-search-button"
                      onClick={searchRestaurants} aria-label="search"
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

                  {/* texts */}
                  <input
                    type="text" placeholder="한줄평"
                    value={oneLiner}
                    onChange={(e) => setOneLiner(e.target.value)}
                  />
                  <textarea
                    placeholder="리뷰"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />

                  {/* “재분석” button */}
                  <button
                    onClick={handleAnalysis}
                    className="analysis-button"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? '분석 중…' : '재분석'}
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

export default EditPage;