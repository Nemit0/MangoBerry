import './App.css';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage         from './pages/HomePage';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import MyPage           from './pages/MyPage';
import NewPage          from './pages/NewPage';
import EditPage         from './pages/EditPage';
import FollowerPage     from './pages/FollowerPage';
import FollowingPage    from './pages/FollowingPage';
import OthersPage       from './pages/OthersPage';
import MapPage          from './pages/MapPage';
import NotFoundPage     from './pages/NotFoundPage';
import RestaurantInfoPage from './pages/RestaurantInfoPage';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/"               element={<HomePage />} />
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/register"       element={<RegisterPage />} />
          <Route path="/map"            element={<MapPage />} />
          <Route path="/restaurantInfo" element={<RestaurantInfoPage />} />
          <Route path="/others"         element={<OthersPage />} />

          {/* 보호된 라우트 */}
          <Route path="/my"        element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
          <Route path="/new"       element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
          {/* NOTE: reviewId param is required */}
          <Route path="/edit/:reviewId"
                 element={<ProtectedRoute><EditPage /></ProtectedRoute>} />
          <Route path="/follower"  element={<ProtectedRoute><FollowerPage /></ProtectedRoute>} />
          <Route path="/following" element={<ProtectedRoute><FollowingPage /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;