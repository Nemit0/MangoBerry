import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// 페이지 레이아웃을 위한 컴포넌트 임포트
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import Button from '../components/Button';
import { TbPhotoPlus } from "react-icons/tb";
import "./NewPage.css";

// auth
import { useAuth } from "../contexts/AuthContext";

export default function NewPage() {
    const navigate = useNavigate();
    const { isLoggedIn, user } = useAuth();

    // local form state
    const [restaurantName, setRestaurantName] = useState("");
    const [oneLiner, setOneLiner] = useState("");
    const [content, setContent] = useState("");
    const [image, setImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");

    
    /* ───────────────────────── event handlers ───────────────────────── */
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleImageChange = (e) => {
        if (e.target.files?.[0]) setImage(e.target.files[0]);
    };
    
    // /* ──────────────────────────── render ───────────────────────────── */
    // if (e.target.files && e.target.files[0]) {
    //     setImage(e.target.files[0]);
    // }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            setStatusMsg("⏳ 리뷰 저장 중…");

            /* 1) create review (no picture yet) */
            const reviewRes = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.user_id,
                    restaurant_id: r_id,
                    comments: oneLiner,
                    review: content
                }),
            });

            if (!reviewRes.ok) {
                throw new Error(`리뷰 저장 실패 (${reviewRes.status})`);
            }

            const { review_id } = await reviewRes.json();

            let imgRes = { public_url: null, object_key: null };

            if (image) {
                setStatusMsg("사진 업로드 중…");

                const formData = new FormData();
                formData.append("file", image);

                imgRes = await fetch(
                    `/api/reviews/${user.user_id}/${review_id}/images`,
                    { method: "POST", body: formData }
                );
                if (!imgRes.ok)
                    throw new Error(`사진 업로드 실패 (${imgRes.status})`);
            }

            const img_url = imgRes.public_url || null;
            const img_key = imgRes.object_key || null;

            /* Update the review with the image filename */
            const updateRes = await fetch(`/api/reviews/${review_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    photo_filenames: img_key ? [img_key] : [],
                    photo_urls: img_url ? [img_url] : [],
                }),
            });

            console.log("Update response:", updateRes);


            /* success → home */
            setStatusMsg("✅ 완료! 홈으로 이동합니다…");
            navigate("/");
        } catch (err) {
            console.error(err);
            setStatusMsg(`❌ ${err.message}`);
            setIsSubmitting(false);
        }
    };

    
    

    const handleAnalyzeClick = () => {
        setIsAnalyzing(true);
        /*모두 긍정/부정으로 똑같이 지정하면 4개 한꺼번에 눌림*/
        const dummyPositive = ['긍정1', '긍정2', '긍정3', '긍정4'];
        const dummyNegative = ['부정1', '부정2', '부정3', '부정4'];
        setPositiveKeywords(dummyPositive);
        setNegativeKeywords(dummyNegative);
    };

    return (
    <div className="page-layout">
        <Header searchTerm="" onSearchChange={() => {}} />

        <div className="page-content-wrapper">
        <aside className="page-left-sidebar">
            <LeftSidebar />
        </aside>

        <main className="middle-posts-area">
            <h2 className="write-section-header">글쓰기</h2>

            <form onSubmit={handleSubmit} className="review-form">
              <div className="form-content-area">
                  {/* ─── image uploader ─────────────────────────────── */}                <div className="image-upload-area">
                  <label htmlFor="image-upload" className="image-placeholder">
                  {image ? (
                      <img
                          src={URL.createObjectURL(image)}
                          alt="Preview"
                          className="uploaded-image-preview"
                      />
                      ) : (
                      <>
                          <TbPhotoPlus className="photo-icon" />
                          <span>사진 +</span>
                      </>
                      )}
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: "none" }}
                      />
                  </label>
                  </div>

                  {/* ─── review text fields ─────────────────────────── */}
                  <div className="text-input-area">
                  <input
                      type="text"
                      placeholder="식당 이름"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      className="form-input"
                      required
                  />
                  <input
                      type="text"
                      placeholder='"한줄평"'
                      value={oneLiner}
                      onChange={(e) => setOneLiner(e.target.value)}
                      className="form-input"
                      required
                  />
                  <textarea
                      placeholder="내용을 입력하세요"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={10}
                      className="form-textarea"
                      required
                  />
                  </div>
              </div>

              {/* ─── submit button ──────────────────────────────── */}
              <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "처리 중…" : "저장"}
              </Button>

              {/* status message */}
              {statusMsg && <p className="status-msg">{statusMsg}</p>}
                <Button
                    type="button"
                    onClick={handleAnalyzeClick}
                    className={`analysis-button ${isAnalyzing ? 'analyzing' : ''}`}
                >
                    {isAnalyzing ? '분석 완료' : '분석 시작'}
                </Button>
            </form>

          {/* 분석 결과 박스 - form 밖에 위치 */}
          {isAnalyzing && (
            <div className="keyword-result-container">
              <div className="keyword-section">
                <h4 className="keyword-title">긍정 키워드</h4>
                <div className="keyword-box">
                  {splitIntoTwoRows(positiveKeywords).map((row, rowIdx) => (
                    <div key={rowIdx} className="keyword-row">
                      {row.map((word, idx) => (
                        <button
                          key={idx}
                          onClick={() => toggleKeyword(word)}
                          className={`keyword-button keyword-positive ${
                            selectedKeywords.includes(word) ? 'selected' : ''
                          }`}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="keyword-section">
                <h4 className="keyword-title">부정 키워드</h4>
                <div className="keyword-box">
                  {splitIntoTwoRows(negativeKeywords).map((row, rowIdx) => (
                    <div key={rowIdx} className="keyword-row">
                      {row.map((word, idx) => (
                        <button
                          key={idx}
                          onClick={() => toggleKeyword(word)}
                          className={`keyword-button keyword-negative ${
                            selectedKeywords.includes(word) ? 'selected' : ''
                          }`}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {/* 취소 / 등록 버튼 */}
              <div className="keyword-action-wrapper">
                <button
                  type="button"
                  className="keyword-action-button"
                  onClick={() => setIsAnalyzing(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="keyword-action-button"
                  onClick={handleSubmit}
                >
                  등록
                </button>
              </div>
            </div>
          )}
        </main>

        <aside className="page-right-sidebar">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
