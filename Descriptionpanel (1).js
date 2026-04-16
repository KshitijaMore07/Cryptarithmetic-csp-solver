import React, { useState } from "react";
import "./Descriptionpanel.css";

// Manual step-by-step solving from leftmost column (like the image shows)
function getManualSteps() {
  return [
    {
      title: "Understanding the Problem",
      icon: "🧩",
      highlight: [],
      desc: "We need to find a digit for each letter so that SEND + MORE = MONEY. Each letter gets a unique digit 0–9, and leading letters (S, M) cannot be zero.",
      detail: null,
    },
    {
      title: "Step 1: M = 1 (From Carry)",
      icon: "💡",
      highlight: [0],
      desc: "Since MONEY has 5 digits while SEND and MORE have 4 digits, there must be a carry from the thousands column. The maximum sum of two 4-digit numbers is 9999+9999=19998, so M must be 1.",
      detail: "deduction",
      deduction: "M = 1 (carry from leftmost column)",
      assignments: { M: 1 }
    },
    {
      title: "Step 2: Column 4 Equation (Leftmost)",
      icon: "4️⃣",
      highlight: [0],
      desc: "Thousands column: S + M + carry₃ = MO (10×M + O). Since M=1, we have: S + 1 + c₃ = 10 + O",
      detail: "equation",
      equation: "S + 1 + c₃ = 10 + O",
      note: "c₃ is carry from hundreds column (0 or 1)",
      assignments: { M: 1 }
    },
    {
      title: "Step 3: Deduce O = 0, S = 9",
      icon: "🎯",
      highlight: [0, 1],
      desc: "From S + 1 + c₃ = 10 + O. Since S ≤ 9, the only possibility is c₃ = 0, O = 0, and S = 9. This gives: 9 + 1 + 0 = 10 + 0 ✓",
      detail: "deduction",
      deduction: "O = 0, S = 9, carry₃ = 0",
      assignments: { M: 1, O: 0, S: 9 }
    },
    {
      title: "Step 4: Column 3 Equation (Hundreds)",
      icon: "3️⃣",
      highlight: [1],
      desc: "Hundreds column: E + O + c₂ = N + 10×c₃. With O=0 and c₃=0: E + c₂ = N",
      detail: "equation",
      equation: "E + c₂ = N",
      note: "c₂ is carry from tens column (0 or 1)",
      assignments: { M: 1, O: 0, S: 9 }
    },
    {
      title: "Step 5: Column 2 Equation (Tens)",
      icon: "2️⃣",
      highlight: [2],
      desc: "Tens column: N + R + c₁ = E + 10×c₂. Substituting N = E + c₂: (E + c₂) + R + c₁ = E + 10c₂ → R + c₁ = 9c₂",
      detail: "equation",
      equation: "R + c₁ = 9c₂",
      assignments: { M: 1, O: 0, S: 9 }
    },
    {
      title: "Step 6: Try c₂ = 1, c₁ = 1",
      icon: "🔢",
      highlight: [2, 3],
      desc: "If c₂ = 1, then R + c₁ = 9. Since c₁ can be 0 or 1, try c₁ = 1 → R = 8. This works! c₂ = 1 means N = E + 1.",
      detail: "trial",
      trial: "c₂ = 1, c₁ = 1, R = 8",
      assignments: { M: 1, O: 0, S: 9, R: 8 }
    },
    {
      title: "Step 7: Column 1 Equation (Units)",
      icon: "1️⃣",
      highlight: [3],
      desc: "Units column: D + E = Y + 10×c₁. With c₁ = 1: D + E = Y + 10",
      detail: "equation",
      equation: "D + E = Y + 10",
      assignments: { M: 1, O: 0, S: 9, R: 8 }
    },
    {
      title: "Step 8: Try E = 5",
      icon: "🔢",
      highlight: [1, 2, 3],
      desc: "From N = E + c₂ and c₂ = 1, we have N = E + 1. Try E = 5 → N = 6 (both unused)",
      detail: "trial",
      trial: "E = 5, N = 6",
      assignments: { M: 1, O: 0, S: 9, R: 8, E: 5, N: 6 }
    },
    {
      title: "Step 9: Deduce D and Y",
      icon: "✅",
      highlight: [3],
      desc: "From D + E = Y + 10: D + 5 = Y + 10 → D = Y + 5. Try Y = 2 → D = 7 (both unused). All digits are unique!",
      detail: "trial",
      trial: "Y = 2, D = 7",
      assignments: { M: 1, O: 0, S: 9, R: 8, E: 5, N: 6, D: 7, Y: 2 }
    },
    {
      title: "Final Solution Verified ✓",
      icon: "✅",
      highlight: [0, 1, 2, 3],
      desc: "All constraints satisfied! SEND (9567) + MORE (1085) = MONEY (10652). Every letter has a unique digit and the arithmetic holds.",
      detail: "solution",
      finalAssignment: { S: 9, E: 5, N: 6, D: 7, M: 1, O: 0, R: 8, Y: 2 }
    }
  ];
}

