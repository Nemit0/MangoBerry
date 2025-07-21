import React, { useMemo } from "react";
import { WordCloud } from "@isoterik/react-word-cloud";

/* sentiment → colour helper */
const colour = (s) => {
  if (s === 1 || s === "positive" || s === "pos") return "#16a34a"; // green
  if (s === -1 || s === "negative" || s === "neg") return "#dc2626"; // red
  return "#6b7280";                                                  // grey
};

/**
 * Responsive Word-Cloud.
 * The parent div controls final sizing; we simply request a square canvas
 * that comfortably fits within the container.
 */
const MyWordCloud = ({ keywords = [], width = 300, height = 300 }) => {
  const words = useMemo(
    () => keywords.map((k) => ({
      text : k.name      ?? "?",
      value: k.frequency ?? 1,
      fill : colour(k.sentiment),
    })),
    [keywords],
  );

  if (!words.length)
    return <p style={{ color: "#888" }}>키워드가 없습니다.</p>;

  return (
    <WordCloud
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