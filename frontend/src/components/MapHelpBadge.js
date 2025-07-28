import React, { useEffect, useRef, useState } from "react";
import "./MapHelpBadge.css";

export default function MapHelpBadge () {
  const [open, setOpen] = useState(false);
  const panelRef        = useRef(null);

  /* Close when clicking outside the panel */
  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* Keyboard accessibility */
  const onBadgeKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    }
  };

  return (
    <div className="map-help-badge-root" aria-live="polite">
      {!open && (
        <button
          type="button"
          className="map-help-badge-button"
          aria-label="마커 색상 안내 열기"
          onClick={() => setOpen(true)}
          onKeyDown={onBadgeKey}
        >
          ?
        </button>
      )}

      {open && (
        <div className="map-help-panel" ref={panelRef} role="dialog" aria-label="마커 색상 안내">
          <div className="map-help-panel-header">
            <strong className="map-help-title">마커 색상 안내</strong>
            <button
              type="button"
              className="map-help-close"
              aria-label="닫기"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="map-help-body">
            <p className="map-help-text">
              여우꼬리 마커는 <b>취향률(0–100%)</b>에 따라 색이 달라집니다.
            </p>

            {/* Simple legend bar (left: light gray = 0%, right: vivid = 100%) */}
            <div className="map-help-legend">
              <span className="legend-label">0%</span>
              <div className="legend-bar" aria-hidden="true"></div>
              <span className="legend-label">100%</span>
            </div>

            <ul className="map-help-list">
              <li><b>0%</b>에 가까울수록 <b>연한 회색</b>에 가깝게 보입니다.</li>
              <li><b>100%</b>에 가까울수록 원본 아이콘 색상에 가깝게 표시됩니다.</li>
              <li>
                팔로잉을 선택하면 <b>본인+선택한 팔로워의 평균 취향률</b>로 색상이 결정됩니다.
              </li>
            </ul>

            <p className="map-help-note">
              지도 이동/확대와 무관하게 각 식당의 평균 취향률이 바뀌면 즉시 갱신됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}