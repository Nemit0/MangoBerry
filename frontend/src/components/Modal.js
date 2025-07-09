// src/components/Modal.js
import React from 'react';
import './Modal.css';
import PostDetailModalContent from './PostDetailModalContent';

function Modal({ isOpen, onClose, selectedPost, isMyPage }) {
    if (!isOpen) return null; // 모달이 닫혀있으면 아무것도 렌더링하지 않음

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>
                    &times;
                </button>
                <PostDetailModalContent selectedPost={selectedPost} isMyPage={isMyPage} />
            </div>
        </div>
    );
}

export default Modal;