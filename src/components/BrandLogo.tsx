"use client";

import React from "react";

interface BrandLogoProps {
  size?: number | "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

export default function BrandLogo({
  size = "md",
  showText = true,
  subtitle,
  className = "",
}: BrandLogoProps) {
  let pixelSize = 38;
  if (typeof size === "number") pixelSize = size;
  else if (size === "sm") pixelSize = 32;
  else if (size === "md") pixelSize = 42;
  else if (size === "lg") pixelSize = 54;

  return (
    <div
      className={`brand-logo-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.75rem",
        userSelect: "none",
      }}
    >
      <div
        className="brand-logo-icon"
        style={{
          width: `${pixelSize}px`,
          height: `${pixelSize}px`,
          minWidth: `${pixelSize}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <img
          src="/veltech-logo.png"
          alt="Vel Tech Rangarajan Dr. Sagunthala R&D Institute Logo"
          width={pixelSize}
          height={pixelSize}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: "50%",
            filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.2))",
          }}
        />
      </div>

      {showText && (
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              lineHeight: 1.15,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-heading), var(--font-sans)",
                fontSize: `${Math.max(1, pixelSize * 0.038)}rem`,
                fontWeight: "800",
                letterSpacing: "-0.025em",
                color: "var(--text-main)",
              }}
            >
              VM-HUB
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: "700",
                padding: "0.15rem 0.35rem",
                borderRadius: "4px",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                color: "var(--primary, #2563eb)",
                letterSpacing: "0.03em",
                border: "1px solid rgba(37, 99, 235, 0.2)",
              }}
            >
              PRO
            </span>
          </div>
          {subtitle && (
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: "600",
                color: "var(--primary, #2563eb)",
                letterSpacing: "0.01em",
                marginTop: "0.15rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
