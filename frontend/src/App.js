import './App.css';
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage             from './pages/HomePage';
import LoginPage            from './pages/LoginPage';
import RegisterPage         from './pages/RegisterPage';
import MyPage               from './pages/MyPage';
import NewPage              from './pages/NewPage';
import EditPage             from './pages/EditPage';
import FollowerPage         from './pages/FollowerPage';
import FollowingPage        from './pages/FollowingPage';
import OthersPage           from './pages/OthersPage';
import MapPage              from './pages/MapPage';
import NotFoundPage         from './pages/NotFoundPage';
import RestaurantInfoPage   from './pages/RestaurantInfoPage';
import AddRestaurantPage    from './pages/AddRestaurantPage';

/* ───────────────────────── 1) Embed utilities ───────────────────────── */
function useIsEmbedPropOrQuery(isEmbedProp) {
  // Accept prop from index.js, but also allow ?embed=1 to force it.
  const { search, pathname } = useLocation();
  const params = React.useMemo(() => new URLSearchParams(search), [search]);
  const queryFlag = params.get('embed') === '1';
  const pathFlag = pathname === '/embed' || pathname.startsWith('/embed/');
  return Boolean(isEmbedProp || queryFlag || pathFlag);
}

/* Minimal wrapper that ensures full-viewport container and no outer chrome.
   You can also hide any global header/footer you might mount elsewhere by
   targeting the `.is-embed` HTML class in CSS. */
function EmbedLayout({ children }) {
  return (
    <div
      id="embed-root"
      style={{
        width: '100vw',
        height: 'calc(var(--vh, 1vh) * 100)',
        margin: 0,
        padding: 0,
        overflow: 'auto',
        display: 'block'
      }}
      data-embed="1"
      aria-label="Embedded presentation container"
    >
      {children}
    </div>
  );
}

/* Optional: Normal app shell wrapper; keep as-is or replace with your Layout. */
function AppShell({ children, isEmbed }) {
  // If you render a Header/Footer here, hide when isEmbed === true.
  return (
    <div
      className="App"
      data-embed={isEmbed ? '1' : '0'}
      style={{
        width: '100%',
        minHeight: 'calc(var(--vh, 1vh) * 100)',
        margin: 0,
        padding: 0
      }}
    >
      {/* Example:
          {!isEmbed && <Header />}
          <main>{children}</main>
          {!isEmbed && <Footer />} */}
      {children}
    </div>
  );
}

/* ───────────────────────── 2) Main component ───────────────────────── */
function App({ isEmbed = false }) {
  const isEmbedEffective = useIsEmbedPropOrQuery(isEmbed);

  return (
    <AppShell isEmbed={isEmbedEffective}>
      <AuthProvider>
        <Routes>
          {/* ───────────── Public routes ───────────── */}
          <Route path="/"                               element={<HomePage />} />
          <Route path="/login"                          element={<LoginPage />} />
          <Route path="/register"                       element={<RegisterPage />} />
          <Route path="/map"                            element={<MapPage />} />
          <Route path="/restaurantInfo/:restaurantId"   element={<RestaurantInfoPage />} />
          <Route path="/others/:userId"                 element={<OthersPage />} />

          {/* ───────────── Protected routes ───────────── */}
          <Route
            path="/my"
            element={<ProtectedRoute><MyPage /></ProtectedRoute>}
          />
          <Route
            path="/new"
            element={<ProtectedRoute><NewPage /></ProtectedRoute>}
          />
          <Route
            path="/edit/:reviewId"
            element={<ProtectedRoute><EditPage /></ProtectedRoute>}
          />
          <Route
            path="/follower"
            element={<ProtectedRoute><FollowerPage /></ProtectedRoute>}
          />
          <Route
            path="/following"
            element={<ProtectedRoute><FollowingPage /></ProtectedRoute>}
          />
          <Route
            path="/restaurant/new"
            element={<ProtectedRoute><AddRestaurantPage /></ProtectedRoute>}
          />

          {/* ───────────── Embed-focused, presentation-friendly routes ─────────────
              These routes intentionally avoid ProtectedRoute to keep them viewable
              inside Canva without login prompts. Adjust to your needs. */}
          <Route
            path="/embed"
            element={(
              <EmbedLayout>
                <MapPage />
              </EmbedLayout>
            )}
          />
          <Route
            path="/embed/map"
            element={(
              <EmbedLayout>
                <MapPage />
              </EmbedLayout>
            )}
          />
          <Route
            path="/embed/restaurant/:restaurantId"
            element={(
              <EmbedLayout>
                <RestaurantInfoPage />
              </EmbedLayout>
            )}
          />

          {/* ───────────── 404 ───────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </AppShell>
  );
}

export default App;