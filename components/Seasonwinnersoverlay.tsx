"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { getInitials } from "@/lib/utils";

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  total_points: number;
  correct_predictions: number;
  total_predictions: number;
  voting_streak: number;
  season_bonus?: number;
}

interface SeasonWinnersOverlayProps {
  onClose: () => void;
}

// ─── Confetti hook ────────────────────────────────────────────────────────────
function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<object[]>([]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = [
      "#FFD700",
      "#FF6B2B",
      "#FF4ECD",
      "#00E5FF",
      "#76FF03",
      "#FF1744",
      "#E040FB",
      "#FFF176",
    ];
    const SHAPES = ["rect", "circle", "star"] as const;

    type Particle = {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      shape: (typeof SHAPES)[number];
      vx: number;
      vy: number;
      vr: number;
      rot: number;
      alpha: number;
      decay: number;
      gravity: number;
      wobble: number;
      wobbleSpeed: number;
      wobbleOffset: number;
      life: number;
    };

    function createParticle(burst = false): Particle {
      return {
        x: Math.random() * canvas.width,
        y: burst ? Math.random() * canvas.height * 0.5 : -20,
        w: Math.random() * 10 + 4,
        h: Math.random() * 6 + 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        vx: (Math.random() - 0.5) * (burst ? 10 : 3),
        vy: burst ? (Math.random() - 0.8) * 12 : Math.random() * 4 + 2,
        vr: (Math.random() - 0.5) * 0.15,
        rot: Math.random() * Math.PI * 2,
        alpha: 1,
        decay: Math.random() * 0.003 + 0.001,
        gravity: 0.06,
        wobble: Math.random() * 0.1,
        wobbleSpeed: Math.random() * 0.05,
        wobbleOffset: Math.random() * Math.PI * 2,
        life: 0,
      };
    }

    for (let i = 0; i < 140; i++)
      particlesRef.current.push(createParticle(true));

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      if (frame < 300 && frame % 3 === 0) {
        particlesRef.current.push(createParticle());
        particlesRef.current.push(createParticle());
      }
      particlesRef.current = particlesRef.current.filter(
        (p: any) => p.alpha > 0.01,
      );
      for (const _p of particlesRef.current) {
        const p = _p as Particle;
        p.life++;
        p.x +=
          p.vx + Math.sin(p.life * p.wobbleSpeed + p.wobbleOffset) * p.wobble;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rot += p.vr;
        if (p.y > canvas.height * 0.3) p.alpha -= p.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? p.w / 2 : p.w / 4;
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      particlesRef.current = [];
    };
  }, [active]);

  return canvasRef;
}