function Cell({ ch, stepIdx, colHighlight, showDigit, assignment }) {
  const isHighlighted = colHighlight.includes(stepIdx);
  const digit = assignment?.[ch];
  return (
    <div className={`dp-cell ${isHighlighted ? "dp-cell--hi" : ""}`}>
      <span className="dp-cell-letter">{ch}</span>
      {showDigit && digit !== undefined && (
        <span className="dp-cell-num">{digit}</span>
      )}
    </div>
  );
}

function Equation({ colHighlight, showDigit, assignment }) {
  const words = ["SEND", "MORE", "MONEY"];
  const maxLen = Math.max(...words.map(w => w.length));

  function Row({ word, color, isResult }) {
    const padded = word.padStart(maxLen, " ");
    return (
      <div className={`dp-row ${isResult ? "dp-row--result" : ""}`}>
        {padded.split("").map((ch, i) => {
          const colIdx = maxLen - 1 - i;
          return ch === " " ? (
            <div key={i} className="dp-cell dp-cell--empty" />
          ) : (
            <Cell key={i} ch={ch} stepIdx={colIdx} colHighlight={colHighlight} showDigit={showDigit} assignment={assignment} />
          );
        })}
      </div>
    );
  }

  return (
    <div className="dp-equation">
      <Row word="SEND" color="var(--accent)" />
      <div className="dp-operator">+</div>
      <Row word="MORE" color="var(--accent)" />
      <div className="dp-divider" />
      <Row word="MONEY" color="var(--accent2)" isResult />
    </div>
  );
}

function MappingGrid({ assignment }) {
  return (
    <div className="dp-mapping">
      {Object.entries(assignment).map(([k, v]) => (
        <div key={k} className="dp-map-item">
          <span className="dp-map-letter">{k}</span>
          <span className="dp-map-arrow">→</span>
          <span className="dp-map-digit">{v}</span>
        </div>
      ))}
    </div>
  );
}

function DeductionBox({ deduction }) {
  return (
    <div className="dp-solution" style={{ marginTop: "12px" }}>
      <div className="dp-sol-row">
        <span className="dp-sol-label">✓ Deduced:</span>
        <span className="dp-sol-num" style={{ color: "var(--accent2)" }}>{deduction}</span>
      </div>
    </div>
  );
}

function EquationBox({ equation, note }) {
  return (
    <div className="dp-solution" style={{ marginTop: "12px" }}>
      <div className="dp-sol-row">
        <span className="dp-sol-label">Equation:</span>
        <span className="dp-sol-num" style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem" }}>{equation}</span>
      </div>
      {note && (
        <div className="dp-sol-row">
          <span className="dp-sol-label">Note:</span>
          <span className="dp-sol-eq" style={{ color: "var(--text-dim)" }}>{note}</span>
        </div>
      )}
    </div>
  );
}

function TrialBox({ trial }) {
  return (
    <div className="dp-solution" style={{ marginTop: "12px" }}>
      <div className="dp-sol-row">
        <span className="dp-sol-label">✓ Try:</span>
        <span className="dp-sol-num" style={{ color: "var(--accent)" }}>{trial}</span>
      </div>
    </div>
  );
}

