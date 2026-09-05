# Issue tracker: GitHub

Issues and specs for this repo live in [glm-project/glm-front](https://github.com/glm-project/glm-front/issues).
Use the `gh` CLI. Organize them on [Backlog GLM](https://github.com/orgs/glm-project/projects/2),
organization `glm-project`, project `2`. The board also contains work from other repositories;
keep each issue in the repository that owns the work.

## Issue operations

- Publish to the tracker: create an issue with `gh issue create --repo glm-project/glm-front --title "..." --body-file <path>`.
  Write multiline bodies to a temporary file and pass `--body-file` for creation, edits and comments.
- Fetch a ticket: `gh issue view <number> --repo glm-project/glm-front --comments`.
  Include its body, labels, assignees and comments when evaluating it.
- Discover work: `gh issue list --repo glm-project/glm-front --state open --json number,title,body,labels,assignees`.
  Use label filters where relevant and retrieve all pages needed for the requested scope.
- Add an issue to the board: `gh project item-add 2 --owner glm-project --url <issue-url>`.
- Apply or remove labels with `gh issue edit`; use the role mapping in [triage-labels.md](triage-labels.md).
- Comment with `gh issue comment`; close with `gh issue close` when the issue's completion criteria are met.

Read the board's current instructions and fields before organizing its items:
`gh project view 2 --owner glm-project --format json` and
`gh project field-list 2 --owner glm-project --format json`.
Use `gh project item-edit` to set fields; resolve their current names or IDs from that output.

## Board conventions

- `Nature: Spec` is decision work. An issue belonging to the screen map is titled as its question;
  completion means the decision is resolved and recorded on the map.
- `Nature: Exécution` is implementation work. Prefix its title with `Exécution —` and link the decision
  it implements when one exists. Completion means the work is built and delivered.
- For map tickets, native blocking relationships and assignment determine availability:
  `Backlog` for blocked work, `À faire` for unblocked and unassigned work, `En cours` for assigned work,
  and `Done` for closed work. Re-evaluate dependent tickets after a closure.
- For work outside the map, `Backlog` can express a human priority decision. Preserve it when there are
  no blockers. Preserve an explicit `En review` status while the work is being reviewed.
- Triage labels express readiness; the board's `Status` and `Nature` fields express workflow and work type.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set to `yes` if external PRs should enter the triage queue.

When enabled, use the `gh pr` equivalents and include the diff in evaluation. Discover external requests
from authors whose association is `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` or `NONE`; explicitly named PRs
can be evaluated regardless of author. GitHub issues and PRs share a number space: resolve a bare number
with `gh pr view <number>` and fall back to `gh issue view <number>`.

## Wayfinding

The existing screen map is [glm-front#3](https://github.com/glm-project/glm-front/issues/3).
Use it for work on that map; independent maps use their own parent issue labelled `wayfinder:map`.

- Link tickets as native sub-issues. Use `wayfinder:research`, `wayfinder:prototype`,
  `wayfinder:grilling` or `wayfinder:task` according to the work.
- Represent blockers with native GitHub issue dependencies. When using the REST dependency endpoint,
  `issue_id` is the blocker's numeric database ID, not its issue number or GraphQL node ID.
- If native relationships are unavailable, list children in the map's task list, put `Part of #<map>`
  in each child, and list its blockers as `Blocked by: #<number>`. Keep cross-repository references qualified.
- Select the first open, unassigned child in map order whose blockers are all closed. A ticket's
  `ready-for-agent` label alone does not establish that it is unblocked.
- Claim with `gh issue edit <number> --add-assignee @me`. Record the resolution, close the completed child,
  and append a summary and link to the map's Decisions-so-far. Recalculate affected board statuses.
