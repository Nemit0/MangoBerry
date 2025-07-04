import './App.css';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
    <div className="App">
      <AuthProvider>
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
      </AuthProvider>
    </div>
  );
}

export default App;