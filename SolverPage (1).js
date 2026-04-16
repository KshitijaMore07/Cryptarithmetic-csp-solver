import React, { useState, useRef, useEffect } from "react";
import "./SolverPage.css";

const API = "http://localhost:5000/api/solve";

function padWords(words) {
  const maxLen = Math.max(...words.map(w => w.length));
  return words.map(w => w.padStart(maxLen, " "));
}

function validateInput(eq) {
  const clean = eq.toUpperCase().replace(/\s/g, "");
  if (!clean.includes("=") || !clean.includes("+")) return "Must contain '+' and '='";
  const [lhs, rhs] = clean.split("=");
  if (!lhs || !rhs) return "Invalid format";
  const letters = [...new Set(clean.replace(/[^A-Z]/g, "").split(""))];
  if (letters.length > 10) return "Too many unique letters (max 10)";
  if (letters.length < 2) return "Need at least 2 unique letters";
  return "";
}

/* ── Equation Display ── */
function EquationDisplay({ addends, result, assignment, activeCol, activeLetter, carries, stepType }) {
  const allWords = [...addends, result];
  const padded   = padWords(allWords);
  const maxLen   = padded[0].length;
  const isFailed = stepType === "constraint_fail" || stepType === "backtrack";

  // carries comes as { "0": 1, "1": 0, ... } from Python (string keys)
  // display_idx is left-to-right position in padded word
  // activeCol is a display_idx (left-to-right)

  return (
    <div className="sp-equation-wrap">
      {/* Carry row — indexed by display position left-to-right */}
      <div className="sp-carry-strip">
        <span className="sp-carry-strip-label">carry→</span>
        <div className="sp-carry-cells">
          {Array.from({ length: maxLen }).map((_, ci) => {
            // Find which rtl_idx corresponds to display_idx ci
            const carryVal = carries?.[String(ci)] ?? null;
            return (
              <div key={ci}
                className={`sp-carry-cell
                  ${carryVal > 0 ? "sp-carry-cell--active" : ""}
                  ${ci === activeCol && carryVal !== null ? "sp-carry-cell--current" : ""}
                `}>
                {carryVal !== null ? (carryVal > 0 ? carryVal : "·") : ""}
              </div>
            );
          })}
        </div>
      </div>

      {allWords.map((word, wi) => {
        const pw       = padded[wi];
        const isResult = wi === allWords.length - 1;
        return (
          <React.Fragment key={wi}>
            {isResult && <div className="sp-eq-divider" />}
            <div className="sp-eq-word-row">
              <div className="sp-eq-op-slot">
                {wi > 0 && !isResult && <span className="sp-eq-op">+</span>}
              </div>
              <div className={`sp-eq-row ${isResult ? "sp-eq-row--result" : ""}`}>
                {pw.split("").map((ch, ci) => {
                  const empty    = ch === " ";
                  const isColHi  = ci === activeCol && !empty;
                  const isActL   = ch === activeLetter;
                  const val      = !empty && assignment[ch] !== undefined ? assignment[ch] : null;
                  return (
                    <div key={ci} className={`sp-eq-cell
                      ${empty   ? "sp-eq-cell--empty"  : ""}
                      ${isColHi ? "sp-eq-cell--col-hi" : ""}
                      ${isActL && !isFailed ? "sp-eq-cell--active" : ""}
                      ${isActL &&  isFailed ? "sp-eq-cell--fail"   : ""}
                      ${val !== null && !isActL ? "sp-eq-cell--assigned" : ""}
                    `}>
                      {!empty && <>
                        <span className="sp-eq-letter">{ch}</span>
                        {val !== null && <span className="sp-eq-digit">{val}</span>}
                      </>}
                    </div>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Column Cards ── */
function ColumnCards({ cols, assignment, carries, activeCol }) {
  // cols are sorted by display_idx (left-to-right)
  // but carry check is rtl_idx order — map via rtl_idx
  return (
    <div className="sp-col-status">
      <div className="sp-col-status-title">Column Equations (right → left carry)</div>
      <div className="sp-col-grid">
        {[...cols].sort((a, b) => b.display_idx - a.display_idx).map((col, i) => {
          const ci        = col.rtl_idx;
          const carryInKey = String(ci - 1);
          const carryIn   = ci === 0 ? 0 : (carries?.[carryInKey] ?? null);
          const carryOut  = carries?.[String(ci)] ?? null;
          const allAssigned =
            carryIn !== null &&
            col.addend_letters.every(l => assignment[l] !== undefined) &&
            (!col.result_letter || assignment[col.result_letter] !== undefined);
          const sum           = allAssigned ? col.addend_letters.reduce((acc, l) => acc + assignment[l], carryIn) : null;
          const expectedDigit = sum !== null ? sum % 10 : null;
          const resultDigit   = col.result_letter ? assignment[col.result_letter] : null;
          const isOk          = allAssigned && (!col.result_letter || expectedDigit === resultDigit);
          const isActive      = col.display_idx === activeCol;

          return (
            <div key={ci} className={`sp-col-card
              ${isActive             ? "sp-col-card--active" : ""}
              ${allAssigned && isOk  ? "sp-col-card--ok"     : ""}
              ${allAssigned && !isOk ? "sp-col-card--fail"   : ""}
            `}>
              <div className="sp-col-card-header">
                Col {i + 1} {isActive && <span className="sp-col-arrow">◀</span>}
              </div>
              <div className="sp-col-eq-str">
                {col.addend_letters.join("+")}
                {ci > 0 ? "+c" : ""}
                {" → "}{col.result_letter ?? "carry"}
              </div>
              <div className="sp-col-letters">
                {col.addend_letters.map(l => (
                  <span key={l} className="sp-col-letter-tag">
                    {l}{assignment[l] !== undefined ? `=${assignment[l]}` : "=?"}
                  </span>
                ))}
              </div>
              {sum !== null ? (
                <div className="sp-col-arithmetic">
                  <div className="sp-col-sum-line">
                    {carryIn > 0 && <span className="sp-carry-in-badge">{carryIn}+</span>}
                    {col.addend_letters.map(l => assignment[l]).join("+")} = {sum}
                  </div>
                  <div className="sp-col-carry-out-row">
                    digit <strong>{expectedDigit}</strong>, carry <strong>{Math.floor(sum / 10)}</strong>
                  </div>
                  {col.result_letter && (
                    <div className={`sp-col-verdict ${isOk ? "sp-col-verdict--ok" : "sp-col-verdict--fail"}`}>
                      {col.result_letter}={resultDigit ?? "?"} {isOk ? "✓" : "✗"}
                    </div>
                  )}
                </div>
              ) : (
                <div className="sp-col-pending">…</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step Detail ── */
function StepDetail({ step }) {
  if (!step) return null;
  return (
    <div className={`sp-detail-card sp-detail-card--${step.type}`}>
      <div className="sp-detail-phase">{step.phase === "setup" ? "Setup Phase" : "Solve Phase"}</div>
      <div className="sp-detail-msg">{step.message}</div>
      {step.detail && <div className="sp-detail-sub">{step.detail}</div>}
    </div>
  );
}

/* ── Assignment Table ── */
function AssignmentTable({ letters, assignment, activeLetter, stepType, overflowLetter }) {
  return (
    <div className="sp-assign-table">
      <div className="sp-assign-title">Letter → Digit Assignment</div>
      <div className="sp-assign-grid">
        {letters.map(l => {
          const isActive = l === activeLetter;
          const isFail   = isActive && (stepType === "backtrack" || stepType === "constraint_fail");
          const isForced = l === overflowLetter;
          return (
            <div key={l} className={`sp-assign-cell
              ${assignment[l] !== undefined   ? "sp-assign-cell--set"    : ""}
              ${isActive && !isFail           ? "sp-assign-cell--active" : ""}
              ${isFail                        ? "sp-assign-cell--fail"   : ""}
              ${isForced && !isActive         ? "sp-assign-cell--forced" : ""}
            `}>
              <span className="sp-assign-letter">{l}</span>
              <span className="sp-assign-digit">{assignment[l] !== undefined ? assignment[l] : "?"}</span>
              {isForced && assignment[l] !== undefined && <span className="sp-assign-forced-badge">⊕</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Column Equations Sidebar ── */
function ColEqsSidebar({ colEqs, activeCol }) {
  if (!colEqs || colEqs.length === 0) return null;
  return (
    <div className="sp-coleqs">
      <div className="sp-coleqs-title">Derived Column Equations</div>
      {colEqs.map((eq, i) => (
        <div key={i} className="sp-coleq-row">
          <span className="sp-coleq-text">{eq}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Execution Log ── */
function StepLog({ steps, current }) {
  const activeRef = useRef(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [current]);

  const visible = steps.slice(0, current + 1);
  const icon = t =>
    t === "deduce" || t === "domain" || t === "equations" ? "⊕"
    : t === "assign" || t === "col_verify" ? "→"
    : t === "backtrack" ? "↩"
    : t === "constraint_fail" ? "✗"
    : t === "success" ? "✓" : "·";

  return (
    <div className="sp-log">
      <div className="sp-log-title">Execution Log ({visible.length} steps)</div>
      {visible.map((s, i) => (
        <div key={i}
          ref={i === visible.length - 1 ? activeRef : null}
          className={`sp-log-entry sp-log-entry--${s.type} ${i === visible.length - 1 ? "sp-log-entry--active" : ""}`}
        >
          <span className="sp-log-icon">{icon(s.type)}</span>
          <span className="sp-log-step-num">{i + 1}.</span>
          <span>{s.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const EXAMPLES = [
  "SEND + MORE = MONEY",
  "BASE + BALL = GAMES",
  "TWO + TWO = FOUR",
  "FUN + FUN = PLAY",
];

export default function SolverPage({ onBack }) {
  const [input,       setInput]       = useState("SEND + MORE = MONEY");
  const [error,       setError]       = useState("");
  const [result,      setResult]      = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const intervalRef = useRef(null);

  const stopPlay = () => { clearInterval(intervalRef.current); setIsPlaying(false); };

  const startPlay = (res, from = 0) => {
    stopPlay();
    setIsPlaying(true);
    let i = from;
    intervalRef.current = setInterval(() => {
      i++;
      if (i >= res.steps.length) { clearInterval(intervalRef.current); setIsPlaying(false); return; }
      setCurrentStep(i);
    }, 700);
  };

  const handleSolve = async () => {
    const err = validateInput(input);
    if (err) { setError(err); return; }
    setError("");
    stopPlay();
    setLoading(true);
    setResult(null);

    try {
      const resp = await fetch(API, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ equation: input }),
      });
      const data = await resp.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setResult(data);
      setCurrentStep(0);
      startPlay(data, 0);
    } catch (e) {
      setError("Cannot connect to Python backend. Make sure Flask is running on port 5000.");
    }
    setLoading(false);
  };

  useEffect(() => () => stopPlay(), []);

  const step       = result?.steps[currentStep];
  const totalSteps = result?.steps.length || 0;
  const progress   = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const allLetters = result
    ? [...new Set([...result.addends, result.result].join("").split(""))]
    : [];

  // Convert carries object (string keys) to array indexed by display_idx
  // The Python backend sends carries keyed by rtl_idx (0=rightmost col)
  // We need to remap to display_idx for the carry strip
  const carryByDisplay = {};
  if (step?.carries && result?.cols) {
    result.cols.forEach(col => {
      const rtlKey = String(col.rtl_idx);
      if (step.carries[rtlKey] !== undefined) {
        carryByDisplay[col.display_idx] = step.carries[rtlKey];
      }
    });
  }

  return (
    <div className="sp-page">
      <div className="noise" />
      <div className="grid-bg" />

      <div className="sp-topbar">
        <button className="btn-ghost" onClick={onBack}>← Back to Walkthrough</button>
        <div className="sp-topbar-title">CSP Solver</div>
        <div className="sp-topbar-badge">Flask API + React UI</div>
      </div>

      <div className="sp-main">

        {/* Input */}
        <div className="sp-input-panel">
          <div className="sp-panel-label">Your Puzzle</div>
          <div className="sp-input-row">
            <input
              className={`sp-input ${error ? "sp-input--error" : ""}`}
              value={input}
              onChange={e => { setInput(e.target.value.toUpperCase()); setResult(null); stopPlay(); setError(""); }}
              placeholder="e.g. SEND + MORE = MONEY"
              spellCheck={false}
              onKeyDown={e => e.key === "Enter" && handleSolve()}
            />
            <button className="btn-primary sp-solve-btn" onClick={handleSolve} disabled={loading}>
              {loading ? "⏳ Solving..." : "⚙ Solve"}
            </button>
          </div>
          {error && <div className="sp-error">{error}</div>}
          <div className="sp-examples">
            <span className="sp-examples-label">Examples:</span>
            {EXAMPLES.map(ex => (
              <button key={ex} className="sp-example-btn"
                onClick={() => { setInput(ex); setResult(null); stopPlay(); setError(""); }}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        {result && (
          <div className="sp-result-area">

            {result.solution && (
              <div className="sp-solution-banner">
                <span className="sp-banner-icon">✓</span>
                <div>
                  <div className="sp-banner-title">Solution Found in {totalSteps} steps!</div>
                  <div className="sp-banner-sub">
                    {result.addends.map((w, i) => (
                      <span key={i}>{i > 0 ? " + " : ""}
                        {parseInt(w.split("").map(c => result.solution[c]).join(""))}
                      </span>
                    ))}
                    {" = "}
                    <strong>
                      {parseInt(result.result.split("").map(c => result.solution[c]).join(""))}
                    </strong>
                    <span className="sp-banner-mapping">
                      {Object.entries(result.solution).map(([l, v]) => `${l}=${v}`).join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {!result.solution && (
              <div className="sp-no-solution">No solution exists for this puzzle.</div>
            )}

            {/* Controls */}
            <div className="sp-step-controls">
              <button className="btn-ghost" onClick={() => { stopPlay(); setCurrentStep(0); }}>⏮</button>
              <button className="btn-ghost" onClick={() => { stopPlay(); setCurrentStep(s => Math.max(0, s - 1)); }} disabled={currentStep === 0}>◀</button>
              <button className="sp-play-btn" onClick={() => isPlaying ? stopPlay() : startPlay(result, currentStep)}>
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <button className="btn-ghost" onClick={() => { stopPlay(); setCurrentStep(s => Math.min(totalSteps - 1, s + 1)); }} disabled={currentStep === totalSteps - 1}>▶</button>
              <button className="btn-ghost" onClick={() => { stopPlay(); setCurrentStep(totalSteps - 1); }}>⏭</button>
              <div className="sp-step-progress-wrap">
                <div className="sp-step-progress-bar">
                  <div className="sp-step-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="sp-step-label">Step {currentStep + 1} / {totalSteps}</span>
              </div>
            </div>

            <StepDetail step={step} />

            {/* Visuals */}
            <div className="sp-visual-grid">
              <div className="sp-panel">
                <div className="sp-panel-label">Equation with Carry</div>
                <EquationDisplay
                  addends={result.addends}
                  result={result.result}
                  assignment={step?.assignment || {}}
                  activeCol={step?.active_col ?? null}
                  activeLetter={step?.active_letter ?? null}
                  carries={carryByDisplay}
                  stepType={step?.type}
                />
                <ColumnCards
                  cols={result.cols}
                  assignment={step?.assignment || {}}
                  carries={step?.carries || {}}
                  activeCol={step?.active_col ?? null}
                />
              </div>

              <div className="sp-panel">
                <ColEqsSidebar colEqs={result.col_eqs} activeCol={step?.active_col ?? null} />
                <AssignmentTable
                  letters={allLetters}
                  assignment={step?.assignment || {}}
                  activeLetter={step?.active_letter ?? null}
                  stepType={step?.type}
                  overflowLetter={result.overflow_letter}
                />
                <StepLog steps={result.steps} current={currentStep} />
              </div>
            </div>

          </div>
        )}

        {!result && !loading && (
          <div className="sp-placeholder">
            <div className="sp-placeholder-icon">🔍</div>
            <div className="sp-placeholder-text">
              Enter a puzzle and click <strong>Solve</strong>.<br />
            </div>
          </div>
        )}

        {loading && (
          <div className="sp-placeholder">
            <div className="sp-placeholder-icon sp-loading-spin">⚙</div>
            <div className="sp-placeholder-text">Python solver running...</div>
          </div>
        )}

      </div>
    </div>
  );
}
