// electron/llm/CodeSanityCheck.ts
//
// Post-generation sanity checks for code answers produced by the LLM.
// The checks here run on the final assistant text (after streaming finishes)
// and look for high-confidence bug shapes that the model occasionally emits
// despite the prompt-level invariants in SHARED_CODING_RULES.
//
// Design intent:
//   - Deterministic and side-effect free (returns a structured result).
//   - Caller decides what to do with a hit (telemetry / log / retry / strip).
//   - We do NOT auto-rewrite the answer. Rewriting one line while leaving the
//     dry-run narration unchanged produces an internally inconsistent answer
//     that's worse than the original bug. The right product response is to
//     mark the answer for regeneration or surface a warning to the user.
//
// See: docs/testing/MODES_PROFILE_INTELLIGENCE_BUGFIX_LOG.md FINDING-012.

export type CodeSanityIssueCode =
    | 'subtraction_as_tuple'
    | 'assignment_in_conditional'
    | 'narration_subtraction_as_tuple';

export interface CodeSanityIssue {
    code: CodeSanityIssueCode;
    /** Short, redaction-safe label for telemetry / logs. */
    label: string;
    /** The matched line, truncated to 200 chars. */
    excerpt: string;
}

export interface CodeSanityResult {
    ok: boolean;
    issues: CodeSanityIssue[];
}

const MAX_EXCERPT_LENGTH = 200;

function truncate(line: string): string {
    if (line.length <= MAX_EXCERPT_LENGTH) return line;
    return line.slice(0, MAX_EXCERPT_LENGTH - 1) + '…';
}

/**
 * Detect a small set of high-confidence bug shapes in code blocks inside
 * the model output. Only inspects content between triple-backtick fences
 * (so prose mentioning these tokens is not flagged) — except for narration
 * shapes that explicitly mirror the bug in plain English.
 */
export function checkAnswerForCodeBugs(answer: string): CodeSanityResult {
    if (!answer || typeof answer !== 'string') return { ok: true, issues: [] };

    const issues: CodeSanityIssue[] = [];

    // 1) SUBTRACTION-AS-TUPLE inside fenced code blocks.
    //    `complement = target, num` — a 2-tuple, not subtraction.
    //    Allow either '=' or '==' or ':=' on the LHS to catch python walrus too.
    //    The variable names are deliberately permissive so we catch every
    //    common shape: complement/diff/remainder/needed/missing/target.
    const fencedBlocks = extractFencedCodeBlocks(answer);
    const tupleBugRe =
        /^\s*(?:const|let|var)?\s*(?:complement|diff|difference|remainder|needed|missing|gap|delta)\s*(?:=|:=)\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*;?\s*$/m;
    for (const block of fencedBlocks) {
        const match = block.content.match(tupleBugRe);
        if (match) {
            issues.push({
                code: 'subtraction_as_tuple',
                label: 'code block assigns a tuple where a subtraction is expected',
                excerpt: truncate(match[0]),
            });
        }
    }

    // 2) ASSIGNMENT-IN-CONDITIONAL inside fenced code blocks.
    //    `if x = target` — single `=` inside `if (...)` or `if x = ...:`.
    //    JavaScript: `if (x = foo)` is legal but almost always a typo for `==`.
    //    Python: `if x = foo:` is a syntax error; we still flag it.
    const assignInIfRe =
        /^\s*if\s*(?:\(\s*)?[A-Za-z_$][\w$.\[\]]*\s*=\s*[^=!<>]/m;
    for (const block of fencedBlocks) {
        const match = block.content.match(assignInIfRe);
        if (match) {
            // Exclude `if x === y` (===) and `if x !== y` (!==) — those are
            // safe; the regex above already excludes them via the negative
            // character class `[^=!<>]`. Double-check by re-matching the line
            // for assignment specifically, not equality.
            const line = match[0];
            if (!/===|!==|==/.test(line)) {
                issues.push({
                    code: 'assignment_in_conditional',
                    label: 'conditional uses assignment (`=`) instead of equality (`==`/`===`)',
                    excerpt: truncate(line),
                });
            }
        }
    }

    // 3) NARRATION-LEVEL TUPLE BUG — even if the code block was rewritten by
    //    a later edit, the dry-run prose sometimes still reads
    //    "calculate `9, 7 = 2`" which is the same bug surfaced in narration.
    //    Look for: digits or names, comma, digits or names, '=' digit/name —
    //    inside backtick prose or plain prose.
    const narrationBugRe = /`?\s*[\w\d-]+\s*,\s*[\w\d-]+\s*=\s*[\w\d-]+\s*`?/;
    // Restrict to lines that include the words 'calculate', 'compute', 'find',
    // or 'gives' so we don't false-positive on legitimate tuple narration.
    const proseLines = answer.split(/\n+/);
    for (const line of proseLines) {
        if (!/calculat|comput|find|gives|see\s/i.test(line)) continue;
        if (narrationBugRe.test(line)) {
            // Ignore lines that look like correct subtraction narration:
            // "calculate 9 - 7 = 2".
            if (/\s-\s/.test(line)) continue;
            issues.push({
                code: 'narration_subtraction_as_tuple',
                label: 'dry-run narration writes "X, Y = Z" where "X - Y = Z" was intended',
                excerpt: truncate(line.trim()),
            });
            break;
        }
    }

    return { ok: issues.length === 0, issues };
}

interface FencedBlock {
    lang: string;
    content: string;
}

function extractFencedCodeBlocks(text: string): FencedBlock[] {
    const blocks: FencedBlock[] = [];
    const re = /```([A-Za-z0-9_+-]*)\s*\n([\s\S]*?)\n```/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
        blocks.push({ lang: m[1] || '', content: m[2] });
    }
    return blocks;
}
