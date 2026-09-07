# 0017 — Use one validation graph at every gate

## Status

Amended by 0020.

## Context

Local Git hooks and CI previously named their checks independently. The commit hook did not lint Angular
templates, there was no push gate, and secrets, malformed workflows and dependency advisories had no common
blocking policy. Codex now supports a `Stop` lifecycle hook, but local hooks only execute after a person trusts
their exact definition.

## Considered options

- Package scripts composed into local and CI validation groups — **kept**: every gate calls the same executable
  graph while CI can still split independent groups into separate workspaces.
- Duplicate shell command lists in Husky, Codex and workflow YAML — rejected: the lists can drift while each
  gate remains green on its own subset.
- Replace Husky with another hook manager — rejected: Husky already provides the required Git lifecycle and a
  migration adds no control.
- Treat vulnerability audits as informational — rejected: a report without a blocking threshold leaves known
  severe vulnerabilities shippable.

## Decision

Keep the validation graph in `package.json`. Run staged secret detection, ESLint fixes and formatting at commit;
run the complete graph at push and Codex Stop; split that graph across CI jobs only where each job has its own
checkout. Keep component and application suites sequential inside one workspace.

Pin Gitleaks and actionlint with mise and its artifact lock. Scan staged changes at commit and full history in
CI. Run npm audit on pull requests and weekly, persist a dated report, and block high and critical findings.
Represent any exception as a narrow, justified and expiring rule.

Validate both the initial Codex stop and the stop after an automatic continuation. Use the second stop's
`stop_hook_active` field to return an explicit failure without requesting another continuation. Project hook
activation remains a human trust decision in Codex and is never written into user configuration by repository
automation.

## Consequences

### Positive

- Developers, Codex and CI execute the same named checks with the same pinned tools.
- Synthetic fixtures prove that secret and workflow checks reject bad input.
- Push and CI durations, the complete history scan and dated audit are reviewable artifacts.

### Negative

- A push and a trusted Codex Stop wait for security reports, coverage, builds and serial browser suites,
  including the production offline restart.
- A registry outage blocks the security job until the audit can produce a valid report.
- Each changed hook definition needs a fresh human review before Codex will execute it.
