import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 페이지 레이아웃을 위한 컴포넌트 임포트
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import Button from '../components/Button';
import { TbPhotoPlus } from "react-icons/tb";

// 공통 레이아웃 CSS 재활용
import './EditPage.css';

function EditPage() {
  const navigate = useNavigate();
  const [title] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [positiveKeywords, setPositiveKeywords] = useState([]);
  const [negativeKeywords, setNegativeKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);

  const toggleKeyword = (word) => {
    setSelectedKeywords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
    );
  };

  const splitIntoTwoRows = (arr) => {
    const mid = Math.ceil(arr.length / 2);
    return [arr.slice(0, mid), arr.slice(mid)];
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('리뷰 제출:', {
      title,
      restaurantName,
      oneLiner,
      content,
      image,
      selectedKeywords,
    });
    navigate('/');
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleAnalyzeClick = () => {
    setIsAnalyzing(true);
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
          <div className="write-section-header">
            <h2>글 편집</h2>
            <button
              type="button"
              onClick={() => {}}
              className="delete-button"
            >
              삭제
            </button>
          </div>

          <form onSubmit={handleSubmit} className="review-form">
            <div className="form-content-area">
              <div className="image-upload-area">
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
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

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
                  rows="10"
                  className="form-textarea"
                  required
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleAnalyzeClick}
              className={`analysis-button ${isAnalyzing ? 'analyzing' : ''}`}
            >
              {isAnalyzing ? '분석 완료' : '분석 시작'}
            </Button>
          </form>

          {isAnalyzing && (
            <div className="keyword-result-container">
              {/* 긍정 키워드 */}
              <div className="keyword-section">
                <h4 className="keyword-title">긍정 키워드</h4>
                <div className="keyword-box">
                  {splitIntoTwoRows(positiveKeywords).map((row, rowIdx) => (
                    <div key={rowIdx} className="keyword-row">
                      {row.map((word, idx) => (
                        <button
                          key={idx}
                          type="button"
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

              {/* 부정 키워드 */}
              <div className="keyword-section">
                <h4 className="keyword-title">부정 키워드</h4>
                <div className="keyword-box">
                  {splitIntoTwoRows(negativeKeywords).map((row, rowIdx) => (
                    <div key={rowIdx} className="keyword-row">
                      {row.map((word, idx) => (
                        <button
                          key={idx}
                          type="button"
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

export default EditPage;
