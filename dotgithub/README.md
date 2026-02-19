# dotgithub/ — Staged Governance Files

This directory contains the complete governance framework for the **UOR Foundation GitHub organisation**. These files are staged here for review and are intended to be copied directly into the [`UOR-Foundation/.github`](https://github.com/UOR-Foundation/.github) repository.

## Target Structure

When deployed, the `.github` repository should contain:

```
.github/
├── CODE_OF_CONDUCT.md          ← org-wide behavioural expectations
├── CONTRIBUTING.md              ← org-wide contribution guide
├── SECURITY.md                  ← org-wide vulnerability reporting
├── STANDARDS.md                 ← naming, versioning, tagging norms
├── LICENSE                      ← MIT (already exists)
├── README.md                    ← org index (root pointer)
├── UOR_Foundation.png           ← logo (already exists)
├── governance/
│   ├── GOVERNANCE.md            ← the complete governance framework
│   └── CHANGELOG.md             ← governance version history
├── .github/
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
└── profile/
    └── README.md                ← org landing page (already exists)
```

## Deployment

Copy each file from this `dotgithub/` directory to the corresponding path in the `.github` repository. Existing files (`LICENSE`, `UOR_Foundation.png`, `profile/README.md`) are not included here — they remain as-is.
