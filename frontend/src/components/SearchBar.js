import React from 'react';
import './SearchBar.css';
import { IoSearch } from "react-icons/io5";

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
            <button className="search-bar-button"><IoSearch/></button>
        </div>
    );
}

export default SearchBar;