import { motion } from "motion/react";
import {
  Trophy,
  Lock,
  Check,
  Footprints,
  Tags,
  Target,
  FileSearch,
  CalendarDays,
  Leaf,
} from "lucide-react";
import type { Progress } from "../types";
const icons = [Footprints, Tags, Target, FileSearch, CalendarDays, Leaf];
export function Achievements({ progress: p }: { progress: Progress }) {
  return (
    <>
      <div className="intro">
        <div>
          <span className="eyebrow">PROGRESS, AT YOUR OWN PACE</span>
          <h1>Good habits deserve recognition.</h1>
          <p>
            Celebrate understanding your money. There’s no reward for spending
            more.
          </p>
        </div>
      </div>
      <section className="card xp-banner">
        <span className="trophy">
          <Trophy size={35} />
        </span>
        <div>
          <span className="eyebrow">LEVEL {p.level} · FINANCIAL EXPLORER</span>
          <h2>
            {p.xp} <span className="muted">total XP</span>
          </h2>
          <div className="progress-track">
            <div style={{ width: `${(p.xp % 200) / 2}%` }} />
          </div>
          <small>
            {p.next_level_xp} XP to level {p.level + 1} ·{" "}
            {p.achievements.filter((a) => a.unlocked).length} of 6 achievements
            earned
          </small>
        </div>
      </section>
      <div className="achievement-grid">
        {p.achievements.map((a, i) => {
          const Icon = icons[i];
          return (
            <motion.section
              key={a.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`card achievement ${a.unlocked ? "unlocked" : ""}`}
            >
              <div className="section-head">
                <span className="achievement-icon">
                  <Icon size={25} />
                </span>
                <span className={`tag ${a.unlocked ? "positive" : ""}`}>
                  {a.unlocked ? <Check size={12} /> : <Lock size={12} />}{" "}
                  {a.unlocked ? "Unlocked" : "Locked"}
                </span>
              </div>
              <h2>{a.title}</h2>
              <p>{a.description}</p>
              <div className="card-foot">
                <strong>+{a.xp} XP</strong>
                <span>
                  {a.earned_at
                    ? new Date(a.earned_at).toLocaleDateString()
                    : "Take your time"}
                </span>
              </div>
            </motion.section>
          );
        })}
      </div>
    </>
  );
}
