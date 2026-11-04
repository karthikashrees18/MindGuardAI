// Wellness garden visuals.
//
//   <GardenPlant stage="seed|sprout|sapling|bloom|tree" size={220} />   hand-made SVG scene
//   <GardenCard />   compact card for Home — reads the garden from useApp()
import React, { useEffect, useId } from "react";
import { Flame, Sprout } from "lucide-react";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { Card, Skeleton } from "./ui";
import "../styles/home.css";

const LEAF = "M0 0 C 7 -9 21 -9 30 0 C 21 9 7 9 0 0 Z";

function Leaf({ x, y, a = 0, s = 1, fill = "url(#leaf)" }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d={LEAF} fill={fill} />
      <path d="M2 0 L24 0" stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none" />
    </g>
  );
}

function Flower({ x, y, s = 1, petal = "#ff9bc4", center = "#fbc65d" }) {
  const angles = [0, 72, 144, 216, 288];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {angles.map((a) => (
        <ellipse key={a} cx="0" cy="-8" rx="5.5" ry="8" fill={petal} transform={`rotate(${a})`} opacity="0.95" />
      ))}
      <circle r="4.6" fill={center} />
    </g>
  );
}

function Sparkle({ x, y, s = 1, delay = 0 }) {
  return (
    <path
      className="twinkle"
      style={{ animationDelay: `${delay}s` }}
      d="M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4 Z"
      fill="#fff6c9"
      transform={`translate(${x} ${y}) scale(${s})`}
    />
  );
}

