import React, { useEffect, useMemo, useRef, useState } from "react";
import { WordCloud as LibWordCloud } from "@isoterik/react-word-cloud";

/* ------------------------------------------------------------------ */
/*  1.  Colour helpers                                                */
/* ------------------------------------------------------------------ */
const sentimentColour = (s) => {
  if (s === 1 || s === "positive" || s === "pos") return "#99DAA9"; // green‑600
  if (s === -1 || s === "negative" || s === "neg") return "#F59B9B"; // red‑600
  return "#6b7280";                                                  // gray‑500
};

/* ------------------------------------------------------------------ */
/*  2.  Component                                                     */
/* ------------------------------------------------------------------ */
const MyWordCloud = ({
  keywords       = [],         // [{ name, frequency, sentiment? }]
  uniformColour  = null,       // optional override colour
  minFont        = 14,         // lower bound (px) so tiny words stay legible
  maxFont        = 80,         // upper bound (px) so nothing grows absurdly
}) => {
  /* 2‑A. Track the actual pixel size of our wrapper <div> */
  const containerRef = useRef(null);
  const [{ width, height }, setSize] = useState({ width: 300, height: 150 });

  useEffect(() => {
    if (!containerRef.current) return;

    /* ResizeObserver → updates whenever the box is resized */
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize({ width: Math.floor(w), height: Math.floor(h) });
    });
    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, []);

  /* 2‑B. Enrich the raw keywords for the library */
  const words = useMemo(
    () =>
      keywords.map((k) => ({
        text : k.name      ?? "?",
        value: k.frequency ?? 1,
        fill : uniformColour || sentimentColour(k.sentiment),
      })),
    [keywords, uniformColour]
  );

  /* 2‑C. Dynamic font‑size strategy
   *      – Each word gets the usual √value ramp
   *      – PLUS a multiplier based on how many total words there are
   *          *  0‑5   words → ×2.5
   *          *  6‑10  words → ×1.8
   *          * 11‑20  words → ×1.3
   *          * >20    words → ×1.0
   */
  const crowdFactor = useMemo(() => {
    const n = words.length;
    if (n <= 5)  return 2.5;
    if (n <= 10) return 1.8;
    if (n <= 20) return 1.3;
    return 1.0;
  }, [words.length]);

  const fontSize = (w) => {
    const raw     = (Math.sqrt(w.value) * 1 + minFont) * crowdFactor;
    const clamped = Math.max(minFont, Math.min(maxFont, raw));
    return clamped;
  };

  /* 2‑D. Graceful empty state */
  if (words.length === 0) {
    return <p style={{ color: "#888" }}>키워드가 없습니다.</p>;
  }

  /* 2‑E. Render the library inside a responsive wrapper */
  return (
    <div
      ref={containerRef}
      style={{
        width : "100%",   // parent decides the actual pixel size
        height: "100%",   // ditto
      }}
    >
      <LibWordCloud
        words={words}
        width={width}
        height={height}
        fontSize={fontSize}
        fill={(w) => w.fill}
        deterministic                /* same layout on every render */
        fontWeight="bold"
        font="IBM_Plex_Sans_KR"
        rotate={()=>0}
      />
    </div>
  );
};

export default MyWordCloud;