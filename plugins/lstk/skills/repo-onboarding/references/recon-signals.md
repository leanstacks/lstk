# Reconnaissance Signals

Lookup tables for Phase 1. Use them to turn file names into facts quickly. Treat every row as a hint to verify, not a conclusion.

## Manifests → ecosystem

| File                                                                                                                         | Ecosystem                | Where to look next                                                                                                                                                                                         |
| :--------------------------------------------------------------------------------------------------------------------------- | :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                                                                               | Node / JS / TS           | `scripts`, `main`/`bin`/`exports`, `workspaces`, `engines`, `type`                                                                                                                                         |
| `tsconfig*.json`                                                                                                             | TypeScript               | `paths`, `references` (project refs imply multi-package)                                                                                                                                                   |
| `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`                                                                 | JS monorepo              | Workspace globs, task pipelines                                                                                                                                                                            |
| `pyproject.toml`, `setup.py`, `setup.cfg`, `requirements*.txt`, `Pipfile`                                                    | Python                   | `[project.scripts]`, build backend, tool sections (pytest, ruff, mypy)                                                                                                                                     |
| `go.mod`, `go.work`                                                                                                          | Go                       | `module` path, `cmd/` dirs (each = a binary)                                                                                                                                                               |
| `Cargo.toml`                                                                                                                 | Rust                     | `[workspace]`, `[[bin]]`, `src/main.rs` vs `src/lib.rs`                                                                                                                                                    |
| `pom.xml`, `build.gradle(.kts)`, `settings.gradle`                                                                           | JVM                      | Modules, main class, Spring Boot plugin, `src/main/resources`                                                                                                                                              |
| `*.csproj`, `*.fsproj`, `*.sln`/`*.slnx`, `Directory.Build.props`, `Directory.Packages.props`, `global.json`, `nuget.config` | .NET (C#, F#, VB)        | `<TargetFramework>`, `<Sdk>` (Web, Worker, Razor), `OutputType`, `Program.cs` / `Startup.cs`, `<ProjectReference>` graph. C# is **not** C/C++: key on projects and the `dotnet` CLI, not `main()` or CMake |
| `Gemfile`, `*.gemspec`, `config.ru`                                                                                          | Ruby                     | Rails (`config/routes.rb`), Rack                                                                                                                                                                           |
| `composer.json`                                                                                                              | PHP                      | Framework (Laravel `artisan`, Symfony `bin/console`)                                                                                                                                                       |
| `mix.exs`                                                                                                                    | Elixir                   | Phoenix (`lib/*_web`)                                                                                                                                                                                      |
| `Package.swift`, `*.xcodeproj`                                                                                               | Swift / iOS              | Targets, schemes                                                                                                                                                                                           |
| `build.gradle` + `AndroidManifest.xml`                                                                                       | Android                  | Activities, modules                                                                                                                                                                                        |
| `pubspec.yaml`                                                                                                               | Dart / Flutter           | `lib/main.dart`                                                                                                                                                                                            |
| `CMakeLists.txt`, `Makefile`, `meson.build`, `BUILD`/`WORKSPACE`                                                             | C/C++ / Bazel            | Targets, `main()`                                                                                                                                                                                          |
| `Makefile`, `justfile`, `Taskfile.yml`                                                                                       | Task runners (any stack) | Targets are the canonical commands                                                                                                                                                                         |

**Package manager from lockfile name only** (do not read contents): `package-lock.json` → npm; `pnpm-lock.yaml` → pnpm; `yarn.lock` → yarn; `bun.lockb`/`bun.lock` → bun; `poetry.lock` → Poetry; `uv.lock` → uv; `Pipfile.lock` → pipenv; `Cargo.lock` → cargo; `go.sum` → go modules; `packages.lock.json` → NuGet (locked restore; central versions may live in `Directory.Packages.props`).

## Monorepo markers

- Workspace declarations (`workspaces`, `pnpm-workspace.yaml`, `[workspace]`, `go.work`, Gradle `include`)
- Multiple manifests below the root
- A `.sln`/`.slnx` referencing several `.csproj` files (.NET); the `<ProjectReference>` graph gives the dependency direction
- Directories named `packages/`, `apps/`, `services/`, `libs/`, `modules/`, `cmd/`, `internal/`
- A `shared`/`common`/`core` package is usually the central contract; read it first

## Entry-point heuristics

| Kind                              | Signals                                                                                                                                                                                                                |
| :-------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web server                        | `server.*`, `app.*`, `main.*`, `index.*` at `src/` root; framework bootstraps (`NestFactory.create`, `express()`, `FastAPI(`, `Flask(`, `SpringApplication.run`, `gin.Default`, `http.ListenAndServe`)                 |
| .NET web / API                    | `Program.cs` with `WebApplication.CreateBuilder`, `Microsoft.NET.Sdk.Web`; legacy `Startup.cs` + `ConfigureServices`; `Controllers/`, `Endpoints/`, minimal-API `app.Map*`, `*.razor` / `Pages/` (Blazor, Razor Pages) |
| .NET worker / console / functions | `Microsoft.NET.Sdk.Worker` + `Host.CreateApplicationBuilder` / `BackgroundService`; `OutputType` `Exe` with no web SDK (console); `host.json` + `[Function]` attributes (Azure Functions); `MauiProgram.cs` (MAUI)     |
| Serverless                        | `handlers/`, `functions/`, `serverless.yml`, `template.yaml` (SAM), CDK `Function`/`NodejsFunction` constructs, `exports.handler` / `export const handler`                                                             |
| CLI                               | `bin/` dir, `bin` in manifest, `cmd/<name>/main.go`, `argparse`/`click`/`clap`/`commander` usage                                                                                                                       |
| Frontend SPA                      | `index.html` + `src/main.*`, `vite.config.*`, `next.config.*`, `angular.json`, `nuxt.config.*`, `svelte.config.*`                                                                                                      |
| Worker / queue consumer           | `worker*`, `consumers/`, `jobs/`, queue SDK imports (SQS, Celery, Sidekiq, BullMQ)                                                                                                                                     |
| Library                           | `exports`/`main` in manifest with no server bootstrap; `src/lib.rs`; `__init__.py` public API                                                                                                                          |
| IaC app                           | `cdk.json`, `bin/*.ts` + `lib/*-stack.ts`, `main.tf`, `Pulumi.yaml`, `terraform/`                                                                                                                                      |
| Mobile                            | `AppDelegate`, `MainActivity`, `main.dart`                                                                                                                                                                             |

## Configuration and environment

- Templates: `.env.example`, `.env.sample`, `.env.template`, `config/*.example.*`, `appsettings.json` (check for `*.Development.json`)
- Container: `Dockerfile*`, `docker-compose*.yml`, `.devcontainer/`, `skaffold.yaml`, `helm/`, `k8s/`, `kustomization.yaml`
- Version pins: `.nvmrc`, `.node-version`, `.python-version`, `.tool-versions` (asdf/mise), `rust-toolchain.toml`, `global.json` (.NET SDK version)
- .NET config: `appsettings.json` and `appsettings.{Environment}.json` (layered; read the base file and note which environments exist), `Properties/launchSettings.json` (local profiles, ports), `local.settings.json` (Azure Functions; often gitignored, check for a `.sample`). User secrets (`secrets.json`, `UserSecretsId` in the csproj) are never read; note only that they are used
- Env var discovery in code (names only): `grep -rhoE "process\.env\.[A-Z_]+|os\.environ(\.get)?\(?['\"][A-Z_]+|getenv\(['\"][A-Z_]+" src | sort -u`
- .NET equivalent: `grep -rhoE "GetEnvironmentVariable\(\"[A-Za-z_]+\"|GetSection\(\"[A-Za-z:_]+\"|Configuration\[\"[A-Za-z:_]+\"\]" --include=*.cs . | sort -u` (config keys use `:` for nesting and map to env vars with `__`)

## Build, test, quality, CI

| Concern                | Where                                                                                                                                                                                                                                                                                                                                                                   |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical commands     | manifest `scripts`, `Makefile`/`justfile`/`Taskfile`, `README` "Development" section. .NET: `dotnet restore` / `build` / `test` / `run --project <csproj>`; confirm against CI before documenting                                                                                                                                                                       |
| .NET tests and quality | Test projects are usually `*.Tests.csproj` / `*.UnitTests` / `*.IntegrationTests` referencing xUnit, NUnit or MSTest packages; look for `Testcontainers`, `WebApplicationFactory` (integration tests that need Docker or a DB). Analyzers/format: `.editorconfig`, `.globalconfig`, `Directory.Build.props` (`TreatWarningsAsErrors`, analyzers), `dotnet format` in CI |
| Tests                  | `test/`, `tests/`, `__tests__/`, `*.spec.*`, `*.test.*`, `*_test.go`, `src/test/`; config: `jest.config.*`, `vitest.config.*`, `pytest.ini`, `pyproject.toml [tool.pytest]`, `playwright.config.*`, `cypress.config.*`                                                                                                                                                  |
| Lint / format          | `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `ruff.toml`, `.golangci.yml`, `rustfmt.toml`, `.editorconfig`, `.pre-commit-config.yaml`, `.husky/`                                                                                                                                                                                                                    |
| CI                     | `.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/config.yml`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`                                                                                                                                                                                                                                    |
| Release                | `.changeset/`, `release-please-config.json`, `semantic-release` config, `CHANGELOG.md`                                                                                                                                                                                                                                                                                  |

CI workflow files are the most trustworthy source for "what commands actually work", because they run on every change.

## Infrastructure and deployment

| Signal                                                               | Meaning                                    |
| :------------------------------------------------------------------- | :----------------------------------------- |
| `cdk.json`                                                           | AWS CDK; stacks in `lib/` or `src/stacks/` |
| `*.tf`, `.terraform.lock.hcl`                                        | Terraform                                  |
| `Pulumi.yaml`                                                        | Pulumi                                     |
| `serverless.yml`                                                     | Serverless Framework                       |
| `template.yaml` + `samconfig.toml`                                   | AWS SAM                                    |
| `azure-pipelines.yml`, `bicep/`, `*.bicep`                           | Azure                                      |
| `app.yaml`, `cloudbuild.yaml`                                        | GCP                                        |
| `fly.toml`, `render.yaml`, `vercel.json`, `netlify.toml`, `Procfile` | PaaS targets                               |

## Architecture signals

| Observation                                                                          | Likely pattern                                                                                        |
| :----------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `controllers/`, `services/`, `repositories/` or `handlers/`, `services/`, `utils/`   | Layered; document dependency direction                                                                |
| `domain/`, `application/`, `infrastructure/`, `ports/`, `adapters/`                  | Hexagonal / clean architecture                                                                        |
| `modules/<feature>/` each with its own layers                                        | Modular monolith / feature slices (NestJS, Angular)                                                   |
| .NET projects named `*.Domain`, `*.Application`, `*.Infrastructure`, `*.Api`/`*.Web` | Clean/onion architecture; verify direction via `<ProjectReference>` (Domain should reference nothing) |
| `Migrations/`, a class deriving `DbContext`, `Microsoft.EntityFrameworkCore`         | EF Core persistence; the `DbContext` and entity classes are the data model                            |
| `MediatR`, `Handlers/`, `Commands/`, `Queries/`                                      | CQRS / mediator pattern                                                                               |
| `events/`, `consumers/`, `producers/`, queue/topic names                             | Event-driven                                                                                          |
| `migrations/`, `prisma/schema.prisma`, `models/`, `entities/`                        | Persistence layer; find the data model                                                                |
| `openapi.*`, `*.proto`, `schema.graphql`                                             | API contract; document it as a central contract                                                       |
| `shared/`, `common/`, `types/` consumed by many packages                             | Shared contract package                                                                               |

## History skim (cheap, high value)

```bash
git log --oneline -15                                   # recent direction
git shortlog -sn --no-merges | head -5                  # who to ask (mention only if useful)
git log --since='6 months ago' --name-only --format= | sort | uniq -c | sort -rn | head -10   # hotspots
```

Hotspots point at the code newcomers will touch most; mention them as "active areas", not as quality judgments.