export function GardenPlant({ stage = "seed", size = 220 }) {
  const uid = useId().replace(/:/g, "");
  const id = (n) => `${n}-${uid}`;
  const key = ["seed", "sprout", "sapling", "bloom", "tree"].includes(stage) ? stage : "seed";
  const idx = ["seed", "sprout", "sapling", "bloom", "tree"].indexOf(key);

  return (
    <svg
      className="mg-garden-svg"
      viewBox="0 0 200 220"
      width={size}
      height={size * 1.1}
      style={{ maxWidth: "100%", height: "auto" }}
      role="img"
      aria-label={`Your garden plant at the ${key} stage`}
    >
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d1b4f" />
          <stop offset="55%" stopColor="#3a3a85" />
          <stop offset="100%" stopColor="#3d8f9a" />
        </linearGradient>
        <radialGradient id={id("moon")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff6d6" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#fff6d6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#fff6d6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("soil")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a5a45" />
          <stop offset="100%" stopColor="#3f2d24" />
        </linearGradient>
        <linearGradient id={id("grass")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5fd18a" />
          <stop offset="100%" stopColor="#2f8f62" />
        </linearGradient>
        <linearGradient id={id("leaf")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2f9e6e" />
          <stop offset="100%" stopColor="#7be3a6" />
        </linearGradient>
        <linearGradient id={id("trunk")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6b4a36" />
          <stop offset="100%" stopColor="#9a7152" />
        </linearGradient>
        <radialGradient id={id("canopy")} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0%" stopColor="#8df0b3" />
          <stop offset="100%" stopColor="#2b9a6a" />
        </radialGradient>
        <radialGradient id={id("fly")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff8b0" />
          <stop offset="100%" stopColor="#fff8b0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sky */}
      <rect width="200" height="220" rx="20" fill={`url(#${id("sky")})`} />
      <circle cx="160" cy="42" r="34" fill={`url(#${id("moon")})`} />
      <circle cx="160" cy="42" r="10" fill="#fff6d6" opacity="0.92" />
      <Sparkle x={34} y={36} s={0.8} />
      <Sparkle x={62} y={70} s={0.6} delay={1.1} />
      <Sparkle x={120} y={22} s={0.7} delay={2} />
      <Sparkle x={22} y={104} s={0.55} delay={0.6} />

      {/* ground + pot of soil */}
      <path d="M0 196 Q100 166 200 196 L200 220 L0 220 Z" fill={`url(#${id("grass")})`} opacity="0.9" />
      <path d="M52 204 Q100 176 148 204 L148 220 L52 220 Z" fill={`url(#${id("soil")})`} />
      <path d="M52 204 Q100 176 148 204" fill="none" stroke="#9a7152" strokeWidth="1.5" opacity="0.6" />

      {/* plant */}
      <g className={`plant ${idx > 0 ? "sway" : ""}`}>
        {key === "seed" && (
          <g>
            <ellipse cx="100" cy="190" rx="7.5" ry="5" fill="#b98957" transform="rotate(-18 100 190)" />
            <path d="M95 189 Q100 186 105 190" fill="none" stroke="#7a5a45" strokeWidth="1.2" />
            <Sparkle x={100} y={170} s={0.9} />
          </g>
        )}

        {key === "sprout" && (
          <g>
            <path d="M100 192 Q99 176 100 160" stroke="#4cc28a" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <Leaf x={100} y={162} a={-35} s={0.95} fill={`url(#${id("leaf")})`} />
            <Leaf x={100} y={164} a={215} s={0.8} fill={`url(#${id("leaf")})`} />
          </g>
        )}

        {key === "sapling" && (
          <g>
            <path d="M100 192 Q96 160 100 118" stroke="#3fb57c" strokeWidth="4" strokeLinecap="round" fill="none" />
            <Leaf x={99} y={172} a={-20} s={0.9} fill={`url(#${id("leaf")})`} />
            <Leaf x={99} y={160} a={200} s={0.95} fill={`url(#${id("leaf")})`} />
            <Leaf x={98} y={146} a={-30} s={1} fill={`url(#${id("leaf")})`} />
            <Leaf x={98} y={134} a={210} s={0.95} fill={`url(#${id("leaf")})`} />
            <Leaf x={100} y={120} a={-70} s={0.85} fill={`url(#${id("leaf")})`} />
            <Leaf x={100} y={120} a={-115} s={0.85} fill={`url(#${id("leaf")})`} />
          </g>
        )}

        {key === "bloom" && (
          <g>
            <path d="M100 192 Q94 150 100 100" stroke="#3fb57c" strokeWidth="4.2" strokeLinecap="round" fill="none" />
            <path d="M99 160 Q82 148 78 124" stroke="#3fb57c" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M98 150 Q118 140 124 118" stroke="#3fb57c" strokeWidth="3" strokeLinecap="round" fill="none" />
            <Leaf x={99} y={178} a={-15} s={1} fill={`url(#${id("leaf")})`} />
            <Leaf x={99} y={170} a={195} s={1} fill={`url(#${id("leaf")})`} />
            <Leaf x={98} y={140} a={200} s={0.8} fill={`url(#${id("leaf")})`} />
            <Leaf x={99} y={130} a={-20} s={0.8} fill={`url(#${id("leaf")})`} />
            <Flower x={100} y={96} s={1.35} petal="#ff9bc4" />
            <Flower x={78} y={120} s={1} petal="#c9bcff" />
            <Flower x={124} y={116} s={1.05} petal="#ffd27a" center="#ff9b94" />
            <Sparkle x={140} y={90} s={0.8} delay={0.5} />
            <Sparkle x={58} y={100} s={0.7} delay={1.4} />
          </g>
        )}

        {key === "tree" && (
          <g>
            <path d="M90 194 Q94 160 91 126 L109 126 Q106 160 110 194 Z" fill={`url(#${id("trunk")})`} />
            <path d="M100 150 Q80 140 72 122" stroke="#7d5a40" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M100 146 Q122 136 130 120" stroke="#7d5a40" strokeWidth="5" strokeLinecap="round" fill="none" />
            <circle cx="72" cy="108" r="27" fill={`url(#${id("canopy")})`} />
            <circle cx="130" cy="108" r="27" fill={`url(#${id("canopy")})`} />
            <circle cx="100" cy="92" r="36" fill={`url(#${id("canopy")})`} />
            <circle cx="82" cy="76" r="24" fill={`url(#${id("canopy")})`} />
            <circle cx="120" cy="76" r="24" fill={`url(#${id("canopy")})`} />
            {/* blossoms */}
            {[[78, 86], [104, 70], [124, 92], [66, 112], [136, 112], [96, 104], [112, 56], [88, 60]].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="3.6" fill="#ffc2dc" />
                <circle cx={x} cy={y} r="1.4" fill="#fff6c9" />
              </g>
            ))}
            {/* fruit */}
            {[[70, 120], [134, 124], [102, 114]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="4.4" fill="#fbc65d" stroke="#e8a62f" strokeWidth="1" />
            ))}
            {/* drifting petals */}
            <circle className="fall" cx="64" cy="128" r="2.2" fill="#ffc2dc" />
            <circle className="fall" style={{ animationDelay: "-2.4s" }} cx="140" cy="126" r="2" fill="#ffc2dc" />
          </g>
        )}
      </g>

      {/* fireflies — a flourishing garden attracts them */}
      {key === "tree" && (
        <g>
          <circle className="fly" cx="42" cy="140" r="7" fill={`url(#${id("fly")})`} />
          <circle className="fly b" cx="160" cy="150" r="7" fill={`url(#${id("fly")})`} />
          <circle className="fly c" cx="52" cy="84" r="6" fill={`url(#${id("fly")})`} />
          <circle className="fly b" cx="150" cy="70" r="6" fill={`url(#${id("fly")})`} />
          <circle className="fly" cx="100" cy="160" r="5" fill={`url(#${id("fly")})`} />
        </g>
      )}
    </svg>
  );
}

export function GardenCard() {
  const { garden, refreshGarden } = useApp();

  useEffect(() => {
    if (!garden) refreshGarden();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!garden) return <Skeleton height={150} style={{ borderRadius: 22 }} />;

  const open = () => navigate("/garden");
  const more = garden.next_stage_at != null ? Math.max(0, garden.next_stage_at - garden.growth_points) : 0;

  return (
    <Card
      lift
      className="mg-gcard"
      role="link"
      tabIndex={0}
      aria-label="Open your wellness garden"
      onClick={open}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
    >
      <div className="scene"><GardenPlant stage={garden.stage} size={112} /></div>
      <div className="mg-stack-sm">
        <div className="mg-row mg-between">
          <div className="mg-eyebrow">Your garden</div>
          {garden.streak > 0 && (
            <span className="mg-badge violet"><Flame size={12} /> {garden.streak} day{garden.streak === 1 ? "" : "s"}</span>
          )}
        </div>
        <div className="mg-h3">{garden.stage_label}</div>
        <p className="mg-small mg-muted">{garden.message}</p>
        <div className="mg-progress" role="progressbar" aria-valuenow={garden.progress_pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next stage">
          <i style={{ width: `${garden.progress_pct}%` }} />
        </div>
        <div className="mg-tiny mg-faint">
          {garden.next_stage_label
            ? <><Sprout size={11} style={{ verticalAlign: "-1px" }} /> {more} more growth points to {garden.next_stage_label}</>
            : "Fully grown — keep enjoying it"}
        </div>
      </div>
    </Card>
  );
}