function SolutionBox(assignment) {
  const send = `${assignment.S}${assignment.E}${assignment.N}${assignment.D}`;
  const more = `${assignment.M}${assignment.O}${assignment.R}${assignment.E}`;
  const money = `${assignment.M}${assignment.O}${assignment.N}${assignment.E}${assignment.Y}`;
  
  return (
    <div className="dp-solution">
      <div className="dp-sol-row">
        <span className="dp-sol-label">SEND</span>
        <span className="dp-sol-eq">=</span>
        <span className="dp-sol-num">{send}</span>
      </div>
      <div className="dp-sol-row">
        <span className="dp-sol-label">MORE</span>
        <span className="dp-sol-eq">+</span>
        <span className="dp-sol-num">{more}</span>
      </div>
      <div className="dp-sol-divider" />
      <div className="dp-sol-row dp-sol-row--result">
        <span className="dp-sol-label">MONEY</span>
        <span className="dp-sol-eq">=</span>
        <span className="dp-sol-num dp-sol-num--big">{money}</span>
      </div>
      <div className="dp-sol-check">✓ Verified Correct</div>
    </div>
  );
}

export default function Descriptionpanel({ onNext, onBack }) {
  const [step, setStep] = useState(0);
  const steps = getManualSteps();
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const colHighlight = current.highlight || [];
  const showDigit = step >= 2;
  
  // Build current assignment
  const currentAssignment = {};
  for (let i = 0; i <= step; i++) {
    const s = steps[i];
    if (s.assignments) Object.assign(currentAssignment, s.assignments);
    if (s.finalAssignment) Object.assign(currentAssignment, s.finalAssignment);
  }

  return (
    <div className="dp-page">
      <div className="noise" />
      <div className="grid-bg" />

      <div className="dp-topbar">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <div className="dp-topbar-title">Manual Solving: Leftmost Column First</div>
        <button className="btn-primary" onClick={onNext}>Try Solver →</button>
      </div>

      <div className="dp-progress-wrap">
        {steps.map((s, i) => (
          <button
            key={i}
            className={`dp-progress-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
            onClick={() => setStep(i)}
            title={s.title}
          >
            <span className="dp-prog-num">{i + 1}</span>
          </button>
        ))}
        <div className="dp-progress-line">
          <div className="dp-progress-fill" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
        </div>
      </div>

      <div className="dp-content">
        <div className="dp-info-panel">
          <div className="dp-step-badge">Step {step + 1} of {steps.length}</div>
          <div className="dp-step-icon">{current.icon}</div>
          <h2 className="dp-step-title">{current.title}</h2>
          <p className="dp-step-desc">{current.desc}</p>

          {current.detail === "deduction" && <DeductionBox deduction={current.deduction} />}
          {current.detail === "equation" && <EquationBox equation={current.equation} note={current.note} />}
          {current.detail === "trial" && <TrialBox trial={current.trial} />}
          {current.detail === "solution" && <SolutionBox {...current.finalAssignment} />}
          
          {current.assignments && Object.keys(current.assignments).length > 0 && current.detail !== "solution" && (
            <div style={{ marginTop: "12px" }}>
              <div className="dp-step-badge" style={{ color: "var(--accent)" }}>Current Assignments</div>
              <MappingGrid assignment={current.assignments} />
            </div>
          )}

          <div className="dp-nav-btns">
            <button
              className="btn-ghost"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              ← Prev
            </button>
            {isLast ? (
              <button className="btn-primary" onClick={onNext}>
                Try the Solver →
              </button>
            ) : (
              <button className="btn-orange" onClick={() => setStep(s => s + 1)}>
                Next Step →
              </button>
            )}
          </div>
        </div>

        <div className="dp-visual-panel">
          <div className="dp-visual-label">
            {showDigit ? "Digits assigned" : "Letters only"}
          </div>
          <Equation colHighlight={colHighlight} showDigit={showDigit} assignment={currentAssignment} />

          <div className="dp-col-guide">
            {["Col 4 (S,M)", "Col 3 (E,O)", "Col 2 (N,R)", "Col 1 (D,E)"].map((lbl, i) => (
              <div
                key={i}
                className={`dp-col-tag ${colHighlight.includes(3 - i) ? "dp-col-tag--hi" : ""}`}
              >
                {lbl}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}