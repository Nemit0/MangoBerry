import { useNavigate } from 'react-router-dom';

import Header from "../components/Header";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import PostList from "../components/PostList";
import './MyPage.css';

const UserInfo = ({ label, value }) => (
    <span className="user-info-item">
        <div className="info-label">{label}</div>
        <div className="info-value">{value}</div>
    </span>
);

const MyPage = () => {
    const navigate = useNavigate();

    return (
        <div className="mypage-layout">
            <Header />
            <div className="mypage-main-wrapper">
                <aside className="my-left-sidebar">
                    <LeftSidebar />
                </aside>
                <main className="mypage-middle-area">
                    <div className="my-user-info">
                        <div className="user-info-left">
                            <div className="user-image">이미지</div>
                            <div className="user-nickname">닉네임</div>
                        </div>
                        <div className="user-info-right">
                            <UserInfo label="follower" value={123} />
                            <UserInfo label="following" value={456} />
                            <UserInfo label="post" value={789} />
                            <div className="edit-button">
                                {/* 버튼 클릭 시 EditPage로 이동 */}
                                <button onClick={() => navigate('/edit')}>편집</button> 
                            </div>
                        </div>
                    </div>
                    <div className="my-user-post">
                        <div className="post-left-part">
                            <PostList isMyPage={true} />
                        </div>
                        <div className="post-right-part">
                            <div className="word-cloud-container">
                                {/* 워드 클라우드 컴포넌트가 여기에 들어갑니다. */}
                                <p>워드 클라우드</p>
                            </div>
                        </div>
                    </div>
                </main>
                <aside className="my-right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
};
export default MyPage;