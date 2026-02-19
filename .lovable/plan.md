

# Implement UOR Foundation Governance Framework in .github Repo

## Overview

Create the complete set of governance and community health files specified by the governance framework PDF (v2.0), following OpenContainers best practices for clean structure and discoverability. These files will be created in this project for review, structured exactly as they should appear in the `.github` repository.

## Current State of UOR-Foundation/.github

The repo currently contains only:
- `profile/README.md` (org landing page)
- `LICENSE` (MIT)
- `README.md` (root pointer file)
- `STANDARDS.md` (naming/versioning norms)
- `UOR_Foundation.png` (logo)

## What Gets Created

Following the governance PDF's requirements (Section 6, Appendix D) and OpenContainers' clean root-level pattern:

### Root-Level Community Health Files

These are GitHub "magic" files -- GitHub automatically applies them org-wide when placed in `.github`.

| File | Purpose | Reference |
|------|---------|-----------|
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1. Behavioural expectations. | Sec 6, Appendix D |
| `CONTRIBUTING.md` | How to contribute: workflow, commit conventions, PR process. | Sec 7, 14 |
| `SECURITY.md` | Vulnerability reporting process and response timelines. | Sec 12 |

### Governance Directory

The PDF mandates storage at `governance/`. This is the single source of truth.

| File | Purpose | Reference |
|------|---------|-----------|
| `governance/GOVERNANCE.md` | The complete governance framework, concise and enforceable. | Entire PDF |
| `governance/CHANGELOG.md` | Version history of the governance framework itself. | Sec 15.3 |

### GitHub Templates

| File | Purpose | Reference |
|------|---------|-----------|
| `.github/pull_request_template.md` | PR checklist from Appendix B. | Sec 9, App B |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Structured bug report. | Sec 6, App D |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Structured feature request. | Sec 6, App D |

### Updated Existing Files

| File | Change |
|------|--------|
| `README.md` (root) | Rewrite to serve as clean index: link to governance, community health files, and profile. Following OpenContainers pattern. |
| `STANDARDS.md` | Integrate with governance framework references. Keep concise. |

## What Does NOT Get Created

Per your instruction to include only the minimum structure:
- No `CITATION.cff` (repo-specific, not org-level)
- No `governance/` sub-appendices as separate files (consolidated into GOVERNANCE.md)
- No CI workflow files (those belong in individual repos, not the org .github)
- No `CODEOWNERS` (repo-specific)
- No meeting notes directory (unlike OpenContainers, UOR uses Discussions)

## Governance Document Structure

The `governance/GOVERNANCE.md` will be a clean, concise, enforceable document containing all 17 sections from the PDF, written without unnecessary words:

```text
1.  Purpose and Scope
2.  Glossary
3.  Guiding Principles (5 principles + traceability matrix)
4.  Roles, Teams, and Escalation
5.  Repository Classification (4 tiers)
6.  Repository Standards (required files + branch protection)
7.  Change Control and Contribution Workflow
8.  Version Management and Releases
9.  Peer Review and Quality Assurance
10. Cross-Repository Coherence
11. Repository Lifecycle Management
12. Security and Incident Response
13. Intellectual Property and Licensing
14. Contributor Onboarding
15. Compliance and Auditing
A.  Repository Compliance Checklist
B.  Pull Request Review Checklist
C.  Repository Inventory
D.  Template Repository Manifest
```

## Design Principles Applied

- **OpenContainers pattern**: Community health files at root for GitHub auto-discovery. Governance in dedicated subdirectory. Clean, minimal root.
- **Concise**: Every sentence must earn its place. No filler. No repetition.
- **Self-contained**: Each section states what it is, why it matters, and what it requires.
- **Enforceable**: Every standard maps to a specific verification mechanism.

## Technical Notes

- All files will be created as `.md` Markdown files in this Lovable project
- They will be placed in a `dotgithub/` directory (since `.github/` is reserved by this project) with a clear README explaining the target structure
- The user can then copy these files directly into the UOR-Foundation/.github repository
- File structure mirrors exactly what the `.github` repo should contain

