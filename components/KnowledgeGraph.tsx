"use client";
import { motion } from "motion/react";

export interface GraphLesson {
  id: string;
  title: string;
  failureClass: string;
  agent: string;
  protects: string[];
}

const CLASS_COLOR: Record<string, string> = {
  "wrong-policy-in-prompt": "#ffd166",
  "date-format-misparse": "#5b8cff",
  misrouting: "#5b8cff",
  "prompt-injection": "#ff5a52",
  "retry-storm": "#3ddc84",
};
const color = (c: string) => CLASS_COLOR[c] ?? "#9aa7b9";

export default function KnowledgeGraph({
  lessons,
  matchId,
  highlightAgent,
  selectedId,
  onSelect,
  generation,
}: {
  lessons: GraphLesson[];
  matchId?: string | null;
  highlightAgent?: string | null;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  generation: number; // bump to replay the populate animation
}) {
  const W = 760;
  const H = 460;
  const cx = W / 2;
  const cy = H / 2;
  const n = lessons.length;

  const layout = lessons.map((l, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(a) * 150;
    const ly = cy + Math.sin(a) * 150;
    const agents = l.protects.map((ag, j) => {
      const spread = (j - (l.protects.length - 1) / 2) * 0.28;
      const aa = a + spread;
      return { ag, x: cx + Math.cos(aa) * 232, y: cy + Math.sin(aa) * 232 };
    });
    return { l, lx, ly, agents };
  });

  return (
    <svg key={generation} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Fleet knowledge graph">
      {/* hub → lesson edges */}
      {layout.map(({ l, lx, ly }, i) => (
        <motion.line
          key={"e" + l.id}
          x1={cx}
          y1={cy}
          x2={lx}
          y2={ly}
          stroke={l.id === matchId ? color(l.failureClass) : "#1b2433"}
          strokeWidth={l.id === matchId ? 2 : 1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
        />
      ))}

      {/* lesson → protected-agent edges */}
      {layout.flatMap(({ l, lx, ly, agents }) =>
        agents.map((ag, j) => {
          const lit = l.id === matchId && ag.ag === highlightAgent;
          return (
            <motion.line
              key={"ea" + l.id + j}
              x1={lx}
              y1={ly}
              x2={ag.x}
              y2={ag.y}
              stroke={lit ? "#3ddc84" : "#141b27"}
              strokeWidth={lit ? 1.6 : 1}
              strokeDasharray={lit ? "0" : "3 4"}
              initial={{ opacity: 0 }}
              animate={{ opacity: lit ? 1 : 0.55 }}
              transition={{ delay: 0.45 + j * 0.04, duration: 0.4 }}
            />
          );
        }),
      )}

      {/* protected-agent nodes (labelled only when highlighted) */}
      {layout.flatMap(({ l, agents }) =>
        agents.map((ag, j) => {
          const lit = l.id === matchId && ag.ag === highlightAgent;
          return (
            <motion.g
              key={"a" + l.id + j}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + j * 0.04, type: "spring", stiffness: 200, damping: 18 }}
              style={{ transformOrigin: `${ag.x}px ${ag.y}px` }}
            >
              <circle cx={ag.x} cy={ag.y} r={lit ? 6 : 4} fill={lit ? "#3ddc84" : "#54657f"} />
              {lit && (
                <text x={ag.x} y={ag.y - 9} textAnchor="middle" style={{ fontSize: 9, fontFamily: "var(--font-mono)", fill: "#3ddc84" }}>
                  {ag.ag}
                </text>
              )}
            </motion.g>
          );
        }),
      )}

      {/* hub */}
      <circle cx={cx} cy={cy} r={26} fill="#0b0f17" stroke="#5b8cff" strokeWidth={1.5} />
      <text x={cx} y={cy - 1} textAnchor="middle" style={{ fontSize: 9, fontFamily: "var(--font-mono)", fill: "#e6edf6" }}>fleet</text>
      <text x={cx} y={cy + 9} textAnchor="middle" style={{ fontSize: 9, fontFamily: "var(--font-mono)", fill: "#e6edf6" }}>memory</text>

      {/* lesson nodes */}
      {layout.map(({ l, lx, ly }, i) => {
        const isMatch = l.id === matchId;
        const isSel = l.id === selectedId;
        const below = ly > cy;
        return (
          <motion.g
            key={l.id}
            initial={{ opacity: 0, scale: 0.35 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 200, damping: 17 }}
            style={{ transformOrigin: `${lx}px ${ly}px`, cursor: "pointer" }}
            onClick={() => onSelect(l.id)}
          >
            {isMatch && (
              <motion.circle cx={lx} cy={ly} r={20} fill={color(l.failureClass)} animate={{ opacity: [0.1, 0.28, 0.1] }} transition={{ repeat: Infinity, duration: 2 }} />
            )}
            <circle cx={lx} cy={ly} r={isSel ? 13 : 11} fill={color(l.failureClass)} opacity={0.92} stroke={isSel ? "#e6edf6" : "transparent"} strokeWidth={1.5} />
            <text x={lx} y={ly + 3} textAnchor="middle" style={{ fontSize: 8.5, fontFamily: "var(--font-mono)", fontWeight: 600, fill: "#05070d" }}>
              {l.id.replace("WL-", "")}
            </text>
            <text x={lx} y={below ? ly + 26 : ly - 19} textAnchor="middle" style={{ fontSize: 9, fontFamily: "var(--font-mono)", fill: "#9aa7b9" }}>
              {l.agent}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}
