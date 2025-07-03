// src/pages/NewPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 페이지 레이아웃을 위한 컴포넌트 임포트
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import Button from '../components/Button'; // Button 컴포넌트 임포트
import { TbPhotoPlus } from "react-icons/tb"; // 사진 추가 아이콘 임포트

// 공통 레이아웃 CSS 재활용
import '../pages/HomePage.css'; 
import './NewPage.css';

function NewPage() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [restaurantName, setRestaurantName] = useState(''); //  식당 이름 상태
    const [oneLiner, setOneLiner] = useState(''); //  한줄평 상태
    const [content, setContent] = useState(''); // 내용 입력칸 상태
    const [image, setImage] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false); // '분석 시작/완료' 버튼 상태

    const handleSubmit = (e) => {
        e.preventDefault();

        // 여기에 실제 리뷰 데이터를 서버로 전송하는 로직을 추가합니다.
        console.log('리뷰 제출:', { title, restaurantName, oneLiner, content, image });
        alert('리뷰가 성공적으로 작성되었습니다! (실제 제출 로직 필요)');
        
        // 제출 후 홈 페이지로 이동 (예시)
        navigate('/'); 
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    const handleAnalyzeClick = () => {
        setIsAnalyzing(prev => !prev); // 상태 토글
        if (!isAnalyzing) {
            alert('분석을 시작합니다! (실제 분석 로직 필요)');
        } else {
            alert('분석을 완료합니다!');
        }
    };

    return (
        <div className="newpage-layout">
            <Header searchTerm="" onSearchChange={() => {}} />

            <div className="main-content-wrapper">
                <aside className="newpage-left-sidebar">
                    <LeftSidebar />
                </aside>

                {/* 중앙 콘텐츠 영역: 리뷰 작성 폼 */}
                <main className="newpage-middle-area">
                    {/* <--- 변경: "글쓰기" 제목과 경계선 */}
                    <div className="write-section-header">
                        <h2>글쓰기</h2>
                        <div className="line"></div> {/* 아래 경계선 */}
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
                                        style={{ display: 'none' }} /* 실제 input은 숨김 */
                                    />
                                </label>
                            </div>

                            <div className="text-input-area">
                                {/* 식당 이름 입력 */}
                                <input
                                    type="text"
                                    placeholder="식당 이름"
                                    value={restaurantName}
                                    onChange={(e) => setRestaurantName(e.target.value)}
                                    className="form-input"
                                    required
                                />

                                {/* 한줄평 입력 */}
                                <input
                                    type="text"
                                    placeholder='"한줄평"'
                                    value={oneLiner}
                                    onChange={(e) => setOneLiner(e.target.value)}
                                    className="form-input"
                                    required
                                />

                                {/* 내용 입력 */}
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

                        {/* 분석 시작/완료 버튼 (아래에 CSS 추가) */}
                        <Button
                            type="button" 
                            onClick={handleAnalyzeClick}
                            className={`analysis-button ${isAnalyzing ? 'analyzing' : ''}`}
                        >
                            {isAnalyzing ? '분석 완료' : '분석 시작'}
                        </Button>
                    </form>
                </main>

                <aside className="newpage-right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
}

export default NewPage;