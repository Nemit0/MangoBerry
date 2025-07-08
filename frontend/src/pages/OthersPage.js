import Header from "../components/Header";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import PostList from "../components/PostList";
import './OthersPage.css';

const UserInfo = ({ label, value }) => (
    <span className="user-info-item">
        <div className="info-label">{label}</div>
        <div className="info-value">{value}</div>
    </span>
);

const OthersPage = () => {
    return (
        <div className="otherspage-layout">
            <Header />
            <div className="otherspage-main-wrapper">
                <aside className="others-left-sidebar">
                    <LeftSidebar />
                </aside>
                <main className="otherspage-middle-area">
                    <div className="other-user-info">
                        <div className="user-info-left">
                            <div className="user-image">이미지</div>
                            <div className="user-nickname">닉네임</div>
                        </div>
                        <div className="user-info-right">
                            <UserInfo label="follower" value={123} />
                            <UserInfo label="following" value={456} />
                            <UserInfo label="post" value={789} />
                            <div className="follow-button">
                                <button>follow</button>
                            </div>
                        </div>
                    </div>
                    <div className="other-user-post">
                        <div className="post-left-part">
                            <PostList />
                        </div>
                        <div className="post-right-part">
                            <div className="word-cloud-container">
                                {/* 워드 클라우드 컴포넌트가 여기에 들어갑니다. */}
                                <p>워드 클라우드</p>
                            </div>
                        </div>
                    </div>
                </main>
                <aside className="others-right-sidebar">
                    <RightSidebar />
                </aside>
            </div>
        </div>
    );
};
export default OthersPage;