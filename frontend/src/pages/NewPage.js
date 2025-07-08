// src/pages/NewPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 페이지 레이아웃을 위한 컴포넌트 임포트
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import Button from '../components/Button';
import { TbPhotoPlus } from "react-icons/tb";

// 공통 레이아웃 CSS 재활용

import './NewPage.css';

function NewPage() {
    const navigate = useNavigate();
    const [title] = useState('');
    const [restaurantName, setRestaurantName] = useState('');
    const [oneLiner, setOneLiner] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        console.log('리뷰 제출:', { title, restaurantName, oneLiner, content, image });
        navigate('/'); 
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    const handleAnalyzeClick = () => {
        setIsAnalyzing(prev => !prev); 
    };

    return (
        <div className="page-layout">
            <Header searchTerm="" onSearchChange={() => {}} />

            <div className="page-content-wrapper">
                <aside className="page-left-sidebar">
                    <LeftSidebar />
                </aside>

                {/* 중앙 콘텐츠 영역: 리뷰 작성 폼 */}
                <main className="middle-posts-area">
                    <div className="write-section-header">
                        <h2> 글쓰기 </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="review-form">
                        <div className="form-content-area">

                            <div className="image-upload-area">
                                <label htmlFor="image-upload" className="image-placeholder">
                                    {image ? (
                                        <img src={URL.createObjectURL(image)} alt="Preview" className="uploaded-image-preview" />
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
                </main>

                <aside className="page-right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
}

export default NewPage;