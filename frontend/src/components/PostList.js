import { useState, useEffect } from "react";
import PostItem    from "../components/PostItem";
import Modal       from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";
import "./PostList.css";

const API_URL       = "/api";
const DEFAULT_IMAGE =
  "https://mangoberry-bucket.s3.ap-northeast-2.amazonaws.com/test/single/final_logo.jpg";

function PostList({
  searchTerm = "",
  isMyPage   = false,
  user_id    = null,
  restaurant_id = null,
  columns    = 3
}) {
  /* ─────────────── state ─────────────── */
  const [posts,       setPosts]       = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected,    setSelected]    = useState(null);

  const { user } = useAuth();
  const viewerId = user?.user_id ?? null;   // logged‑in user

  /* ───────────── initial fetch ───────────── */
  useEffect(() => {
    (async () => {
      try {
        /* base search (freq‑sorted) */
        let url = `${API_URL}/search_review_es?size=50&sort=frequent`;

        /* viewer context (used for personalised scores) */
        if (viewerId) url += `&viewer_id=${viewerId}`;

        /* owner filter */
        if (isMyPage && viewerId)        url += `&user_id=${viewerId}`;
        else if (!isMyPage && user_id)   url += `&user_id=${user_id}`;

        if (restaurant_id) {
          url += `&restaurant_id=${restaurant_id}`;
        }

        const resp = await fetch(url, { headers: { "Content-Type": "application/json" } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const { success, result, error } = await resp.json();
        if (!success) throw new Error(error ?? "Unknown error");

        /* flatten & normalise */
        const normalised = result.map((raw, idx) => {
          const images =
            Array.isArray(raw.images) && raw.images.length
              ? Array.isArray(raw.images[0])
                ? raw.images[0]
                : raw.images
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
          };
        });

        /* newest first */
        normalised.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setPosts(normalised);
        setFiltered(normalised);
      } catch (e) {
        console.error("[PostList] load failed:", e);
      }
    })();
  }, [viewerId, isMyPage, user_id]);

  /* ────────────── search filter ────────────── */
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFiltered(posts);
      return;
    }
    const q = searchTerm.toLowerCase();
    setFiltered(
      posts.filter(p =>
        [p.r_name, p.title, [p.user], [p.content]]
          .flat()
          .join(" ")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [searchTerm, posts]);

  /* ───────────── modal control ───────────── */
  const open  = p => { setSelected(p); setIsModalOpen(true); };
  const close = () => { setIsModalOpen(false); setSelected(null); };

  /* ────────────── render ────────────── */
  return (
    <div className="post-list-wrapper">
      <div className={`post-grid-container columns-${columns}`}>
        {filtered.length ? (
          filtered.map(p => <PostItem key={p.id} post={p} onClick={open} />)
        ) : (
          <p className="no-results">
            {searchTerm
              ? `"${searchTerm}"에 대한 결과가 없습니다.`
              : "게시물이 없습니다."}
          </p>
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

export default PostList;