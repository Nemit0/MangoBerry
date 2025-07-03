// src/App.js (전체 레이아웃 구조)
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// 전역 컴포넌트 임포트 
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar'; 
import RightSidebar from './components/RightSidebar'; 

//페이지 컴포넌트 임포트
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyPage from './pages/MyPage';
import NewPage from './pages/NewPage';
import EditPage from './pages/EditPage';
import FollowerPage from './pages/FollowerPage';
import FollowingPage from './pages/FollowingPage';
import OthersPage from './pages/OthersPage';
import MapPage from './pages/MapPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <>
      
        <Routes>
          <Route path='/' element={<HomePage />}/>
          <Route path='/login' element={<LoginPage />}/>
          <Route path="/register" element={<RegisterPage />} />
          <Route path='/my' element={<MyPage />}/>
          <Route path='/new' element={<NewPage />}/>
          <Route path='/edit' element={<EditPage />}/> 
          <Route path='/follower' element={<FollowerPage />}/>
          <Route path='/following' element={<FollowingPage />}/>
          <Route path='/others' element={<OthersPage />}/>
          <Route path='/map' element={<MapPage />}/>
          <Route path='*' element={<NotFoundPage />}/>
        </Routes>
      
    </>
  );
}

export default App;