// ─── Winner card ──────────────────────────────────────────────────────────────
function WinnerCard({
  entry,
  delay,
  isChampion,
}: {
  entry: LeaderboardEntry;
  delay: number;
  isChampion: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [crowned, setCrowned] = useState(false);
  const accuracy =
    entry.total_predictions > 0
      ? Math.round((entry.correct_predictions / entry.total_predictions) * 100)
      : 0;
  const rankColor = isChampion ? "#FFD700" : "#C0C0C0";
  const glowColor = isChampion
    ? "rgba(255,215,0,0.4)"
    : "rgba(192,192,192,0.25)";

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = setTimeout(() => setCrowned(true), delay + 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [delay]);

  return (
    <div
      className="relative"
      style={{
        width: isChampion ? "min(300px, 90vw)" : "min(260px, 85vw)",
        transform: visible
          ? "scale(1) translateY(0)"
          : "scale(0.7) translateY(50px)",
        opacity: visible ? 1 : 0,
        transition: `all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
      }}
    >
      {/* Crown */}
      {isChampion && (
        <div
          style={{
            position: "absolute",
            top: -52,
            left: "50%",
            transform: `translateX(-50%) ${crowned ? "translateY(0) rotate(0deg)" : "translateY(-30px) rotate(-20deg)"}`,
            opacity: crowned ? 1 : 0,
            transition: "all 0.5s cubic-bezier(0.34,1.56,0.64,1)",
            fontSize: 48,
            filter: "drop-shadow(0 0 20px rgba(255,215,0,0.9))",
            zIndex: 10,
          }}
        >
          👑
        </div>
      )}

      <div
        className="relative overflow-hidden"
        style={{
          background: isChampion
            ? "linear-gradient(145deg, #1a1200, #2a1f00)"
            : "linear-gradient(145deg, #0f0f18, #1a1a2a)",
          border: `2px solid ${rankColor}`,
          borderRadius: 24,
          padding: "28px 20px",
          boxShadow: `0 0 48px ${glowColor}, 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        {/* Shimmer bg */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 22,
            pointerEvents: "none",
            background: isChampion
              ? "linear-gradient(135deg, rgba(255,215,0,0.07) 0%, transparent 50%, rgba(255,107,43,0.05) 100%)"
              : "linear-gradient(135deg, rgba(192,192,192,0.05) 0%, transparent 60%)",
          }}
        />

        {/* Rank badge */}
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: isChampion
              ? "linear-gradient(135deg,#FFD700,#FF6B2B)"
              : "linear-gradient(135deg,#C0C0C0,#808080)",
            borderRadius: 10,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 800,
            color: "#000",
            fontFamily: "'Syne', sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          {isChampion ? "🏆 Champion" : "🥈 Runner-up"}
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              overflow: "hidden",
              background: isChampion
                ? "linear-gradient(135deg,#FFD700,#FF6B2B)"
                : "linear-gradient(135deg,#C0C0C0,#606060)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 900,
              color: "#000",
              fontFamily: "'Syne', sans-serif",
              boxShadow: `0 0 0 4px ${isChampion ? "rgba(255,215,0,0.25)" : "rgba(192,192,192,0.15)"}, 0 0 28px ${glowColor}`,
            }}
          >
            {entry.avatar_url ? (
              <Image
                src={entry.avatar_url}
                alt={entry.name}
                width={76}
                height={76}
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials(entry.name)
            )}
          </div>
        </div>

        {/* Name */}
        <div className="text-center mb-4">
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: isChampion ? 21 : 17,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            {entry.name.split(" ")[0]}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'DM Sans', sans-serif",
              marginTop: 2,
            }}
          >
            {entry.name.split(" ").slice(1).join(" ")}
          </div>
        </div>

        {/* Big points */}
        <div className="text-center mb-4">
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 900,
              fontSize: isChampion ? 62 : 50,
              lineHeight: 1,
              color: rankColor,
              letterSpacing: "-0.04em",
              textShadow: `0 0 40px ${glowColor}`,
            }}
          >
            {entry.total_points}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'DM Sans', sans-serif",
              marginTop: 4,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            total points
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
          }}
        >
          {[
            { label: "accuracy", value: `${accuracy}%` },
            { label: "correct", value: entry.correct_predictions },
            { label: "season +", value: `+${entry.season_bonus ?? 0}` },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                padding: "8px 4px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  color: rankColor,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.3)",
                  marginTop: 3,
                  fontFamily: "'DM Sans', sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
export default function SeasonWinnersOverlay({
  onClose,
}: SeasonWinnersOverlayProps) {
  const [winners, setWinners] = useState<LeaderboardEntry[]>([]);
  const [titleVisible, setTitleVisible] = useState(false);
  const canvasRef = useConfetti(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    // Fetch top 2 from leaderboard
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setWinners((d.leaderboard ?? []).slice(0, 2)));
    setTimeout(() => setTitleVisible(true), 200);
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes float-trophy { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-14px) rotate(3deg); } }
        @keyframes title-glow { 0%,100% { text-shadow: 0 0 40px rgba(255,215,0,0.6),0 0 80px rgba(255,107,43,0.3); } 50% { text-shadow: 0 0 70px rgba(255,215,0,0.95),0 0 130px rgba(255,107,43,0.5); } }
        @keyframes shimmer-bar { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto"
        style={{
          background:
            "radial-gradient(ellipse at 50% 25%, #1a0f00 0%, #0A0A0F 65%)",
        }}
      >
        {/* Confetti */}
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 1 }}
        />

        <div
          className="relative w-full max-w-lg px-5 flex flex-col items-center"
          style={{ paddingTop: 56, paddingBottom: 80, zIndex: 2 }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex items-center justify-center rounded-full text-white/50 hover:text-white transition-colors"
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            ✕
          </button>

          {/* Trophy */}
          <div
            style={{
              fontSize: 72,
              marginBottom: 8,
              animation: "float-trophy 3s ease-in-out infinite",
              filter: "drop-shadow(0 0 32px rgba(255,215,0,0.75))",
              opacity: titleVisible ? 1 : 0,
              transition: "opacity 0.5s ease 0.1s",
            }}
          >
            🏆
          </div>

          {/* Title */}
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 900,
              fontSize: 28,
              color: "#FFD700",
              textAlign: "center",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              animation: titleVisible
                ? "title-glow 3s ease-in-out infinite"
                : "none",
              opacity: titleVisible ? 1 : 0,
              transition: "opacity 0.6s ease 0.2s",
              marginBottom: 4,
            }}
          >
            IPL 2026 Season
          </div>

          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 900,
              fontSize: 36,
              color: "#fff",
              textAlign: "center",
              letterSpacing: "-0.04em",
              opacity: titleVisible ? 1 : 0,
              transition: "opacity 0.6s ease 0.35s",
              marginBottom: 8,
            }}
          >
            Final Standings
          </div>

          {/* Shimmer divider */}
          <div
            style={{
              width: 180,
              height: 2,
              background:
                "linear-gradient(90deg, transparent, #FFD700, #FF6B2B, #FFD700, transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer-bar 2s linear infinite",
              borderRadius: 2,
              marginBottom: 44,
              opacity: titleVisible ? 1 : 0,
              transition: "opacity 0.6s ease 0.5s",
            }}
          />

          {/* Cards */}
          {winners.length > 0 && (
            <div className="flex flex-col items-center w-full gap-5">
              <WinnerCard entry={winners[0]} delay={600} isChampion={true} />
              {winners[1] && (
                <WinnerCard
                  entry={winners[1]}
                  delay={1000}
                  isChampion={false}
                />
              )}
            </div>
          )}

          {/* Tagline */}
          <div
            style={{
              marginTop: 40,
              textAlign: "center",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.3)",
              animation: "fade-up 0.6s ease 1.6s both",
            }}
          >
            IPL 2026 · The cricket brain competition is over 🏏
          </div>
        </div>
      </div>
    </>
  );
}
