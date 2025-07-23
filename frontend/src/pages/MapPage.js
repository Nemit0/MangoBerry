import React, {
  useEffect, useRef, useState, useCallback,
} from "react";
import { useNavigate }      from "react-router-dom";
import MapSidebar           from "../components/MapSidebar";
import "../pages/HomePage.css";
import "./MapPage.css";
import MapMarker            from "../assets/photo/MapMarker_36.png";
import { useAuth }          from "../contexts/AuthContext";
import { FaSpinner }        from "react-icons/fa";

/* ───────────────────────── constants ───────────────────────── */
const KAKAO_MAP_APP_KEY = process.env.REACT_APP_KAKAO_MAP_APP_KEY;
const API_URL           = "/api";
const DEFAULT_DISTANCE  = "5km";
const MAX_RESULTS       = 500;
const DEBOUNCE_MS       = 600;

/* ───────────────────────── helpers ───────────────────────── */
const average = (arr = []) =>
  arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

const parseDistanceKm = (d) => {
  const num = parseFloat(String(d).replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(num) ? num : 5;
};
const DISTANCE_THRESHOLD_KM = parseDistanceKm(DEFAULT_DISTANCE);

/* haversine distance (km) */
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => deg * (Math.PI / 180);
  const R     = 6371;
  const dLat  = toRad(lat2 - lat1);
  const dLon  = toRad(lon2 - lon1);
  const a     = Math.sin(dLat / 2) ** 2
              + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ───────────────────────── component ───────────────────────── */
function MapPage () {
  /* refs */
  const mapContainer          = useRef(null);
  const mapInstance           = useRef(null);
  const markersRef            = useRef([]);
  const idleTimerRef          = useRef(null);
  const isProgrammaticMoveRef = useRef(false);
  const originRef             = useRef(null);

  /* services */
  const { user } = useAuth();
  const viewerID = user?.user_id ?? null;
  const navigate = useNavigate();

  /* state */
  const [origin,          setOrigin]          = useState(null);
  const [restaurants,     setRestaurants]     = useState([]);
  const [followerRatings, setFollowerRatings] = useState({});
  const [threshold,       setThreshold]       = useState(0);
  const [selectedFol,     setSelectedFol]     = useState([]);
  const [displayed,       setDisplayed]       = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [isSidebarOpen,   SetIsSidebarOpen]   = useState(false); // 모바일환경에서 탐색버튼

  /* keep origin ref fresh */
  useEffect(() => { originRef.current = origin; }, [origin]);

  /* ─────────────────── geo helpers ─────────────────── */
  const fetchFromIpInfo = async () => {
    try {
      const resp = await fetch("https://ipinfo.io/json");
      const data = await resp.json();
      if (data.loc) {
        const [lat, lon] = data.loc.split(",").map(Number);
        return { lat, lon };
      }
    } catch {/* ignore */}
    return { lat: 37.566826, lon: 126.9786567 }; // Seoul fallback
  };

  const fetchCurrentLocation = useCallback(() => new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        async () => resolve(await fetchFromIpInfo()),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      fetchFromIpInfo().then(resolve);
    }
  }), []);

  /* ─────────────────── map bootstrap ─────────────────── */
  useEffect(() => {
    const loadMapSDK = () => new Promise((res, rej) => {
      if (window.kakao?.maps) return res();
      const script   = document.createElement("script");
      script.src     = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_APP_KEY}&libraries=services,clusterer,drawing&autoload=false`;
      script.async   = true;
      script.onload  = () => window.kakao.maps.load(res);
      script.onerror = rej;
      document.head.appendChild(script);
    });

    (async () => {
      await loadMapSDK();
      const originPos = await fetchCurrentLocation();
      setOrigin(originPos);

      const center = new window.kakao.maps.LatLng(originPos.lat, originPos.lon);
      mapInstance.current = new window.kakao.maps.Map(mapContainer.current, { center, level: 3 });

      const viewerMarker = new window.kakao.maps.Marker({ map: mapInstance.current, position: center });
      new window.kakao.maps.InfoWindow({
        content: '<div style="padding:5px;font-size:12px;">현재 내 위치</div>',
      }).open(mapInstance.current, viewerMarker);

      const handleIdle = () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          if (isProgrammaticMoveRef.current) { isProgrammaticMoveRef.current = false; return; }
          const c          = mapInstance.current.getCenter();
          const newOrigin  = { lat: c.getLat(), lon: c.getLng() };
          const currOrigin = originRef.current;
          if (!currOrigin) { setOrigin(newOrigin); return; }
          const distKm = haversineDistanceKm(currOrigin.lat, currOrigin.lon, newOrigin.lat, newOrigin.lon);
          if (distKm >= DISTANCE_THRESHOLD_KM) setOrigin(newOrigin);
        }, DEBOUNCE_MS);
      };
      window.kakao.maps.event.addListener(mapInstance.current, "idle", handleIdle);
      return () => window.kakao.maps.event.removeListener(mapInstance.current, "idle", handleIdle);
    })().catch((e) => alert(`Kakao Map init failed: ${e}`));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────── API helpers ─────────────────── */
  const fetchNearby = useCallback(async (viewer, center) => {
    if (!center) return [];
    const url = new URL(`${API_URL}/nearby_restaurant_es`, window.location.origin);
    url.searchParams.set("distance", DEFAULT_DISTANCE);
    url.searchParams.set("size",      MAX_RESULTS);
    if (viewer) url.searchParams.set("viewer_id", viewer);
    url.searchParams.set("y", center.lat);
    url.searchParams.set("x", center.lon);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 110000);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || "Unknown error");
      return json.results;
    } finally { clearTimeout(timer); }
  }, []);

  /* ─────────────────── initial + updated viewer list ─────────────────── */
  useEffect(() => {
    (async () => {
      if (!origin) return;
      setLoading(true);
      try {
        const data = await fetchNearby(viewerID, origin);
        setRestaurants(data);
      } catch (err) { console.error("[MapPage] fetchNearby (viewer) failed:", err); }
      finally      { setLoading(false); }
    })();
  }, [origin, viewerID, fetchNearby]);

  /* ─────────────────── followers lists ─────────────────── */
  useEffect(() => {
    if (!origin || selectedFol.length === 0) return;
    const fid = selectedFol[0];
    if (followerRatings[fid]) return;
    (async () => {
      try {
        const list            = await fetchNearby(fid, origin);
        const ratingsByRestID = Object.fromEntries(list.map((r) => [r.restaurant_id, r.rating]));
        setFollowerRatings((prev) => ({ ...prev, [fid]: ratingsByRestID }));
      } catch (err) { console.error("[MapPage] fetchNearby (follower) failed:", err); }
    })();
  }, [selectedFol, origin, fetchNearby, followerRatings]);

  /* ─────────────────── mean calc + filter ─────────────────── */
  useEffect(() => {
    if (restaurants.length === 0) return;
    const calcMean = (r) => {
      const ratings = [r.rating];
      selectedFol.forEach((fid) => {
        const fr = followerRatings[fid]?.[r.restaurant_id];
        if (typeof fr === "number") ratings.push(fr);
      });
      return average(ratings);
    };
    const withMean = restaurants.map((r) => ({ ...r, mean_rating: calcMean(r) }));
    const filtered = threshold === 0 ? withMean : withMean.filter((r) => r.mean_rating >= threshold);
    setDisplayed(filtered);
  }, [restaurants, followerRatings, selectedFol, threshold]);

  /* ─────────────────── marker renderer ─────────────────── */
  const renderMarkers = useCallback((places) => {
    const map = mapInstance.current;
    if (!map || !window.kakao?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds  = new window.kakao.maps.LatLngBounds();
    const imgSrc  = MapMarker;
    const imgSize = new window.kakao.maps.Size(36, 36);
    const imgOpt  = { offset: new window.kakao.maps.Point(13, 36) };

    places.forEach((p) => {
      const pos         = new window.kakao.maps.LatLng(p.y, p.x);
      const markerImage = new window.kakao.maps.MarkerImage(imgSrc, imgSize, imgOpt);
      const marker      = new window.kakao.maps.Marker({ map, position: pos, image: markerImage });

      const info = new window.kakao.maps.InfoWindow({
        zIndex: 1,
        content: `<div style="padding:5px;font-size:12px;">${p.name}<br/>취향률 ${p.mean_rating.toFixed(0)}%</div>`,
      });
      window.kakao.maps.event.addListener(marker, "mouseover", () => info.open(map, marker));
      window.kakao.maps.event.addListener(marker, "mouseout",  () => info.close());
      window.kakao.maps.event.addListener(marker, "click",     () => navigate(`/restaurantInfo/${p.restaurant_id}`));

      markersRef.current.push(marker);
      bounds.extend(pos);
    });

    if (places.length > 0) {
      isProgrammaticMoveRef.current = true;
      map.setBounds(bounds);
    }
  }, [navigate]);

  useEffect(() => { renderMarkers(displayed); }, [displayed, renderMarkers]);

  /* ─────────────────── restaurant click from sidebar ─────────────────── */
  const handleRestaurantClick = (r) => {
    if (!r || r.y == null || r.x == null || !window.kakao?.maps || !mapInstance.current) return;
    const newCenter = new window.kakao.maps.LatLng(r.y, r.x);
    isProgrammaticMoveRef.current = true;
    mapInstance.current.setCenter(newCenter);
    mapInstance.current.setLevel(3); // zoom‑in for detail
  };

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="map-page-layout">
      {loading && (
        <div className="loading-overlay">
          <FaSpinner className="spinner" />
          <span>음식점을 불러오는 중…</span>
        </div>
      )}

      <div className="map-content-wrapper">
        <MapSidebar
          restaurants={displayed}
          onPreferenceFilterChange={setThreshold}
          currentThreshold={threshold}
          onFollowerSelectionChange={setSelectedFol}
          onRestaurantClick={handleRestaurantClick}
          isOpen={isSidebarOpen}
          onClose={() => SetIsSidebarOpen(false)}
        />
        <main id="map" className="map-area" ref={mapContainer}>
          <button className="mobile-sidebar-toggle-button" onClick={() => SetIsSidebarOpen(true)}>
            탐색
          </button>
        </main>
      </div>
    </div>
  );
}

export default MapPage;