## Rork Bundling Audit System

This document explains the enhanced bundling audit added to the project (script: `scripts/bundling-audit.mjs`). It provides earlier, clearer detection of issues that can break the Metro/Expo bundle or slow down development.

### Goals

- Catch real bundle blockers (syntax, missing deps, TS compile failures).
- Reduce noise from false positives (brace counting, built-in modules).
- Guide engineers with actionable remediation steps.
- Integrate seamlessly with existing health guard (`rork-health-guard.mjs`).

### How to Run

```powershell
bun run audit:bundle
```

**Advanced options:**

```powershell
# Disable heuristic checks (quote/brace mismatches) for cleaner output
$env:AUDIT_DISABLE_HEURISTICS="1"; bun run audit:bundle

# Generate JSON report for CI dashboards
bun run audit:bundle --json
bun run audit:bundle --json=custom-report.json

# Strict mode: warnings escalate to failure (exit code 2)
bun run audit:bundle --strict
# or via environment:
$env:FAIL_ON_WARNINGS="1"; bun run audit:bundle
```

Exit codes:
- 0: No blocking errors (warnings may remain).
- 1: Blocking issues detected (review sections below).
- 2: Strict mode enabled and warnings present.

### Categories

| Category | Description | Exit Impact |
|----------|-------------|-------------|
| syntaxErrors | Verified issues like TS compile failure. Heuristic brace mismatches only for client code. | Blocking |
| missingDependencies | Modules imported but not declared (excluding built-ins & declared externals). | Blocking |
| circularDependencies | Import cycles discovered via DFS graph. | Blocking |
| configurationIssues | Missing or unreadable critical config files (babel, metro, tsconfig). | Blocking |
| importIssues | Node-only APIs (`fs`, etc.) in client code paths (app/lib/contexts). | Blocking |
| encodingIssues | UTF-8 BOM or null bytes in source files. | Blocking |
| invariants | Code quality checks: @ts-nocheck in production code, missing required exports. | Warning |
| warnings | Non-blocking: unmatched quotes heuristics, browser API usage, dev-client only packages. | Non-blocking |

### False Positive Mitigation

Previous audit approaches produced noise from:
- Brace/bracket counts in large files.
- Node built-ins flagged as missing dependencies.
- Dev-only optional packages.
- Quote mismatches in template literals and string-heavy files.

Mitigations applied:
- **Client relevance scoping**: Structural mismatch and fs usage checks limited to `app/`, `lib/`, `contexts/` only.
- **Built-in allowlist**: Treats Node built-ins & external dev wrappers as known modules (`fs`, `path`, `@rork-ai/toolkit-dev-sdk`, etc.).
- **Alias resolution**: Supports `@/` prefix for accurate circular dependency mapping.
- **Heuristics toggle**: Set `AUDIT_DISABLE_HEURISTICS=1` to skip quote/brace mismatch checks entirely.
- **TypeScript-driven downgrade**: When TS compile passes, heuristic structural mismatches are reclassified as warnings.

### Adding New Externals

Update `isBuiltInModule()` in `scripts/bundling-audit.mjs` to whitelist additional tooling or wrapper packages. Prefer aliasing them in `babel.config.js` if used at runtime.

### Typical Remediation Flow

1. Run audit: `bun run audit:bundle`.
2. If TypeScript compile errors: fix those first.
3. Install missing dependencies (`bun add <pkg>`), or stub them if optional in dev.
4. Resolve import cycles (often by inverting a dependency into a shared helper).
5. Remove BOMs via existing script: `node scripts/remove-bom.js`.
6. Clear Metro cache if persistent errors: `bun run start` (Expo handles the reset with `-c`).

### Integration With CI

Add to CI before build steps (example GitHub Actions):
```yaml
- name: Audit bundle
  run: bun run audit:bundle --json
  
- name: Upload audit report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: audit-report
    path: audit-report.json
```

For strict CI that fails on warnings:
```yaml
- name: Audit bundle (strict)
  run: bun run audit:bundle --strict
```

The JSON output (`audit-report.json`) includes:
- Timestamp and summary (total issues, errors, warnings, TS status)
- All errors and warnings with file paths and line numbers
- Categorized issues for dashboard visualization

### Future Enhancements (Backlog)

- AST-based parser (Babel / SWC) to eliminate remaining heuristic quote warnings.
- Optional dependency graph visualization output (e.g., `audit-deps.json`).
- Cache results between runs to speed up large repos.
- Inline `// audit-ignore` directive to suppress specific warnings.
- Per-file severity overrides via config file.

### Quick FAQ

**Q: Why does the audit report mismatched braces in some library files that still compile?**  
A: Heuristic counts can diverge in files with template literals or regex containing braces. They are downgraded when not client-relevant. Confirm with `npx tsc --noEmit`.

**Q: How do I suppress a specific non-critical warning?**  
A: Add a comment near the line: `// audit-ignore <reason>` and extend the script to skip lines matching `audit-ignore` (future enhancement).

**Q: Should I commit stubs for optional SDKs?**  
A: Yes—this avoids unresolved import noise and keeps type/lint checks green in environments without the SDK.

---
Maintainers: Update this file when adding new audit categories or CI flags. Keep the script lean—prefer incremental, explainable checks over brittle heuristics.
