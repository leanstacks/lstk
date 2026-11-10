# Setup Signals

Lookup tables for Phases 1–2. Every row is a hint to verify against the repo, not a conclusion. Read manifests and scripts; never read `.env*` (except templates), keys, credentials, or lockfile contents.

## Contents

1. Ecosystem → install / build / run / test
2. Runtime and tool version pins
3. System dependencies
4. Environment and configuration
5. Supporting services
6. Access and authentication
7. Bootstrap automation
8. Verify signals (ports, health)
9. Platform notes

## 1. Ecosystem → install / build / run / test

Use these as _candidates_. The documented command must come from a script, Makefile, or CI step you actually saw. If the repo defines none, the default below may be used and labeled `(inferred)`.

| Ecosystem      | Manifest signals                                                           | Typical install                                                                          | Typical run / test (confirm in scripts or CI)                                         |
| :------------- | :------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| Node / TS      | `package.json`; lockfile name picks npm / pnpm / yarn / bun                | `npm ci` / `pnpm install --frozen-lockfile` / `yarn install --immutable` / `bun install` | `scripts.dev`, `scripts.start`, `scripts.test`; workspaces: `-w <pkg>` or `--filter`  |
| Python         | `pyproject.toml`, `requirements*.txt`, `Pipfile`, `uv.lock`, `poetry.lock` | venv + `pip install -r`, `poetry install`, `uv sync`, `pipenv install`                   | `[project.scripts]`, `manage.py runserver`, `uvicorn`, `pytest`, `tox`, `nox`         |
| Go             | `go.mod`, `go.work`                                                        | `go mod download`                                                                        | `go run ./cmd/<name>`, `go test ./...`                                                |
| Rust           | `Cargo.toml`                                                               | `cargo fetch` / `cargo build`                                                            | `cargo run -p <crate>`, `cargo test`                                                  |
| JVM            | `pom.xml`, `build.gradle(.kts)`, wrapper scripts `mvnw` / `gradlew`        | prefer the wrapper: `./mvnw -DskipTests package`, `./gradlew build -x test`              | Spring Boot: `spring-boot:run` / `bootRun`; tests: `mvnw test` / `gradlew test`       |
| .NET           | `*.sln`/`*.slnx`, `*.csproj`, `global.json`, `nuget.config`                | `dotnet restore`                                                                         | `dotnet run --project <csproj>` (check `launchSettings.json` profiles), `dotnet test` |
| Ruby           | `Gemfile`, `.ruby-version`                                                 | `bundle install`                                                                         | `bin/rails server`, `bin/dev`, `bundle exec rspec` / `rails test`                     |
| PHP            | `composer.json`                                                            | `composer install`                                                                       | `php artisan serve`, `bin/console`, `phpunit` / `pest`                                |
| Elixir         | `mix.exs`                                                                  | `mix deps.get`                                                                           | `mix phx.server`, `mix test`                                                          |
| Dart / Flutter | `pubspec.yaml`                                                             | `flutter pub get`                                                                        | `flutter run`, `flutter test`                                                         |
| Swift / iOS    | `Package.swift`, `*.xcodeproj`                                             | open in Xcode / `swift build`                                                            | scheme from `xcodebuild -list` (do not run in recon)                                  |
| Android        | `build.gradle` + `AndroidManifest.xml`                                     | Android Studio sync / `./gradlew assembleDebug`                                          | emulator or device required                                                           |
| C/C++          | `CMakeLists.txt`, `Makefile`, `meson.build`, `BUILD`                       | configure + build per README/CI                                                          | `ctest`, `make test`                                                                  |
| Task runners   | `Makefile`, `justfile`, `Taskfile.yml`                                     | targets named `setup`, `bootstrap`, `install`, `dev`, `up`                               | **Canonical commands for any stack**; list targets before documenting manual steps    |

## 2. Runtime and tool version pins

Prerequisite versions gate setup, so document them _with their source file_.

| Pin file                                                               | Meaning                                                               |
| :--------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| `.nvmrc`, `.node-version`, `package.json` `engines` / `volta`          | Node version                                                          |
| `.python-version`, `pyproject.toml` `requires-python`, `tox.ini`       | Python version                                                        |
| `.ruby-version`, `Gemfile` `ruby`                                      | Ruby                                                                  |
| `.tool-versions`, `mise.toml`                                          | asdf / mise: multiple runtimes in one file                            |
| `go.mod` `go`/`toolchain`                                              | Go                                                                    |
| `rust-toolchain.toml`                                                  | Rust channel                                                          |
| `global.json`, csproj `<TargetFramework>`                              | .NET SDK / target                                                     |
| `pom.xml` `maven.compiler.*`, Gradle `toolchain`/`sourceCompatibility` | Java version                                                          |
| Dockerfile `FROM`, CI `setup-*` actions with `*-version`               | What CI really uses; **if it disagrees with a pin file, report both** |

Version managers: if `.nvmrc`/`.tool-versions` exists, suggest the matching manager (nvm/fnm/volta, asdf/mise) as an option, not a requirement.

## 3. System dependencies

Native libraries and tools a clean machine will lack. Sources: Dockerfile `apt-get install` / `apk add` / `brew` lines, CI `apt` steps, README, scripts calling `jq`, `make`, `protoc`, `openssl`, `psql`, `git-lfs`. Also look for `.gitattributes` with `filter=lfs` (Git LFS), `.gitmodules` (submodules: `git submodule update --init --recursive`), and node-gyp / `cgo` / `-sys` crates (compilers required).

## 4. Environment and configuration

