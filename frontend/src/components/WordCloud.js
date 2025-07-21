/*  WordCloud.js
 *  – General‑purpose word‑cloud component.
 *  – NEW prop `uniformColour` overrides sentiment colours when provided.
 *  – MyPage passes nothing → keeps old green / red scheme.
 *    RestaurantInfoPage passes a purple hex → every word is purple.
 */
import React, { useMemo } from "react";
import { WordCloud as LibWordCloud } from "@isoterik/react-word-cloud";

/* Map sentiment (if any) → colour. */
const sentimentColour = (s) => {
  if (s === 1 || s === "positive" || s === "pos") return "#16a34a"; // green‑600
  if (s === -1 || s === "negative" || s === "neg") return "#dc2626"; // red‑600
  return "#6b7280";                                                  // gray‑500
};

const MyWordCloud = ({
  keywords = [],
  width = 300,
  height = 300,
  uniformColour = null,              // NEW
}) => {
  /* Convert keywords into the format expected by the library. */
  const words = useMemo(
    () =>
      keywords.map((k) => ({
        text : k.name      ?? "?",
        value: k.frequency ?? 1,
        fill : uniformColour || sentimentColour(k.sentiment),
      })),
    [keywords, uniformColour]
  );

  if (!words.length)
    return <p style={{ color: "#888" }}>키워드가 없습니다.</p>;

  return (
    <LibWordCloud
      words={words}
      width={width}
      height={height}
      fontSize={(w) => 12 + Math.sqrt(w.value) * 6}
      fill={(w) => w.fill}
      deterministic
    />
  );
};

export default MyWordCloud;
