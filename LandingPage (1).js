import React, { useEffect, useRef, useState } from "react";
import "./LandingPage.css";

/* ── tiny animated equation tiles ── */
function FloatingTile({ char, style }) {
  return (
    <div className="float-tile" style={style}>
      {char}
    </div>
  );
}

/* ── step card in the "How it works" section ── */
function AlgoStep({ num, title, desc, delay }) {
  return (
    <div className="algo-step" style={{ animationDelay: delay }}>
      <div className="algo-num">{num}</div>
      <div>
        <div className="algo-title">{title}</div>
        <div className="algo-desc">{desc}</div>
      </div>
    </div>
  );
}

/* ── animated SEND + MORE = MONEY preview ── */
function EquationPreview() {
  const mapping = { S:9, E:5, N:6, D:7, M:1, O:0, R:8, Y:2 };
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1800);
    return () => clearTimeout(t);
  }, []);

  function Row({ word, color }) {
    return (
      <div className="eq-row">
        {word.split("").map((ch, i) => (
          <div
            key={i}
            className={`eq-cell ${revealed ? "revealed" : ""}`}
            style={{ animationDelay: `${i * 0.08}s`, "--cell-color": color }}
          >
            <span className="eq-letter">{ch}</span>
            {revealed && (
              <span className="eq-digit">{mapping[ch] ?? ch}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="eq-preview">
      <Row word="SEND" color="var(--accent)" />
      <div className="eq-plus">+</div>
      <Row word="MORE" color="var(--accent)" />
      <div className="eq-line" />
      <Row word="MONEY" color="var(--accent2)" />
      {revealed && (
        <div className="eq-check">✓ 9567 + 1085 = 10652</div>
      )}
    </div>
  );
}

export default function LandingPage({ onStart }) {
  const floaters = [
    { char: "S", top: "12%", left: "5%",  delay: "0s",    dur: "6s"  },
    { char: "E", top: "70%", left: "8%",  delay: "1s",    dur: "7s"  },
    { char: "N", top: "20%", right: "6%", delay: "0.5s",  dur: "5s"  },
    { char: "D", top: "55%", right: "9%", delay: "1.5s",  dur: "8s"  },
    { char: "M", top: "80%", left: "15%", delay: "2s",    dur: "6.5s"},
    { char: "O", top: "10%", left: "40%", delay: "0.8s",  dur: "7.5s"},
    { char: "R", top: "85%", right: "20%",delay: "1.2s",  dur: "6s"  },
    { char: "Y", top: "40%", left: "2%",  delay: "0.3s",  dur: "9s"  },
  ];

  return (
    <div className="landing">
      <div className="noise" />

      {/* background grid */}
      <div className="grid-bg" />

      {/* floating letters */}
      {floaters.map((f, i) => (
        <FloatingTile
          key={i}
          char={f.char}
          style={{
            top: f.top,
            left: f.left,
            right: f.right,
            animationDelay: f.delay,
            animationDuration: f.dur,
          }}
        />
      ))}

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-badge">Constraint Satisfaction Problem</div>

        <h1 className="hero-title">
          CRYPTO
          <br />
          <span className="hero-title-accent">ARITHMETIC</span>
        </h1>

        <p className="hero-sub">
          Where <em>letters become digits</em> through the power of logical
          constraint propagation and systematic search.
        </p>

        <div className="hero-eq">
          <span>SEND</span>
          <span className="op">+</span>
          <span>MORE</span>
          <span className="op">=</span>
          <span className="result">MONEY</span>
        </div>

        <button className="try-btn" onClick={onStart}>
          <span className="try-btn-text">Try It Now</span>
          <span className="try-btn-arrow">→</span>
        </button>

        <p className="hero-hint">Step-by-step walkthrough · Interactive solver</p>
      </section>

      {/* ── EQUATION PREVIEW ── */}
      <section className="section">
        <div className="section-label">Live Preview</div>
        <h2 className="section-title">Watch it solve</h2>
        <p className="section-sub">
          Each letter maps to a unique digit 0–9. The preview auto-reveals the
          solution after a moment.
        </p>
        <div className="eq-preview-wrap">
          <EquationPreview />
        </div>
      </section>

      {/* ── WHAT IS CSP ── */}
      <section className="section alt-section">
        <div className="two-col">
          <div>
            <div className="section-label">Background</div>
            <h2 className="section-title">What is a CSP?</h2>
            <p className="section-sub">
              A <strong>Constraint Satisfaction Problem</strong> is defined by a set
              of variables, each with a domain of possible values, and a set of
              constraints that restrict which combinations of values are valid.
            </p>
            <ul className="csp-list">
              <li><span className="bullet" />Variables: Letters (S, E, N, D, M, O, R, Y)</li>
              <li><span className="bullet" />Domain: Digits 0–9 for each letter</li>
              <li><span className="bullet" />Constraints: No two letters share a digit</li>
              <li><span className="bullet" />Goal constraint: SEND + MORE = MONEY</li>
              <li><span className="bullet" />Leading letters S and M ≠ 0</li>
            </ul>
          </div>
          <div className="info-card">
            <div className="info-card-title">Key Facts</div>
            {[
              ["8", "Unique Variables"],
              ["10!", "Possible Permutations"],
              ["1", "Valid Solution"],
              ["O(n!)", "Naive Complexity"],
            ].map(([val, label]) => (
              <div key={label} className="stat-row">
                <span className="stat-val">{val}</span>
                <span className="stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW THE ALGO WORKS ── */}
      <section className="section">
        <div className="section-label">Algorithm</div>
        <h2 className="section-title">How it works</h2>
        <div className="algo-steps">
          <AlgoStep num="01" title="Variable Selection"
            desc="Pick the next unassigned letter using the Most Constrained Variable heuristic."
            delay="0s" />
          <AlgoStep num="02" title="Domain Ordering"
            desc="Order digit candidates using Least Constraining Value to reduce backtracking."
            delay="0.1s" />
          <AlgoStep num="03" title="Forward Checking"
            desc="After each assignment, prune domains of neighbours that would violate constraints."
            delay="0.2s" />
          <AlgoStep num="04" title="Constraint Propagation"
            desc="Apply arc-consistency to eliminate infeasible values early before assigning."
            delay="0.3s" />
          <AlgoStep num="05" title="Backtracking"
            desc="If no value works, undo the last assignment and try the next candidate."
            delay="0.4s" />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section cta-section">
        <h2 className="cta-title">Ready to explore?</h2>
        <p className="cta-sub">
          Walk through the manual example step-by-step, then try your own puzzle.
        </p>
        <button className="try-btn" onClick={onStart}>
          <span className="try-btn-text">Start the Walkthrough</span>
          <span className="try-btn-arrow">→</span>
        </button>
      </section>

      {/* footer */}
      <footer className="footer">
        <span>Crypto-Arithmetic CSP Visualizer</span>
        <span className="footer-dot">·</span>
        <span>SEND + MORE = MONEY</span>
      </footer>
    </div>
  );
}
