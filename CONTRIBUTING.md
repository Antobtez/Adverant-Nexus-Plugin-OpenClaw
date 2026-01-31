# Contributing to OpenClaw

Thank you for your interest in contributing to OpenClaw! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)
   - Screenshots if applicable

### Suggesting Enhancements

1. Check if the enhancement has been suggested in [Issues](https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw/issues)
2. Create a new issue with:
   - Clear description of the enhancement
   - Use case and benefits
   - Possible implementation approach

### Pull Requests

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Test** your changes (`npm test`)
5. **Lint** your code (`npm run lint`)
6. **Commit** using conventional commits (`git commit -m 'feat: add amazing feature'`)
7. **Push** to your fork (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

## Development Setup

See [README.md](./README.md#quick-start) for development setup instructions.

## Coding Standards

### TypeScript

- Use strict TypeScript (`"strict": true`)
- Provide type annotations for function parameters and return values
- Avoid `any` type unless absolutely necessary
- Use interfaces for object shapes

### Code Style

- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Write JSDoc comments for public APIs
- Keep functions small and focused (single responsibility)

### Testing

- Write tests for new features
- Maintain or improve code coverage
- Run the full test suite before submitting PR

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
