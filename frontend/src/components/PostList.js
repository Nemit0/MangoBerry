import { useState, useEffect } from "react";
import PostItem    from "../components/PostItem";
import Modal       from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";
import "./PostList.css";

const API_URL       = "/api";
const DEFAULT_IMAGE =
  "https://mangoberry-bucket.s3.ap-northeast-2.amazonaws.com/test/single/final_logo.jpg";

export default function PostList ({
  searchTerm     = "",
  isMyPage       = false,
  user_id        = null,
  restaurant_id  = null,
  columns        = 3,
  followingOnly  = false,   // ★ NEW
}) {
  /* ─────────────── state ─────────────── */
  const [posts,       setPosts]       = useState([]);
  const [visible,     setVisible]     = useState([]);   // filtered & scoped list
  const [loading,     setLoading]     = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected,    setSelected]    = useState(null);

  const { user }  = useAuth();
  const viewerId  = user?.user_id ?? null;

  /* ───────────── initial fetch ───────────── */
  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        setLoading(true);
        let url = `${API_URL}/search_review_es?size=50&sort=frequent`;
        if (viewerId) url += `&viewer_id=${viewerId}`;
        if (isMyPage && viewerId)        url += `&user_id=${viewerId}`;
        else if (!isMyPage && user_id)   url += `&user_id=${user_id}`;
        if (restaurant_id) url += `&restaurant_id=${restaurant_id}`;

        const resp = await fetch(url, { headers: { "Content-Type": "application/json" } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const { success, result, error } = await resp.json();
        if (!success) throw new Error(error ?? "Unknown error");

        if (abort) return;

        /* flatten & normalise */
        const normalised = result.map((raw, idx) => {
          const images =
            Array.isArray(raw.images) && raw.images.length
              ? Array.isArray(raw.images[0]) ? raw.images[0] : raw.images
              : [DEFAULT_IMAGE];

          return {
            id:            raw.review_id ?? idx,
            r_name:        raw.restaurant_name ? [raw.restaurant_name] : [],
            title:         raw.comments        ? [raw.comments]        : [],
            user:          raw.nickname        ?? "Unknown",
            user_profile:  raw.profile_url     ?? "",
            rating:        raw.rating          ?? 0,
            content:       raw.review          ?? "",
            datePosted:    (raw.created_at ?? "").split("T")[0].replace(/-/g, "."),
            images,
            keywords:      raw.keywords        ?? [],
            restaurant_id: raw.restaurant_id,
            user_id:       raw.user_id,
            created_at:    raw.created_at,
            is_following:  raw.is_following    ?? false,   // ★ NEW
          };
        });

        /* newest first */
        normalised.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setPosts(normalised);
      } catch (e) {
        console.error("[PostList] load failed:", e);
        setPosts([]);
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => { abort = true; };
  }, [viewerId, isMyPage, user_id, restaurant_id]);

  /* ───────────── search + following filter ───────────── */
  useEffect(() => {
    /* 1. search filter */
    const bySearch = !searchTerm.trim()
      ? posts
      : posts.filter(p =>
          [p.r_name, p.title, [p.user], [p.content]]
            .flat()
            .join(" ")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
        );

    /* 2. following‑scope filter */
    const scoped = followingOnly ? bySearch.filter(p => p.is_following) : bySearch;

    setVisible(scoped);
  }, [searchTerm, posts, followingOnly]);

  /* ───────────── modal control ───────────── */
  const open  = p => { setSelected(p); setIsModalOpen(true); };
  const close = () => { setIsModalOpen(false); setSelected(null); };

  /* ─────────── helper: placeholder renderer ─────────── */
  const renderPlaceholder = () => (
    <p className="no-results">
      {loading
        ? "게시물을 불러오는 중입니다…"
        : followingOnly && !viewerId
          ? "로그인 후 팔로우한 계정을 확인할 수 있습니다."
          : visible.length
            ? null
            : searchTerm
              ? `"${searchTerm}"에 대한 결과가 없습니다.`
              : "아직 작성된 리뷰가 없습니다."}
    </p>
  );

  /* ────────────── render ────────────── */
  return (
    <div className="post-list-wrapper">
      <div className={`post-grid-container columns-${columns}`}>
        {visible.length ? (
          visible.map(p => <PostItem key={p.id} post={p} onClick={open} />)
        ) : (
          renderPlaceholder()
        )}
      </div>

      {selected && (
        <Modal
          isOpen={isModalOpen}
          onClose={close}
          selectedPost={selected}
          isMyPage={isMyPage}
        />
      )}
    </div>
  );
}