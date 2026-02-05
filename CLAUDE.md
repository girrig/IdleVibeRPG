# Project Rules

## Testing
- When modifying or adding functionality, always update existing tests and/or write new tests to cover the changes.
- Run `yarn test` (not `npx vitest run`) to verify all tests pass before considering a task complete.

## Conventions
- Git hooks: pre-commit runs tests, so all changes must pass before committing.
- Use `yarn test` as the test runner.
