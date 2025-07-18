import React from 'react';
import './RatingDisplay.css';
import tail from '../assets/photo/rating_fox.png';
// import tailGray from '../assets/photo/rating_fox_gray.png';

const RatingDisplay = ({ score, width, height }) => {
  const maxScore = 9;
  const filledTails = score > maxScore ? maxScore : score;
//   const emptyTails = maxScore - filledTails;

  const iconStyle = {
    width: `${width}px`,
    height: `${height}px`,
  };

  return (
    <div className="rating-display">
      {Array.from({ length: filledTails }, (_, index) => (
        <img key={`filled-${index}`} src={tail} alt="filled tail" className="tail-icon" style={iconStyle} />
      ))}
      {/* {Array.from({ length: emptyTails }, (_, index) => (
        <img key={`empty-${index}`} src={tailGray} alt="empty tail" className="tail-icon" style={iconStyle} />
      ))} */}
    </div>
  );
};

export default RatingDisplay;
