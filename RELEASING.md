# Release Process & Publishing Guide

This document describes the automated release process, policies, and guidelines for publishing new versions of `livepay-node` to the [npm registry](https://www.npmjs.com/package/livepay-node).

---

## 1. When Do We Publish a New Version to npm?

We use a **Continuous Delivery** release model powered by [Changesets](https://github.com/changesets/changesets) and GitHub Actions.

A new release is published to npm **whenever a maintainer reviews and merges the automated `chore: version package` Pull Request into `main`**.

### The Release Lifecycle Overview

```
1. Feature / Fix PR (includes changeset)
          │
          ▼
2. Merged to `main` branch
          │
          ▼
3. GitHub Actions runs `.github/workflows/release.yml`
          │
          ▼
4. Changeset Action creates/updates `chore: version package` PR
   (Consolidates version bumps & updates CHANGELOG.md)
          │
          ▼
5. Maintainer reviews changelog & merges `chore: version package`
          │
          ▼
6. GitHub Actions triggers `npm publish` with provenance attestation
          │
          ▼
7. Published to npm (`latest`) & Git tag / GitHub Release created!
```

---

## 2. Changeset Requirement for Pull Requests

Every Pull Request that introduces changes to the runtime SDK source code (`src/**`) **must** include a Changeset. CI enforces this via the `Verify Changeset` check.

### How to Add a Changeset

1. While working in your branch, run:
   ```bash
   npx changeset
   ```
2. Select the type of bump:
   - **`patch`**: Bug fixes, internal refactorings, or minor non-breaking performance tweaks.
   - **`minor`**: New features, additional endpoints, non-breaking configuration options.
   - **`major`**: Breaking changes (renamed methods, modified parameter types, dropped Node.js support).
3. Enter a clear, concise summary of the change (this will become the public entry in `CHANGELOG.md`).
4. Commit the generated `.changeset/*.md` file alongside your PR.

> **Note**: Pull Requests that only touch documentation (`*.md`), tests (`tests/**`), or CI workflows (`.github/**`) are automatically exempt from the changeset requirement in CI.

---

## 3. The `chore: version package` Pull Request

- Once PRs containing changesets are merged into `main`, the [Release Workflow](.github/workflows/release.yml) runs.
- It automatically opens or updates a single PR titled `chore: version package`.
- This PR consumes the individual `.changeset/*.md` files, bumps the version in `package.json`, and records the changes in `CHANGELOG.md`.
- **Multiple features and bug fixes can accumulate** in this PR until maintainers are ready to deploy a new version.

---

## 4. How Maintainers Trigger an npm Release

When ready to cut a new release:

1. **Review the `chore: version package` PR**:
   - Check the version number in `package.json`.
   - Inspect the formatted entries in `CHANGELOG.md`.
2. **Ensure CI passes**:
   - All tests, linting, typechecks, and export checks must pass.
3. **Merge the PR into `main`**:
   - Click **Squash and merge** (or standard merge) into `main`.
4. **Automated Publishing**:
   - GitHub Actions will detect that `chore: version package` was merged.
   - It will run `prepublishOnly` (`npm run build && npm run typecheck && npm run test && npm run check:exports`).
   - It will publish the package to npm under the `latest` tag with cryptographic SLSA provenance.
   - It will create a git tag (e.g. `v1.1.0`) and publish release notes on GitHub Releases.

---

## 5. Hotfix Procedure

For urgent bug fixes or security vulnerabilities:

1. Create a fix branch from `main`.
2. Fix the bug, write unit tests in `tests/`, and generate a `patch` changeset:
   ```bash
   npx changeset
   ```
3. Open a PR, verify CI passes, and merge into `main`.
4. Wait for the `chore: version package` PR to be updated by GitHub Actions (~1 minute).
5. Immediately review and merge `chore: version package` into `main` to push the patch to npm.
