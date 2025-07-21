import React from 'react';
import './PostItem.css';
import { useNavigate } from 'react-router-dom';
import RatingDisplay from './RatingDisplay';
import foxImage      from '../assets/photo/circular_image.png';
import { useAuth } from '../contexts/AuthContext';

function PostItem({ post, onClick }) {

  const navigate = useNavigate();
  const [profileImg, setProfileImg] = React.useState(post.user_profile || foxImage);
  /* pick first image no matter how it’s nested */
  const thumb = Array.isArray(post.images) ? post.images.flat()[0] : post.images;
  const { user } = useAuth();
  const userId = user?.user_id;

  const positives = (post.keywords || [])
    .filter(k => k.sentiment === 'positive')
    .map(k => k.keyword)
    .slice(0, 3);

  const negatives = (post.keywords || [])
    .filter(k => k.sentiment === 'negative')
    .map(k => k.keyword)
    .slice(0, 3);

  const handleClickProfile = () => {
    if (post.user_id === userId) {
      navigate("/my");
    } else {
      navigate(`/others/${post.user_id}`, {
        state: { from: "post" }
      });
    }
  }

  return (
    <div className="post-card" onClick={() => onClick(post)}>
      <img src={thumb} alt={post.title} className="post-image" />

      <div className="post-info">
        <div className="post-header-meta" onClick={handleClickProfile}>
          <div className="post-user-image-container">
            <img src={profileImg} alt="User" className="post-profile-img" />
          </div>
          <span className="post-user-name">@{post.user}</span>
          <span className="post-datePosted">{post.datePosted}</span>
        </div>

        <h3 className="post-restaurant-name">{post.r_name}</h3>
        <RatingDisplay score={post.rating / 10} width={15} height={15} />

        <h4 className="post-title">{post.title}</h4>

        <div className="post-positive-tags">
          {positives.map((kw, i) => (
            <span key={i} className="positive-tag-badge">{kw}</span>
          ))}
        </div>

        <div className="post-negative-tags">
          {negatives.map((kw, i) => (
            <span key={i} className="negative-tag-badge">{kw}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PostItem;