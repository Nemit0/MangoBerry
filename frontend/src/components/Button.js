import React from 'react';
import './Button.css';

const Button = () => {
  return (
    <div className="button-container">
      <div className="section">
        <button className="btn next">다음</button>
        <button className="btn prev">이전</button>
        <button className="btn next">완료</button>
        <button className="btn cancel">취소</button>
        <button className="btn register">등록</button>
        <button className="btn main">GUMIO</button>
      </div>

      <div className="section">
        <button className="btn login">로그인</button>
        <button className="btn signup">가입하기</button>
        <button className="btn check">중복확인</button>
        <button className="btn follow">팔로우</button>
      </div>

      <div className="section">
        <button className="btn positive">긍정</button>
        <button className="btn negative">부정</button>
      </div>

      </div>
  );
};

export default Button;
