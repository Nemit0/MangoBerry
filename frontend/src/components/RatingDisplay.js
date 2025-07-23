import React from 'react';
import './RatingDisplay.css';
import fox_tail_lev1 from '../assets/photo/fox_tail/fox_tail_lev1.png';
import fox_tail_lev2 from '../assets/photo/fox_tail/fox_tail_lev2.png';
import fox_tail_lev3 from '../assets/photo/fox_tail/fox_tail_lev3.png';
import fox_tail_lev4 from '../assets/photo/fox_tail/fox_tail_lev4.png';
import fox_tail_lev5 from '../assets/photo/fox_tail/fox_tail_lev5.png';
import fox_tail_lev6 from '../assets/photo/fox_tail/fox_tail_lev6.png';
import fox_tail_lev7 from '../assets/photo/fox_tail/fox_tail_lev7.png';
import fox_tail_lev8 from '../assets/photo/fox_tail/fox_tail_lev8.png';
import fox_tail_lev9 from '../assets/photo/fox_tail/fox_tail_lev9.png';

const RatingDisplay = ({ score, width, height }) => {
  const getTailImage = (score) => {
    if (score >= 1 && score <= 20) {
      return fox_tail_lev1;
    } else if (score >= 21 && score <= 30) {
      return fox_tail_lev2;
    } else if (score >= 31 && score <= 40) {
      return fox_tail_lev3;
    } else if (score >= 41 && score <= 50) {
      return fox_tail_lev4;
    } else if (score >= 51 && score <= 60) {
      return fox_tail_lev5;
    } else if (score >= 61 && score <= 70) {
      return fox_tail_lev6;
    } else if (score >= 71 && score <= 80) {
      return fox_tail_lev7;
    } else if (score >= 81 && score <= 90) {
      return fox_tail_lev8;
    } else if (score >= 91 && score <= 100) {
      return fox_tail_lev9;
    }
    return null; 
  };

  const tailImage = getTailImage(score);

  const iconStyle = {
    width: `${width}px`,
    height: `${height}px`,
  };

  return (
    <div className="rating-display">
      {tailImage && <img src={tailImage} alt={`tail level for score ${score}`} className="tail-icon" style={iconStyle} />}
      <span className="rating-score">{Math.floor(score)}%</span>
    </div>
  );
};

export default RatingDisplay;
