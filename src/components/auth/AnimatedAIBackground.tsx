"use client";

import React from "react";

export function AnimatedAIBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#FAFAF9]"
      aria-hidden="true"
    >
      {/* Soft Ambient Radial Orbs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-linear-to-br from-indigo-500/12 via-indigo-400/8 to-transparent blur-3xl animate-orb" />
      <div
        className="absolute top-1/3 -right-40 w-[550px] h-[550px] rounded-full bg-linear-to-tl from-violet-500/12 via-cyan-400/6 to-transparent blur-3xl animate-orb"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute -bottom-40 left-1/4 w-[650px] h-[650px] rounded-full bg-linear-to-tr from-sky-400/8 via-indigo-400/8 to-transparent blur-3xl animate-orb"
        style={{ animationDelay: "4s" }}
      />

      {/* Subtle Micro-Dot Grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#4338CA 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Lightweight SVG Neural Network / Constellation Mesh */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.45]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connected Geometric Links */}
        <g stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="3 3">
          <line x1="12%" y1="20%" x2="28%" y2="35%" />
          <line x1="28%" y1="35%" x2="22%" y2="65%" />
          <line x1="22%" y1="65%" x2="38%" y2="78%" />
          <line x1="28%" y1="35%" x2="48%" y2="25%" />
          <line x1="48%" y1="25%" x2="68%" y2="32%" />
          <line x1="68%" y1="32%" x2="84%" y2="18%" />
          <line x1="68%" y1="32%" x2="76%" y2="60%" />
          <line x1="76%" y1="60%" x2="90%" y2="72%" />
          <line x1="48%" y1="25%" x2="52%" y2="70%" />
          <line x1="52%" y1="70%" x2="76%" y2="60%" />
          <line x1="38%" y1="78%" x2="52%" y2="70%" />
        </g>

        {/* Glowing Neural Nodes */}
        <g>
          <circle cx="12%" cy="20%" r="4" fill="#6366F1" opacity="0.6" />
          <circle cx="28%" cy="35%" r="5" fill="#4F46E5" opacity="0.7" />
          <circle cx="22%" cy="65%" r="4" fill="#8B5CF6" opacity="0.6" />
          <circle cx="38%" cy="78%" r="4" fill="#06B6D4" opacity="0.6" />
          <circle cx="48%" cy="25%" r="6" fill="#6366F1" opacity="0.8" />
          <circle cx="68%" cy="32%" r="5" fill="#8B5CF6" opacity="0.7" />
          <circle cx="84%" cy="18%" r="4" fill="#06B6D4" opacity="0.6" />
          <circle cx="76%" cy="60%" r="5" fill="#4F46E5" opacity="0.7" />
          <circle cx="90%" cy="72%" r="4" fill="#6366F1" opacity="0.6" />
          <circle cx="52%" cy="70%" r="5" fill="#8B5CF6" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
}
