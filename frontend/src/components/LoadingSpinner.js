import React from "react";
import "./LoadingSpinner.css";

/*
 * Radial fading spinner.
 *  - BAR_W  : width  of a single bar in px
 *  - BAR_H  : height of a single bar in px
 *  - RADIUS : distance from centre to bar centre in px
 */
export default function LoadingSpinner() {
  const BAR_COUNT = 12;
  const BAR_W     = 6;
  const BAR_H     = 18;
  const RADIUS    = 36;               // perfect when spinner size = 90 px

  return (
    <div className="spinner-overlay">
      <div
        className="spinner"
        style={{
          "--bar-w": `${BAR_W}px`,
          "--bar-h": `${BAR_H}px`,
          "--radius": `${RADIUS}px`,
        }}
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const rot  = i * (360 / BAR_COUNT);
          const fade = i * 0.1;
          const lightness = 30 + (i * (60 / BAR_COUNT)); // purple → lavender

          return (
            <div
              key={i}
              className="spinner-bar"
              style={{
                transform: `rotate(${rot}deg) translate(0, calc(-1 * var(--radius)))`,
                backgroundColor: `hsl(270 70% ${lightness}%)`,
                animationDelay : `${fade}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}