import "./RestaurantInfoPage.css";
import Header     from "../components/Header";
import PostList   from "../components/PostList";
import WordCloud  from "../components/WordCloud";
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
// import { FaBookmark } from "react-icons/fa6";

const API_ROOT = "/api";



/* helper: [{ keyword, frequency }] ➜ [{ name, frequency }] */
const mapKeywords = (arr = []) =>
  arr.map(({ keyword, frequency }) => ({ name: keyword, frequency }));

function RestaurantInfoPage() {
  /* ─────────── routing param ─────────── */
  const { restaurantId } = useParams(); // comes from /restaurantInfo/:restaurantId
  const navigate = useNavigate();

  /* ─────────── state ─────────── */
  const [restaurant, setRestaurant] = useState(null); // filled after fetch
  const [error,      setError]      = useState(null); // string | null
  const [loading,    setLoading]    = useState(true); // simple spinner flag
  // const [isBookmarked, setIsBookMarked] = useState(false); // 삭제 예정

  /* ─────────── data fetch ─────────── */
  const fetchRestaurantData = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_ROOT}/restaurant_info/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { success, data } = await res.json();
      if (!success || !data) throw new Error("API returned failure");

      setRestaurant({
        id      : data.id,
        name    : data.name,
        address : data.address ?? "주소 정보 없음",
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

  // 삭제 예정
  // const handleBookMarkClick = () => {
  //   setIsBookMarked((prev)=>!prev);
  // };

  /* ─────────── render ─────────── */
  if (loading)     return <div className="loading-screen">로딩 중…</div>;
  if (error)       return <div className="error-screen">{error}</div>;
  if (!restaurant) return null; // defensive – shouldn't normally happen

  return (
    <div className="restaurantInfopage-layout">
      <Header />

      <div className="main-content-wrapper">
        <main className="rIpage-middle-area">
          {/* ───────── Left column ───────── */}
          <div className="rIpage-left-part">
            <div className="back-space">
              <button className="rest-back-button" onClick={()=>{navigate(-1)}}><IoArrowBack size={20}/></button>
            </div>
            
              <div className="restaurant-info-container">
                {restaurant.image ? (
                  /* When an image URL exists, show it */
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="restaurant-image"
                  />
                ) : (
                  /* Otherwise, show text placeholder */
                  <div className="no-image-placeholder"> </div>
                )}
              {/* <div className="name-mark">
                
                <button className="bookmark" onClick={handleBookMarkClick}><FaBookmark size={25} color={isBookmarked ? '#672091' : 'black'}/></button>
              </div> */}
              <h2 className="restaurant-name">{restaurant.name}</h2>
              <p className="restaurant-address">{restaurant.address}</p>
              

              {/* Word-cloud – same width as thumbnail */}
              {restaurant.keywords.length > 0 && (
                <div className="word-cloud-container">
                  <div className="word-cloud-content">
                    <WordCloud
                      keywords={restaurant.keywords}
                      uniformColour="#672091" /* violet-500 */
                      height={150}
                      width={600}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ───────── Right column ───────── */}
          <div className="rIpage-right-part">
            <div className="rest-review">
              <h3 className="review-title">식당의 리뷰</h3>
            </div>
            
            {/* PostList already handles its own fetching when given restaurant_id */}
            <PostList columns={1} restaurant_id={restaurant.id} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default RestaurantInfoPage;