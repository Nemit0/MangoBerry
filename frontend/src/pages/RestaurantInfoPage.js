import './RestaurantInfoPage.css';
import Header     from '../components/Header';
import PostList   from '../components/PostList';
import WordCloud  from '../components/WordCloud';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';

const API_ROOT = '/api';

/* helper: [{ keyword, frequency }] ➜ [{ name, frequency }] */
const mapKeywords = (arr = []) =>
  arr.map(({ keyword, frequency }) => ({ name: keyword, frequency }));

function RestaurantInfoPage() {
  /* ─────────── routing param ─────────── */
  const { restaurantId } = useParams();          // comes from /restaurantInfo/:restaurantId

  /* ─────────── state ─────────── */
  const [restaurant, setRestaurant] = useState(null); // filled after fetch
  const [error,      setError]      = useState(null); // string | null
  const [loading,    setLoading]    = useState(true); // simple spinner flag

  /* ─────────── data fetch ─────────── */
  const fetchRestaurantData = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_ROOT}/restaurant_info/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { success, data } = await res.json();
      if (!success || !data) throw new Error('API returned failure');

      setRestaurant({
        id      : data.id,
        name    : data.name,
        address : data.address ?? '주소 정보 없음',
        image   : data.image,                       // may be null
        keywords: mapKeywords(data.keywords || []),
      });
    } catch (err) {
      console.error(err);
      setError(`식당 정보를 가져오지 못했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  /* kick off fetch when component (or id) mounts */
  useEffect(() => {
    if (restaurantId) fetchRestaurantData(restaurantId);
  }, [restaurantId, fetchRestaurantData]);

  /* ─────────── render ─────────── */
  if (loading) return <div className="loading-screen">로딩 중…</div>;
  if (error)   return <div className="error-screen">{error}</div>;
  if (!restaurant) return null; // defensive – shouldn't normally happen

  return (
    <div className="restaurantInfopage-layout">
      <Header />

      <div className="main-content-wrapper">
        <main className="rIpage-middle-area">

          {/* ───────── Left column ───────── */}
          <div className="rIpage-left-part">
            <div className="restaurant-info-container">

              <img
                src={restaurant.image ?? '/default_restaurant.jpg'}  // fallback
                alt={restaurant.name}
                className="restaurant-image"
              />

              <h2 className="restaurant-name">{restaurant.name}</h2>
              <p className="restaurant-address">{restaurant.address}</p>

              {/* Word‑cloud – same width as thumbnail */}
              {restaurant.keywords.length > 0 && (
                <div className="word-cloud-container">
                  <h3 className="word-cloud-title">워드&nbsp;클라우드</h3>
                  <div className="word-cloud-content">
                    <WordCloud
                      keywords={restaurant.keywords}
                      uniformColour="#7c3aed"   /* violet‑500 */
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ───────── Right column ───────── */}
          <div className="rIpage-right-part">
            {/* PostList already handles its own fetching when given restaurant_id */}
            <PostList columns={1} restaurant_id={restaurant.id} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default RestaurantInfoPage;