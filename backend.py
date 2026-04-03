from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ═══════════════════════════════════════════════════════════════
#  CRYPTO-ARITHMETIC CSP SOLVER
#
#  Logic (exactly as specified):
#  1. If output has more letters than inputs → first output letter = 1
#     (because the only possible carry-out from leftmost column is 1)
#  2. Work RIGHT TO LEFT column by column
#  3. For each column:
#       sum = sum of all addend digits in that column + carry_in
#       if sum >= 10  → carry_out = 1,  result_digit = sum - 10
#       if sum < 10   → carry_out = 0,  result_digit = sum
#       result_letter must equal result_digit
#  4. Constraints:
#       - Every letter maps to a unique digit (0–9)
#       - Same letter → same digit everywhere
#       - Leading letters (first of each word) cannot be 0
#       - Column sums must match result digits with correct carry
# ═══════════════════════════════════════════════════════════════

def pad_words(words):
    """Right-justify all words to same length."""
    max_len = max(len(w) for w in words)
    return [w.rjust(max_len) for w in words]


def build_columns_rtl(addends, result):
    """
    Build column descriptors RIGHT TO LEFT.
    cols[0] = rightmost column (ones place)
    cols[-1] = leftmost column (highest place value)
    Each column knows which addend letters it contains
    and which result letter it produces.
    """
    all_words = addends + [result]
    padded    = pad_words(all_words)
    max_len   = len(padded[0])
    cols      = []
    for c in range(max_len - 1, -1, -1):
        addend_letters = [
            padded[i][c]
            for i in range(len(addends))
            if padded[i][c].isalpha()
        ]
        rc = padded[-1][c]
        cols.append({
            "addend_letters": addend_letters,
            "result_letter":  rc if rc.isalpha() else None,
            "display_idx":    c,   # left-to-right index for UI highlighting
        })
    return cols


def check_columns(assignment, cols):
    """
    Validate all fully-assigned columns right-to-left.
    Stops (without error) when it hits a column with unassigned letters.

    For each complete column:
      sum = Σ(addend digits) + carry_in
      carry_out  = 1 if sum >= 10 else 0
      result_digit = sum % 10
      → result_letter must equal result_digit

    Returns:
      ok          – False if any complete column fails
      carries     – dict {rtl_index: carry_out_value}
      fail_ci     – rtl index of failing column (-1 if none)
    """
    carries  = {}
    carry_in = 0

    for ci, col in enumerate(cols):
        # All letters in this column (addends + result)
        all_in_col = col["addend_letters"][:]
        if col["result_letter"]:
            all_in_col.append(col["result_letter"])

        # Stop if any letter unassigned – can't validate yet
        if not all(l in assignment for l in all_in_col):
            break

        s          = sum(assignment[l] for l in col["addend_letters"]) + carry_in
        digit      = s % 10
        carry_out  = 1 if s >= 10 else 0

        if col["result_letter"] and assignment[col["result_letter"]] != digit:
            return False, carries, ci

        carries[ci] = carry_out
        carry_in    = carry_out

    return True, carries, -1


