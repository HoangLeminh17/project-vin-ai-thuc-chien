# AGENTS.md

## Codex rules

- Follow the project workflow in `CLAUDE.md`: create a feature/docs branch before changes, commit on that branch, push it, and use a PR to merge into `main`.
- Keep documentation updates newest-first when editing `WORKLOG.md`.
- For `WORKLOG.md`, verify sprint rows against GitHub PR history when possible: PR date, PR author, merged/unmerged state, and task wording must all line up.
- Treat "PR author" as evidence, not absolute truth. If a task label spans backend/UI/docs or multiple ownership areas, split the wording so attribution stays fair.
- Use Conventional Commits for commit messages.
- Preserve PR commit history when merging into `main` unless the user explicitly asks for squash. Do not interpret "gop lai", "merge vao main", or "commit lai" as permission to squash; ask if the merge strategy is ambiguous.
- Do not commit local secrets, `.env`, or generated AI logs.
- Prefer small, focused changes that match the existing project conventions.
