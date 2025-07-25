/* MapPage.js */
import React, {
  useEffect, useRef, useState, useCallback,
  startTransition,
} from "react";
import { useNavigate }       from "react-router-dom";
import MapSidebar            from "../components/MapSidebar";
import "../pages/HomePage.css";
import "./MapPage.css";
import FoxMarker             from "../assets/photo/fox_tail/fox_tail_lev1.png";
import { useAuth }           from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

/* ───────────────────────── constants ───────────────────────── */
const KAKAO_MAP_APP_KEY = process.env.REACT_APP_KAKAO_MAP_APP_KEY;
const API_URL           = "/api";
const DEFAULT_DISTANCE  = "1km";
const MAX_RESULTS       = 200;
const DISTANCE_THRESHOLD_KM = parseDistanceKm(DEFAULT_DISTANCE);
const DEBOUNCE_MS       = 600;   // map idle debounce (kept)
const API_THROTTLE_MS   = 1200;  // minimum ms between real API calls
const IMG_W             = 18;
const IMG_H             = 36;
const LIGHT_GREY        = 230;   // light grey target for 0 %

/* ───────────────────────── helpers ───────────────────────── */
function average (arr = []) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}
function parseDistanceKm (d) {
  const num = parseFloat(String(d).replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(num) ? num : 5;
}
function haversineDistanceKm (lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * (Math.PI / 180);
  const R     = 6371;
  const dLat  = toRad(lat2 - lat1);
  const dLon  = toRad(lon2 - lon1);
  const a     = Math.sin(dLat / 2) ** 2
              + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ────────── dynamic marker-image cache (0 – 100 %) ────────── */
const foxImg = new Image();
foxImg.src   = FoxMarker;

const markerCache = {};  // 0..100 → kakao.maps.MarkerImage
function getMarkerImageForRating (rating) {
  const key = Math.round(Math.max(0, Math.min(100, rating)));
  if (markerCache[key]) return markerCache[key];

  if (!foxImg.complete) {
    foxImg.onload = () => { Object.keys(markerCache).forEach((k) => delete markerCache[k]); };
    return new window.kakao.maps.MarkerImage(
      FoxMarker,
      new window.kakao.maps.Size(IMG_W, IMG_H),
      { offset: new window.kakao.maps.Point(13, IMG_H) },
    );
  }

  const canvas  = document.createElement("canvas");
  canvas.width  = IMG_W;
  canvas.height = IMG_H;
  const ctx     = canvas.getContext("2d");

  ctx.drawImage(foxImg, 0, 0, IMG_W, IMG_H);
  const imgData = ctx.getImageData(0, 0, IMG_W, IMG_H);
  const data    = imgData.data;
  const blend   = key / 100;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    data[i]     = LIGHT_GREY * (1 - blend) + r * blend;
    data[i + 1] = LIGHT_GREY * (1 - blend) + g * blend;
    data[i + 2] = LIGHT_GREY * (1 - blend) + b * blend;
  }
  ctx.putImageData(imgData, 0, 0);

  const tintedUrl = canvas.toDataURL("image/png");
  const markerImg = new window.kakao.maps.MarkerImage(
    tintedUrl,
    new window.kakao.maps.Size(IMG_W, IMG_H),
    { offset: new window.kakao.maps.Point(13, IMG_H) },
  );
  markerCache[key] = markerImg;
  return markerImg;
}

/* ────────── simple LRU-ish cache for nearby results ────────── */
const RESULT_CACHE_MAX = 30;
const resultCache = new Map(); // key -> { time, data }
function makeCacheKey (viewer, center) {
  const lat = Math.round(center.lat * 1e4);
  const lon = Math.round(center.lon * 1e4);
  return `${viewer ?? "anon"}|${lat}|${lon}|${DEFAULT_DISTANCE}|${MAX_RESULTS}`;
}
function cachePut (key, data) {
  if (resultCache.has(key)) resultCache.delete(key);
  resultCache.set(key, { time: Date.now(), data });
  if (resultCache.size > RESULT_CACHE_MAX) {
    const oldestKey = [...resultCache.entries()].sort((a, b) => a[1].time - b[1].time)[0][0];
    resultCache.delete(oldestKey);
  }
}
function cacheGet (key) {
  const v = resultCache.get(key);
  if (!v) return null;
  return v.data;
}

/* ───────────────────────── component ───────────────────────── */
export default function MapPage () {
  /* refs */
  const mapContainer          = useRef(null);
  const mapInstance           = useRef(null);
  const markersRef            = useRef([]);
  const idleTimerRef          = useRef(null);
  const isProgrammaticMoveRef = useRef(false);
  const originRef             = useRef(null);

  // request control
  const abortRef              = useRef(null);      // AbortController
  const requestSeqRef         = useRef(0);         // increasing id to “take latest”
  const lastApiCallTsRef      = useRef(0);         // time-throttle

  /* services */
  const { user }    = useAuth();
  const viewerID    = user?.user_id ?? null;
  const navigate    = useNavigate();

  /* state */
  const [origin,          setOrigin]          = useState(null);
  const [restaurants,     setRestaurants]     = useState([]);
  const [followerRatings, setFollowerRatings] = useState({});
  const [threshold,       setThreshold]       = useState(0);
  const [selectedFol,     setSelectedFol]     = useState([]);
  const [displayed,       setDisplayed]       = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [isSidebarOpen,   SetIsSidebarOpen]   = useState(false);

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
    return { lat: 37.525202, lon: 126.925769 }; // IBM Korea
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

  /* ─────────────────── NEW: clear follower cache when origin changes ─────────────────── */
  useEffect(() => {
    // Whenever the centre of the map moves far enough to generate a new `origin`,
    // we throw away any follower-specific ratings so that a fresh query will be
    // made for the follower the next time they are (or remain) selected.
    setFollowerRatings({});
  }, [origin]);

  /* ─────────────────── API helper with cancellation & take-latest ─────────────────── */
  const fetchNearby = useCallback(async (viewer, center) => {
    if (!center) return [];

    const now = Date.now();
    const since = now - lastApiCallTsRef.current;
    if (since < API_THROTTLE_MS) {
      await new Promise((r) => setTimeout(r, API_THROTTLE_MS - since));
    }
    lastApiCallTsRef.current = Date.now();

    const key = makeCacheKey(viewer, center);
    const cached = cacheGet(key);
    if (cached) return cached;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const mySeq = ++requestSeqRef.current;

    const url = new URL(`${API_URL}/nearby_restaurant_es`, window.location.origin);
    url.searchParams.set("distance", DEFAULT_DISTANCE);
    url.searchParams.set("size",      MAX_RESULTS);
    if (viewer) url.searchParams.set("viewer_id", viewer);
    url.searchParams.set("y", center.lat);
    url.searchParams.set("x", center.lon);

    setLoading(true);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || "Unknown error");

      if (mySeq === requestSeqRef.current) {
        cachePut(key, json.results);
        return json.results;
      }
      return [];
    } catch (err) {
      if (controller.signal.aborted) return [];
      console.error("[MapPage] fetchNearby error:", err);
      throw err;
    } finally {
      if (mySeq === requestSeqRef.current) {
        startTransition(() => setLoading(false));
      }
    }
  }, []);

  /* ─────────────────── initial + viewer list ─────────────────── */
  useEffect(() => {
    (async () => {
      if (!origin) return;
      try {
        const data = await fetchNearby(viewerID, origin);
        if (data.length > 0) setRestaurants(data);
      } catch {/* logged already */}
    })();
  }, [origin, viewerID, fetchNearby]);

  /* ─────────────────── follower lists ─────────────────── */
  useEffect(() => {
    if (!origin || selectedFol.length === 0) return;
    const fid = selectedFol[0];
    if (followerRatings[fid]) return;

    (async () => {
      try {
        const list            = await fetchNearby(fid, origin);
        const ratingsByRestID = Object.fromEntries(list.map((r) => [r.restaurant_id, r.rating]));
        setFollowerRatings((prev) => ({ ...prev, [fid]: ratingsByRestID }));
      } catch (err) {
        console.error("[MapPage] fetchNearby (follower) failed:", err);
      }
    })();
  }, [selectedFol, origin, fetchNearby, followerRatings]);

  /* ─────────────────── mean calc + filter ─────────────────── */
  useEffect(() => {
    if (restaurants.length === 0) { setDisplayed([]); return; }

    const calcMean = (r) => {
      const ratings = [r.rating];
      selectedFol.forEach((fid) => {
        const fr = followerRatings[fid]?.[r.restaurant_id];
        if (typeof fr === "number") ratings.push(fr);
      });
      return average(ratings);   // ← arithmetic mean of viewer + each selected follower
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

    const bounds = new window.kakao.maps.LatLngBounds();

    places.forEach((p) => {
      const pos         = new window.kakao.maps.LatLng(p.y, p.x);
      const markerImage = getMarkerImageForRating(p.mean_rating);
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
    mapInstance.current.setLevel(3);
  };

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="map-page-layout">
      {loading && (
        <div className="loading-overlay">
          <LoadingSpinner/>
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

        <button className="mobile-sidebar-toggle-button" onClick={() => SetIsSidebarOpen(true)}>
          검색
        </button>
        <main id="map" className="map-area" ref={mapContainer}>
        </main>
      </div>
    </div>
  );
}