- Templates: `.env.example`, `.env.sample`, `.env.template`, `config/*.example.*`, `appsettings.json` (+ `appsettings.Development.json` if present), `*.sample` files, `local.settings.json.sample`.
- Compose `environment:` / `env_file:` and CI `env:` blocks show which variables are needed to run and test.
- Code discovery (names only):

```bash
grep -rhoE "process\.env\.[A-Z_0-9]+|os\.environ(\.get)?\(?['\"][A-Z_0-9]+|getenv\(['\"][A-Z_0-9]+" src . --include=* 2>/dev/null | sort -u | head -60
grep -rhoE "GetEnvironmentVariable\(\"[A-Za-z_]+\"|Configuration\[\"[A-Za-z:_]+\"\]" --include=*.cs . 2>/dev/null | sort -u | head -60
```

- For each variable record: name, purpose (from template comments or usage), required vs. optional (has default in code?), and **whether it implies a secret** (key, token, password, DSN). Group them: _non-secret defaults_ (copy as-is), _secret_ (must be obtained), _environment-specific_ (URLs).
- .NET: user secrets (`UserSecretsId` in csproj) are used; note `dotnet user-secrets set` as the mechanism and never read the store.
- Frameworks with layered config (`.env`, `.env.local`, `.env.development`): note load order only if documented or evident.

## 5. Supporting services

| Signal                                                                                                                          | Likely service / approach                                                                             |
| :------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------- |
| `docker-compose*.yml` `services:`                                                                                               | Authoritative list of local services, ports, volumes, `profiles:`; note `depends_on` and healthchecks |
| `.devcontainer/devcontainer.json` + compose                                                                                     | Containerized dev environment; may include services as `features`                                     |
| CI `services:` block                                                                                                            | Minimum services the tests need                                                                       |
| ORM/migration config (`prisma/`, `alembic/`, `Migrations/`, `db/migrate`, Flyway/Liquibase)                                     | Database + a migrate step; look for seed scripts                                                      |
| SDK imports / env names: `REDIS_`, `AMQP_`, `KAFKA_`, `S3_`, `SQS_`, `DYNAMODB_`, `ELASTIC`, `MONGO`                            | Dependency on cache / queue / object store / search / document DB                                     |
| `localstack`, `moto`, `dynamodb-local`, `minio`, `azurite`, `firebase emulators`, `wiremock`, `mockserver`, `mailhog`/`mailpit` | Local emulators for cloud/third-party services                                                        |
| `serverless-offline`, `sam local`, `cdk` + `cdk watch`, `func start`, `vercel dev`                                              | Local emulation of serverless runtime                                                                 |
| Endpoint URLs pointing at shared dev/staging hosts in templates                                                                 | External dependency that **cannot** run locally: document access requirements, mark in the diagram    |

For every service capture: how to start, how to verify, default port, and whether data persists or must be seeded.

## 6. Access and authentication

Record only what the repo evidences; otherwise it is an Open Question.

- Private registries: `.npmrc` (`registry=`, `@scope:registry`), `nuget.config` sources, `pip.conf` / `--index-url`, Maven `settings.xml` mirrors, `.cargo/config.toml`. Note _that_ auth is needed and how the repo says to get it; never copy tokens.
- Cloud: scripts or docs invoking `aws sso login`, `AWS_PROFILE`, `gcloud auth`, `az login`; named profiles in docs. Capture the profile _name_ the docs or scripts expect.
- VPN/internal hosts: mentions in README or scripts. Do not copy internal hostnames into the guide unless the README already publishes them.
- SSH/Git: private submodules or `git+ssh://` dependencies imply SSH access requirements.

## 7. Bootstrap automation

Check these before describing manual steps; the guide should lead with them when they are maintained and CI-aligned.

- `Makefile`/`justfile`/`Taskfile` targets: `setup`, `bootstrap`, `init`, `dev`, `up`, `seed`, `reset`
- `scripts/setup*`, `script/bootstrap`, `script/setup` (GitHub "scripts to rule them all" convention), `bin/setup` (Rails)
- `package.json` scripts like `postinstall`, `prepare` (note: `prepare` often installs git hooks), `setup`, `db:*`
- Git hooks: `.husky/`, `.pre-commit-config.yaml` (`pre-commit install` step), `lefthook.yml`
- Codegen steps: `codegen`, `generate`, `proto`, `prisma generate`, `openapi` scripts that must run before build

## 8. Verify signals

| Need                              | Where to look                                                                                                                                                            |
| :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Port                              | `PORT` default in code/config, Dockerfile `EXPOSE`, compose `ports:`, `launchSettings.json` `applicationUrl`, framework default (state when relying on it, `(inferred)`) |
| Health endpoint                   | route named `health`, `healthz`, `ready`, `status`, `/actuator/health`, `MapHealthChecks`; Dockerfile/compose `healthcheck:`                                             |
| "Is it running" for non-HTTP apps | CLI `--version`/`--help`, a smoke-test script, a test target, log line stated in README                                                                                  |
| Frontend                          | dev server URL from `vite.config.*` / `next.config.*` / `angular.json`; default ports are framework defaults, label inferred                                             |

## 9. Platform notes

Include a platform note only when evidence supports it:

- Only `.sh` scripts and no PowerShell/batch equivalents: Windows users need WSL2 or Git Bash.
- Docker required: note Docker Desktop / Colima / Podman compatibility only if the repo says so.
- Apple Silicon: `platform: linux/amd64` in compose or arch-specific images imply emulation; note it.
- Path-length, line-ending (`.gitattributes` `eol=`), and case-sensitivity issues only if the repo already acts on them.
