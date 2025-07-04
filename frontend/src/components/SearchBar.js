import React from 'react';
import './SearchBar.css';

function SearchBar({ searchTerm, onSearchChange, placeholder }) {
    return (
        <div className="search-bar-container">
            <input
                type="text"
                placeholder={placeholder || "검색어를 입력해주세요"}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="search-bar-input"
            />
            <button className="search-bar-button">🔍</button>
        </div>
    );
}

export default SearchBar;