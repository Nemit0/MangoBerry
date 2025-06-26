import React from 'react';
import './Header.css';
import { BsJustify, BsXLg, BsX, BsPersonFill} from "react-icons/bs";
import { IoMapOutline, IoSearch } from "react-icons/io5";
import { AiOutlineFileAdd } from "react-icons/ai";
import { TbPhotoPlus, TbMapSearch } from "react-icons/tb";
import { BiUser } from "react-icons/bi";
import { GoHomeFill } from "react-icons/go";

const Header = ({ isLoggedIn }) => {
  return (
    <>
      <div className="side-nav">
        <button className="nav-icon"><BsJustify /></button>           
        <button className="nav-icon"><BsXLg /></button> 
        <button className="nav-icon"><BsX /></button>          
        <button className="nav-icon"><IoMapOutline /></button>
        <button className="nav-icon"><AiOutlineFileAdd /></button>
        <button className="nav-icon"><TbPhotoPlus /></button>
        <button className="nav-icon"><BiUser /></button>
        <button className="nav-icon"><BsPersonFill /></button>
        <button className="nav-icon"><GoHomeFill /></button>
        <button className="nav-icon"><IoSearch /></button>
        <button className="nav-icon"><TbMapSearch /></button>  
      </div>

      <header className="header">
        <div className="logo">GUMIO</div>

        <div className="search-bar">
            <input type="text" placeholder="검색어를 입력하세요" />
            <button><IoSearch /></button>
        </div>

        <div className="auth-buttons">
            {isLoggedIn ? (
            <button className="btn logout">로그아웃</button>
            ) : (
            <>
                <button className="btn signup">회원가입</button>
                <button className="btn login">로그인</button>
            </>
            )}
        </div>
        </header>
    </>
    );
};


export default Header;
