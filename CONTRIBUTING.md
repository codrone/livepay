# Contributing to LivePay Node.js & TypeScript SDK

Thank you for your interest in contributing to the **LivePay SDK**! We welcome bug reports, feature requests, documentation improvements, and code contributions.

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9 or higher (or pnpm / yarn)

### Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/codrone/livepay.git
   cd livepay
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify build, linting, and tests:**
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   npm test
   ```

---

## Development Workflow

### Available Scripts

- `npm run dev`: Runs `tsup` in watch mode for active development.
- `npm run build`: Bundles the TypeScript SDK to ESM, CJS, and TypeScript declaration files (`dist/`).
- `npm test`: Runs the Vitest test suite once.
- `npm run test:watch`: Runs Vitest in interactive watch mode.
- `npm run test:coverage`: Runs unit tests with code coverage reporting.
- `npm run typecheck`: Runs `tsc --noEmit` to verify type safety.
- `npm run lint`: Runs ESLint across the codebase.
- `npm run format:check`: Validates formatting with Prettier.
- `npm run check:exports`: Runs `publint` to verify package export compliance.
- `npm run docs`: Generates HTML API documentation via TypeDoc into `./docs`.

---

## Adding Changesets (Releases)

We use [Changesets](https://github.com/changesets/changesets) to manage automated versioning, changelogs, and npm publication.

Any Pull Request that modifies source code (`src/**`) **must** include a changeset file. CI checks for this automatically. PRs modifying only documentation, CI workflows, or tests are exempt.

To add a changeset to your PR:

1. Run the changeset CLI:
   ```bash
   npx changeset
   ```
2. Select the version bump level (`patch`, `minor`, or `major`) and provide a concise summary of your changes.
3. Commit the generated markdown file in `.changeset/` along with your PR.

For a full explanation of how and when releases are published to npm, see [RELEASING.md](RELEASING.md).

---

## Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names such as `fix/auth-header`, `feat/collections`, or `docs/readme-update`.
2. **Commit Messages**: Keep commits clear, semantic, and descriptive.
3. **Tests**: Ensure all new features or bug fixes include comprehensive unit tests in `tests/`.
4. **Zero Dependencies**: Respect the zero runtime dependency design of this SDK.
5. **CI Pipeline**: Verify that `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` pass locally before creating a PR.

---

## Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.
