// src/pages/EditPage.js (최소 변경)
import React, { useState } from 'react'; // useEffect, useParams 임포트 제거
import { useNavigate } from 'react-router-dom';

// 페이지 레이아웃을 위한 컴포넌트 임포트 (기존 NewPage와 동일)
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import Button from '../components/Button';
import { TbPhotoPlus } from "react-icons/tb";

// 공통 레이아웃 CSS 재활용 (기존 NewPage와 동일)
import '../pages/HomePage.css'; 
import './NewPage.css'; // NewPage.css를 EditPage에서도 재활용

function EditPage() { // 컴포넌트 이름 변경
    const navigate = useNavigate();
    // const { postId } = useParams(); // <--- 변경: useParams 임포트 및 사용 제거

    const [title, setTitle] = useState('');
    const [restaurantName, setRestaurantName] = useState('');
    const [oneLiner, setOneLiner] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // useEffect를 사용한 데이터 로딩 로직 제거 <--- 변경: 제거
    // useEffect(() => { ... }, [postId]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // <--- 변경: 콘솔 메시지 및 알림 텍스트만 변경
        console.log('리뷰 업데이트 (임시):', { title, restaurantName, oneLiner, content, image });
        alert('리뷰가 성공적으로 업데이트되었습니다! (실제 업데이트 로직 필요)');
        
        navigate('/my'); 
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    const handleAnalyzeClick = () => {
        setIsAnalyzing(prev => !prev);
        if (!isAnalyzing) {
            alert('분석을 시작합니다! (실제 분석 로직 필요)');
        } else {
            alert('분석을 완료합니다!');
        }
    };

    return (
        <div className="homepage-layout">
            <Header searchTerm="" onSearchChange={() => {}} />

            <div className="main-content-wrapper">
                <aside className="left-sidebar">
                    <LeftSidebar />
                </aside>

                {/* 중앙 콘텐츠 영역: 리뷰 편집 폼 */}
                <main className="middle-posts-area">
                    {/* <--- 변경: "글쓰기"를 "글편집"으로 변경 */}
                    <div className="write-section-header">
                        <h2>글편집</h2>
                        <div className="line"></div>
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

                <aside className="right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
}

export default EditPage;