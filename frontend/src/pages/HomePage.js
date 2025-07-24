import React, { useState } from "react";
import Header      from "../components/Header";
import PostList    from "../components/PostList";
import { useAuth } from "../contexts/AuthContext";
import WelcomePopup from "../components/WelcomePopup";

import "./HomePage.css";

/* ───────────────────────── component ───────────────────────── */
export default function HomePage () {
  /* search */
  const [searchTerm, setSearchTerm] = useState("");

  /* feed‑scope tab */
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);

  /* auth / popup */
  const { isLoggedIn, showWelcomePopup, closeWelcomePopUp } = useAuth();

  /* handlers */
  const handleSearchChange = (term) => setSearchTerm(term);
  const selectAll          = () => setShowFollowingOnly(false);
  const selectFollowing    = () => setShowFollowingOnly(true);

  return (
    <div className="homepage-layout">
      <Header searchTerm={searchTerm} onSearchChange={handleSearchChange} />

      {/* main content */}
      <div className="home-main-content-wrapper">
        <main className="homepage-middle-posts-area">
          {/* ─── feed‑scope tabs ─── */}
          <div className="feed-tabs">
            <button
              type="button"
              className={`feed-tab ${showFollowingOnly ? "" : "active"}`}
              onClick={selectAll}
            >
              전체
            </button>
            <button
              type="button"
              className={`feed-tab ${showFollowingOnly ? "active" : ""}`}
              onClick={selectFollowing}
            >
              팔로잉
            </button>
          </div>

          {/* PostList gets both searchTerm & scope flag */}
          <PostList
            searchTerm={searchTerm}
            columns={3}
            followingOnly={showFollowingOnly}
          />
        </main>

        {isLoggedIn && showWelcomePopup && (
          <WelcomePopup onClose={closeWelcomePopUp} />
        )}
      </div>
    </div>
  );
}
