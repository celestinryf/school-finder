# School Finder - Plan Mode Review Process

## Review Order
Architecture -> Code Quality -> Tests -> Performance

## Per Section
- At most 4 top issues (BIG CHANGE mode)
- 1 question per section (SMALL CHANGE mode)

## Per Issue Format
1. Describe problem concretely with file/line references
2. Present 2-3 options (including "do nothing" where reasonable)
3. For each option: effort, risk, impact, maintenance burden
4. Recommended option with reasoning mapped to engineering preferences
5. Explicitly ask for agreement before proceeding

## Issue Labeling
- Issues numbered: #1, #2, #3...
- Options lettered: A, B, C...
- AskUserQuestion format: "Issue #1 Option A" style

## Engineering Preferences (for recommendations)
- DRY: flag repetition aggressively
- Well-tested: too many tests > too few
- "Engineered enough": not hacky, not over-abstracted
- Handle more edge cases, not fewer
- Explicit over clever

## Workflow Rules
- Never assume priorities on timeline or scale
- Pause after each section for feedback
- Do not code until plan is approved
- Feature branches, PRs with Greptile, deploy after each push
