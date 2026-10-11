# Contributing to livepay-node

Thank you for considering contributing to the `livepay-node` SDK!

## Development Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run test suite:
   ```bash
   npm test
   ```
4. Build the package:
   ```bash
   npm run build
   ```

## Pull Request Guidelines

- Ensure all TypeScript types are fully defined without `any`.
- Write unit tests for new services or bug fixes.
- Ensure code passes `npm run lint` and `npm run typecheck`.
- Create a changeset entry for user-facing changes: `npx changeset`.
