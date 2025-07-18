import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { TbPhotoPlus } from "react-icons/tb";	
import './NewPage.css';

const NewPage = () => {
  const navigate = useNavigate();
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [images, setImages] = useState([]);
  const [positiveKeywords, setPositiveKeywords] = useState({
    '맛있어요': true,
    '분위기가 좋아요': true,
    '가성비가 좋아요': true,
    '달다': true,
    '짜다': true,
    '달아서 좋아요': true,
    '맵다': true,
    '짜서 좋아요': true,
    '매워서 좋아요': true,
    '쫄깃해요': true,
    '양이 많아 좋아요': true,
    '밥이 무료여서 좋아요': true,
  });
  const [negativeKeywords, setNegativeKeywords] = useState({
    '비싸요': true,
    '불친절해요': true,
    '맛없어요': true,
    '양이 적어요': true,
    '더러워요': true,
    '음식을 재사용 해요': true,
    '위치가 불편해요': true,
    '싸가지없어요': true,
    '돈 버려요': true,
    '무맛이요': true,
    '딱딱해요': true,
    '없어요': true,
  });
  const handleAnalysis = () => {
    setAnalysisComplete(true);
  };
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => URL.createObjectURL(file));
    setImages(prevImages => [...prevImages, ...newImages]);
  };
  const toggleKeyword = (type, keyword) => {
    if (type === 'positive') {
      setPositiveKeywords(prev => ({ ...prev, [keyword]: !prev[keyword] }));
    } else {
      setNegativeKeywords(prev => ({ ...prev, [keyword]: !prev[keyword] }));
    }
  };
  const handleCancel = () => {
    if (window.confirm('해당 글이 저장되지 않습니다.')) {
      navigate('/');
    }
  };
  const handleSave = () => {
    // 저장 로직 구현
    console.log('저장되었습니다.');
  };
  return (
    <div className="makepage-container">
      <Header />
      <div className="makepage-content">
        <main className="makepage-main">
          <div className="makepage-wrapper">
            <div className="makepage-top"> 
              {/* 높이 맞춤용*/}
            <div className="page-title-with-delete">
              <h1>글쓰기</h1>
                <button className="delete-button" style={{ visibility: 'hidden' }}>삭제</button>
            </div>
          </div>
            <div className="makepage-bottom">
              <div className="makepage-left">
                <div className="makepage-photo-upload"
                     onClick={() => document.getElementById('imageInput').click()}>
                  <TbPhotoPlus size={50} color="#aaa" />
                  <input
                    id="imageInput"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />    
                  <div className="image-preview-container">
                    {images.map((image, index) => (
                      <img key={index} src={image} alt={`preview ${index}`} className="image-preview" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="makepage-right">
                <div className="makepage-inputs">
                  <input type="text" placeholder="식당이름" />
                  <input type="text" placeholder="한줄평" />
                  <textarea placeholder="리뷰"></textarea>
                  <button
                    onClick={handleAnalysis}
                    className="analysis-button"
                    disabled={analysisComplete}
                  >
                    {analysisComplete ? '분석 완료' : '분석 시작'}
                  </button>
                </div>
                {analysisComplete && (
                  <div className="analysis-results">
                    <div className="keyword-sections-container">
                      <div className="keyword-type-section">
                        <h2>긍정 키워드</h2>
                        <div className="newpage-keyword-section">
                          <div className="keywords">
                            {Object.entries(positiveKeywords).map(([keyword, isActive]) => (
                              <button
                                key={keyword}
                                className={`new-positive-button ${isActive ? 'active' : ''}`}
                                onClick={() => toggleKeyword('positive', keyword)}
                              >
                                {keyword}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="keyword-type-section">
                        <h2>부정 키워드</h2>
                        <div className="newpage-keyword-section">
                          <div className="keywords">
                            {Object.entries(negativeKeywords).map(([keyword, isActive]) => (
                              <button
                                key={keyword}
                                className={`new-nagative-button ${isActive ? 'active' : ''}`}
                                onClick={() => toggleKeyword('negative', keyword)}
                              >
                                {keyword}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="action-buttons">
                      <button onClick={handleCancel} className="cancel-button">취소</button>
                      <button onClick={handleSave} className="save-button">저장</button>
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