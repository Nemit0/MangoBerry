// WelcomePopup.js
// A first‑time “interest keyword” selector.
// When the user presses “선택 완료”, the chosen keywords are sent to
//   POST /api/initialize_keywords   { user_id, keywords }
// to create their initial keyword profile.

import React, { useState } from "react";
import "./WelcomePopup.css";
import { useAuth } from "../contexts/AuthContext";   // current user context

/* ------------------------------------------------------------------ */
/* Static keyword dictionary – tweak/extend freely                    */
/* ------------------------------------------------------------------ */
const KEYWORDS = {
  맛:      ["#인생 맛집", "#존맛탱", "#깊은 맛", "#감칠맛", "#쫄깃함", "#바삭함",
            "#신선한 재료", "#딱 맞는 간", "#매운 맛", "#건강한 맛", "#비건", "#고소한 맛"],
  가격:     ["#가성비", "#합리적인 가격", "#푸짐한 양", "#저렴한 가격"],
  분위기:   ["#데이트 분위기", "#인스타 감성", "#조용한 분위기", "#아늑함", "#편안함",
            "#뷰맛집", "#세련된 디자인", "#이쁜 플레이팅", "#대화하기 좋다", "#사진이 잘나온다",
            "#혼밥하기 좋은"],
  서비스:   ["#친절함", "#빠른 응대", "#세심한 배려", "#사장님이 기억해줌"],
  "위생/청결": ["#깨끗함", "#청결함", "#위생적", "#깨끗한 화장실"],
  "특별한 경험": ["#숨겨진 맛집", "#이색적인 메뉴", "#기념일에 좋음", "#모임 장소로 최고",
               "#나만 알고 싶은 곳", "#또 오고 싶은 곳", "#재방문 의사 100%"],
};

/* API root – CRA proxy in dev rewrites /api → FastAPI */
const API_ROOT = "/api";

function WelcomePopup({ onClose }) {
  const { user } = useAuth();                   // { user_id, … }
  const [selected, setSelected] = useState([]); // string[]

  /* ---------------------------------------------------------------- */
  /* Handlers                                                         */
  /* ---------------------------------------------------------------- */
  const toggleKeyword = (kw) => {
    setSelected((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (selected.length === 0) {
      alert("키워드를 하나 이상 선택해주세요.");
      return;
    }

    try {
      const resp = await fetch(`${API_ROOT}/initialize_keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: String(user.user_id),   // FastAPI expects str
          keywords: selected,              // list[str]
        }),
      });

      if (!resp.ok) {
        const { detail = "알 수 없는 오류" } = await resp.json();
        throw new Error(detail);
      }

      const json = await resp.json();
      console.log("[WelcomePopup] keyword init success:", json);
      onClose();                           // hide popup
    } catch (err) {
      console.error("[WelcomePopup] keyword init failed:", err);
      alert(`키워드 저장에 실패했습니다: ${err.message}`);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="welcome-popup-overlay">
      <div className="welcome-popup-content">
        <h2 className="popup-main-title">찾고 싶은 식당의 키워드를 선택해주세요</h2>

        {/* Category → buttons */}
        <div className="keyword-sections">
          {Object.entries(KEYWORDS).map(([category, list]) => (
            <section key={category} className="keyword-category">
              <h3>{category}</h3>
              <div className="keyword-buttons">
                {list.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    className={`keyword-button${
                      selected.includes(kw) ? " selected" : ""
                    }`}
                    onClick={() => toggleKeyword(kw)}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Actions */}
        <div className="popup-actions">
          <button className="popup-button submit-button" onClick={handleSubmit}>
            선택&nbsp;완료
          </button>
          <button className="popup-button skip-button" onClick={onClose}>
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomePopup;
