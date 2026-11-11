# Stack Detection Reference

Read in Phase 1 once the stack(s) are identified. For each ecosystem: how to confirm it, where the real commands live, and traps worth documenting in `AGENTS.md`. Do not copy this table into the output; use it to know where to look.

A repo can match several rows (polyglot or monorepo). Treat each component separately.

## Contents

- JavaScript / TypeScript / Node.js
- Python
- PHP
- Go
- Rust
- Java
- .NET / C#
- Ruby
- Swift / iOS
- Android
- Dart / Flutter
- C / C++ / Bazel
- Cross-cutting traps

---

## JavaScript / TypeScript / Node.js

- **Detect:** `package.json`, `tsconfig*.json`, `deno.json`, lockfile (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`).
- **Commands:** `scripts` in `package.json` (per workspace package), `engines` and `packageManager` fields, `.nvmrc`. Monorepo task runners: `turbo.json`, `nx.json`, `lerna.json`, `pnpm-workspace.yaml`.
- **Traps:** package manager mismatch (use the lockfile's), workspace filter syntax, build order between internal packages, framework codegen (Prisma, GraphQL codegen, OpenAPI), ESM vs CJS, test runner (Jest/Vitest/node:test).

## Python

- **Detect:** `pyproject.toml`, `requirements*.txt`, `setup.py`/`setup.cfg`, `Pipfile`, `uv.lock`, `poetry.lock`, `pdm.lock`.
- **Commands:** `[project.scripts]` and tool tables in `pyproject.toml`, `tox.ini`, `noxfile.py`, Makefile, CI. Tools: pytest, ruff, black, mypy, pyright.
- **Traps:** which environment manager (uv/poetry/venv) and how to run commands through it, Python version pin (`.python-version`), `src/` layout, Django/Flask/FastAPI entry points, migrations (Alembic/Django).

## PHP

- **Detect:** `composer.json`, `composer.lock`, `artisan` (Laravel), `bin/console` (Symfony).
- **Commands:** `scripts` in `composer.json`, `phpunit.xml*`, `phpstan.neon*`, `.php-cs-fixer*`, `pint.json`.
- **Traps:** PHP version constraint, framework console commands for migrate/cache/test, generated autoload (`composer dump-autoload`), env handling.

## Go

- **Detect:** `go.mod`, `go.work` (multi-module), `cmd/` and `internal/` layout.
- **Commands:** Makefile or `Taskfile`, CI, `.golangci.y*ml`. Standard: `go build ./...`, `go test ./...`, `go vet`.
- **Traps:** module boundaries in `go.work`, build tags, generated code (`go generate`, protobuf, mockgen), `internal/` visibility rules.

## Rust

- **Detect:** `Cargo.toml`, `Cargo.lock`, `[workspace]` table, `rust-toolchain*`.
- **Commands:** `cargo build/test/clippy/fmt`, `.cargo/config.toml` aliases, Makefile or `xtask`, CI.
- **Traps:** workspace member selection (`-p`, `--workspace`), feature flags, toolchain pin, `build.rs` and generated code, slow release-mode tests.

## Java

- **Detect:** `pom.xml` (Maven, check `<modules>`), `build.gradle*` and `settings.gradle*` (Gradle, check `include`), `mvnw`/`gradlew` wrappers.
- **Commands:** always prefer the wrapper (`./mvnw`, `./gradlew`). Read profiles (Maven) and tasks (Gradle), CI, version catalog `gradle/libs.versions.toml`.
- **Traps:** JDK version, multi-module build order, Spring profiles, annotation-processor generated sources (Lombok, MapStruct), integration tests needing containers.

## .NET / C#

- **Detect:** `*.sln`/`*.slnx`, `*.csproj`/`*.fsproj`/`*.vbproj`, `global.json`, `Directory.Build.props`, `Directory.Packages.props` (central package versions), `nuget.config`.
- **Commands:** `dotnet build/test/format`, solution vs project scope, launch settings, CI.
- **Traps:** SDK pin in `global.json`, multi-targeting, EF Core migrations, analyzers and `.editorconfig` enforced at build, test projects needing external services.

## Ruby

- **Detect:** `Gemfile`, `Gemfile.lock`, `*.gemspec`, `Rakefile`, `bin/rails`, `config/application.rb`.
- **Commands:** `bundle exec rake -T` (task list), `bin/rails` commands, `.rubocop.yml`, RSpec vs Minitest, CI.
- **Traps:** always run through `bundle exec`, Ruby version (`.ruby-version`, `.tool-versions`), Rails migrations and schema file, asset pipeline.

## Swift / iOS

- **Detect:** `Package.swift` (SwiftPM), `*.xcodeproj` and `*.xcworkspace` (**directories**), `Podfile`, `Cartfile`, `project.yml` (XcodeGen), `Fastfile`.
- **Commands:** `xcodebuild -list` to enumerate schemes (record the real scheme and destination), `swift build/test`, Fastlane lanes, `.swiftlint.yml`, `.swiftformat`, CI.
- **Traps:** use the `.xcworkspace` when CocoaPods is present, `.pbxproj` merge conflicts and the rule to add files through Xcode or XcodeGen, simulator destination names, signing and provisioning (never commit credentials), generated project files.

## Android

- **Detect:** `build.gradle(.kts)`, `settings.gradle(.kts)`, `gradlew`, `AndroidManifest.xml`, `gradle/libs.versions.toml`.
- **Commands:** `./gradlew tasks`, `assembleDebug`, `testDebugUnitTest`, `connectedAndroidTest`, `lint`, `detekt`/`ktlint` if present, CI.
- **Traps:** module list in `settings.gradle`, build variants and flavors, instrumented tests needing an emulator, generated code (Room, Hilt/Dagger, KSP/KAPT, protobuf), `local.properties` and keystores must not be committed.

## Dart / Flutter

- **Detect:** `pubspec.yaml`, `pubspec.lock`, `analysis_options.yaml`, `melos.yaml` (monorepo), `lib/`, platform folders (`android/`, `ios/`).
- **Commands:** `flutter pub get`, `flutter analyze`, `flutter test`, `dart format`, and `dart run build_runner build` when codegen is used. Melos scripts for monorepos. FVM version pin if `.fvm` exists.
- **Traps:** generated files (`*.g.dart`, `*.freezed.dart`) must not be hand-edited, platform folders are Android/iOS projects with their own traps (see above), SDK/channel pin.

## C / C++ / Bazel

- **Detect:** `CMakeLists.txt`/`CMakePresets.json`, `meson.build`, `configure.ac`/`Makefile`, `conanfile.*`, `vcpkg.json`, Bazel: `MODULE.bazel`, `WORKSPACE`, `BUILD`/`BUILD.bazel`, `.bazelrc`, `.bazelversion`.
- **Commands:** presets (`cmake --preset`), `ctest`, `bazel build //...`, `bazel test //...`, `bazel query` to discover targets. `.bazelrc` configs (`--config=...`), `.clang-format`, `.clang-tidy`, CI.
- **Traps:** out-of-source build directory, toolchain and compiler versions, `bazel-*` symlinks are output (ignore), target label syntax, sanitizer/debug configs, generated headers, third-party dependency fetching.

---

## Cross-cutting traps

Look for these regardless of stack; each is a high-value `AGENTS.md` line when present.

- Generated or vendored code that must not be hand-edited, with the regeneration command
- Required ordering (codegen before build, migrate before test, internal packages built first)
- Tests that need external services (database, emulator, containers) and how to start them
- Slow or flaky suites and the fast-path command for single-target runs
- Version pins (SDK, runtime, toolchain) and the file that declares them
- Files that must never be committed (keystores, `.env`, `local.properties`, provisioning profiles)
