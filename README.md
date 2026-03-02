# PenaHub

Project documentation is organized in the `docs/` directory.

## Documentation Modules

- [Documentation Index](docs/README.md)
- [Project Overview](docs/overview.md)
- [Backend Guide](docs/backend.md)
- [Frontend Guide](docs/frontend.md)
- [Docker Guide](docs/docker.md)
- [Database and SQL](docs/database.md)
- [API Reference (v1)](docs/api.md)
- [Testing Guide](docs/testing.md)
- [CI Pipeline](docs/ci.md)
- [Code Review Expert Module](docs/code-review-expert.md)

## Quick Start

1. Follow [Project Overview](docs/overview.md).
2. Start MySQL with [Docker Guide](docs/docker.md).
3. (Recommended) use `just` as the task runner:
   - `just bootstrap`
   - `just run-backend`
   - `just check` (format + lint + unit tests)
   - `just frontend-check` (prettier check + eslint + build)
4. Run backend using [Backend Guide](docs/backend.md).
5. Run tests using [Testing Guide](docs/testing.md).