def smart_solve(equation_str, max_display_steps=60):
    """
    Solve a crypto-arithmetic equation using backtracking + column constraints.
    Returns a structured result with step-by-step trace for the UI.
    """
    clean     = equation_str.upper().replace(" ", "")
    lhs, rhs  = clean.split("=")
    addends   = lhs.split("+")
    result    = rhs
    all_words = addends + [result]

    # Leading letters cannot be 0
    leading     = set(w[0] for w in all_words if w)

    # All unique letters in order of first appearance (left-to-right)
    all_letters = list(dict.fromkeys(
        c for w in all_words for c in w if c.isalpha()
    ))

    padded  = pad_words(all_words)
    max_len = len(padded[0])

    # Columns right-to-left
    cols = build_columns_rtl(addends, result)

    assignment = {}
    used       = set()
    all_steps  = []   # full trace (will be trimmed for display)

    # ── Step 1: overflow carry deduction ────────────────────────
    max_addend_len  = max(len(w) for w in addends)
    overflow_letter = result[0] if len(result) > max_addend_len else None

    if overflow_letter:
        assignment[overflow_letter] = 1
        used.add(1)
        all_steps.append({
            "type":          "deduce",
            "phase":         "setup",
            "assignment":    dict(assignment),
            "carries":       {},
            "active_col":    max_len - 1,   # leftmost display column
            "active_letter": overflow_letter,
            "message": (
                f"{overflow_letter} = 1  "
                f"(output '{result}' has more digits than any addend → "
                f"final carry-out must be 1)"
            ),
            "detail": (
                f"Output has {len(result)} digits, "
                f"longest addend has {max_addend_len}. "
                f"The extra leading digit can only come from a carry of 1."
            ),
        })

    # ── Derive column equations for display ─────────────────────
    col_eqs = []
    for i, col in enumerate(cols):
        carry_str = " + carry" if i > 0 else ""
        lhs_str   = " + ".join(col["addend_letters"]) if col["addend_letters"] else "—"
        rhs_str   = col["result_letter"] or "(overflow carry)"
        col_eqs.append(
            f"Col {i + 1} (right→left):  {lhs_str}{carry_str}  =  {rhs_str}"
        )

    all_steps.append({
        "type":          "equations",
        "phase":         "setup",
        "assignment":    dict(assignment),
        "carries":       {},
        "active_col":    None,
        "active_letter": None,
        "message":       f"Column equations derived ({len(cols)} columns, right → left)",
        "detail":        "\n".join(col_eqs),
    })

    # ── Letters remaining to assign ─────────────────────────────
    # Skip overflow_letter — already fixed to 1
    remaining = [l for l in all_letters if l not in assignment]

    found = [False]

    def col_of_display(letter):
        """Return the display_idx of first column containing this letter."""
        for col in cols:
            if letter in col["addend_letters"] or col["result_letter"] == letter:
                return col["display_idx"]
        return None

    # ── Backtracking ─────────────────────────────────────────────
    def bt(idx):
        if found[0]:
            return True

        if idx == len(remaining):
            # All assigned — full column check + arithmetic verify
            ok, carries, _ = check_columns(assignment, cols)
            if not ok:
                return False
            total   = sum(
                int("".join(str(assignment[c]) for c in w))
                for w in addends
            )
            res_val = int("".join(str(assignment[c]) for c in result))
            valid   = total == res_val
            cs      = {str(k): v for k, v in carries.items()}
            all_steps.append({
                "type":          "success" if valid else "fail",
                "phase":         "solve",
                "assignment":    dict(assignment),
                "carries":       cs,
                "active_col":    None,
                "active_letter": None,
                "message": (
                    "✓  " +
                    " + ".join(
                        str(int("".join(str(assignment[c]) for c in w)))
                        for w in addends
                    ) + f" = {res_val}"
                    if valid else "✗ Final arithmetic check failed."
                ),
                "detail": "All constraints satisfied!" if valid else "Contradiction found.",
            })
            if valid:
                found[0] = True
            return valid

        letter  = remaining[idx]
        min_val = 1 if letter in leading else 0
        disp    = col_of_display(letter)

        for digit in range(min_val, 10):
            if digit in used:
                continue

            assignment[letter] = digit
            used.add(digit)

            ok, carries, fail_ci = check_columns(assignment, cols)
            cs       = {str(k): v for k, v in carries.items()}
            fail_d   = cols[fail_ci]["display_idx"] if fail_ci >= 0 else None

            all_steps.append({
                "type":          "assign" if ok else "constraint_fail",
                "phase":         "solve",
                "assignment":    dict(assignment),
                "carries":       cs,
                "active_col":    disp if ok else fail_d,
                "active_letter": letter,
                "message": (
                    f"Try {letter} = {digit}"
                    if ok else
                    f"✗ {letter} = {digit}  →  column constraint violated, backtrack"
                ),
                "detail": (
                    ""
                    if ok else
                    f"Column at display position {fail_d} fails arithmetic check."
                ),
            })

            if ok and bt(idx + 1):
                return True

            if ok:
                # Only record backtrack when we actually explored deeper
                all_steps.append({
                    "type":          "backtrack",
                    "phase":         "solve",
                    "assignment":    dict(assignment),
                    "carries":       cs,
                    "active_col":    disp,
                    "active_letter": letter,
                    "message":       f"↩ {letter} = {digit}  —  no solution downstream, try next digit",
                    "detail":        "",
                })

            del assignment[letter]
            used.discard(digit)

        return False

    bt(0)

    # ── Build result ─────────────────────────────────────────────
    success_idx = next(
        (i for i, s in enumerate(all_steps) if s["type"] == "success"), -1
    )
    solution = all_steps[success_idx]["assignment"] if success_idx != -1 else None

    # Trim: always keep setup steps, then last max_display_steps solve steps
    setup_steps   = [s for s in all_steps if s["phase"] == "setup"]
    solve_steps   = [s for s in all_steps if s["phase"] == "solve"]
    solve_trimmed = (
        solve_steps[max(0, len(solve_steps) - max_display_steps):]
        if success_idx >= 0
        else solve_steps[:max_display_steps]
    )
    final_steps = setup_steps + solve_trimmed

    # Cols for UI: sorted left-to-right, with rtl_idx for carry lookup
    cols_for_ui = sorted(
        [
            {
                "addend_letters": c["addend_letters"],
                "result_letter":  c["result_letter"],
                "display_idx":    c["display_idx"],
                "rtl_idx":        i,
            }
            for i, c in enumerate(cols)
        ],
        key=lambda x: x["display_idx"],
    )

    return {
        "steps":            final_steps,
        "total_raw_steps":  len(all_steps),
        "solution":         solution,
        "addends":          addends,
        "result":           result,
        "col_eqs":          col_eqs,
        "overflow_letter":  overflow_letter,
        "cols":             cols_for_ui,
    }


# ═══════════════════════════════════════════════════════════════
#  FLASK API ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route("/api/solve", methods=["POST"])
def solve():
    data     = request.get_json()
    equation = (data or {}).get("equation", "").strip()

    if not equation:
        return jsonify({"error": "No equation provided"}), 400

    clean = equation.upper().replace(" ", "")

    if "=" not in clean or "+" not in clean:
        return jsonify({"error": "Equation must contain '+' and '='"}), 400

    parts = clean.split("=")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return jsonify({"error": "Invalid equation format"}), 400

    letters = set(c for c in clean if c.isalpha())
    if len(letters) > 10:
        return jsonify({"error": "Too many unique letters (max 10)"}), 400
    if len(letters) < 2:
        return jsonify({"error": "Need at least 2 unique letters"}), 400

    try:
        result = smart_solve(equation)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Solver error: {str(e)}"}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "CSP Solver API is running"})


if __name__ == "__main__":
    print("=" * 55)
    print("  Crypto-Arithmetic CSP Solver  —  Flask API")
    print("  http://localhost:5000")
    print()
    print("  POST /api/solve")
    print('  Body: { "equation": "SEND + MORE = MONEY" }')
    print()
    print("  GET  /api/health")
    print("=" * 55)
    app.run(debug=True, port=5000)