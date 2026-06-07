# VS Code config reference (migrate-to-monorepo, decision D8)

Final concrete contents for the chosen `.vscode` / workspace layout (post-merge paths).

### `saasmint.code-workspace` (repo root)

```jsonc
{
  "folders": [
    { "name": "core", "path": "core" },
    { "name": "app", "path": "app" },
    { "name": "root", "path": "." }
  ],
  "settings": {
    "files.exclude": { "core": true, "app": true },
    "python.defaultInterpreterPath": "${workspaceFolder:core}/.venv/bin/python",
    "python.terminal.activateEnvironment": false,
    "search.exclude": {
      "**/.next": true,
      "**/.venv": true,
      "**/node_modules": true,
      "**/staticfiles": true
    },
    "files.associations": { "*.env.local": "dotenv", ".env.base": "dotenv" }
  },
  "extensions": {
    "recommendations": [
      "ms-python.python",
      "ms-python.vscode-pylance",
      "ms-python.debugpy",
      "charliermarsh.ruff",
      "ms-python.mypy-type-checker",
      "batisteo.vscode-django",
      "ms-azuretools.vscode-docker",
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "vitest.explorer",
      "bradlc.vscode-tailwindcss",
      "mikestead.dotenv"
    ]
  },
  "tasks": {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "Run Everything Local",
        "dependsOn": ["backend: make dev", "frontend: pnpm dev"],
        "dependsOrder": "parallel",
        "group": { "kind": "build", "isDefault": true },
        "problemMatcher": []
      },
      {
        "label": "backend: make dev",
        "type": "shell",
        "command": "make dev",
        "options": { "cwd": "${workspaceFolder:root}" },
        "isBackground": true,
        "presentation": { "group": "saasmint-dev", "panel": "dedicated", "reveal": "always" },
        "problemMatcher": {
          "owner": "docker",
          "pattern": [{ "regexp": ".", "file": 1, "location": 2, "message": 3 }],
          "background": {
            "activeOnStart": true,
            "beginsPattern": ".*(Building|Creating|Recreating|Starting).*",
            "endsPattern": ".*(Application startup complete|Uvicorn running on).*"
          }
        }
      },
      {
        "label": "frontend: pnpm dev",
        "type": "shell",
        "command": "pnpm",
        "args": ["dev"],
        "options": { "cwd": "${workspaceFolder:app}" },
        "isBackground": true,
        "presentation": { "group": "saasmint-dev", "panel": "dedicated", "reveal": "always" },
        "problemMatcher": {
          "owner": "next",
          "pattern": [{ "regexp": ".", "file": 1, "location": 2, "message": 3 }],
          "background": {
            "activeOnStart": true,
            "beginsPattern": ".*(Starting|compiling).*",
            "endsPattern": ".*Ready in.*"
          }
        }
      },
      {
        "label": "backend: make dev (debugpy)",
        "type": "shell",
        "command": "make stop; docker compose -p saasmint-debug -f docker-compose.yml -f infra/docker-compose.debug.yml up --build",
        "options": { "cwd": "${workspaceFolder:root}" },
        "isBackground": true,
        "presentation": { "group": "saasmint-dev", "panel": "dedicated", "reveal": "always" },
        "problemMatcher": {
          "owner": "docker",
          "pattern": [{ "regexp": ".", "file": 1, "location": 2, "message": 3 }],
          "background": {
            "activeOnStart": true,
            "beginsPattern": ".*(Building|Creating|Recreating|Starting).*",
            "endsPattern": ".*(Waiting for client to attach|listening|Uvicorn running on|Application startup complete).*"
          }
        }
      },
      {
        "label": "backend: stop",
        "type": "shell",
        "command": "make stop",
        "options": { "cwd": "${workspaceFolder:root}" },
        "problemMatcher": []
      }
    ]
  },
  "launch": {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Frontend: next dev (--inspect)",
        "type": "node",
        "request": "launch",
        "cwd": "${workspaceFolder:app}",
        "runtimeExecutable": "pnpm",
        "runtimeArgs": [
          "exec", "dotenv", "-e", "../.env.local", "--",
          "next", "dev", "--turbo", "--experimental-https",
          "--experimental-https-key", "../infra/certs/localhost-key.pem",
          "--experimental-https-cert", "../infra/certs/localhost.pem",
          "--experimental-https-ca", "../infra/certs/rootCA.pem"
        ],
        "env": {
          "NODE_EXTRA_CA_CERTS": "../infra/certs/rootCA.pem",
          "NODE_OPTIONS": "--no-warnings"
        },
        "autoAttachChildProcesses": true,
        "console": "integratedTerminal",
        "serverReadyAction": {
          "pattern": "(https?://localhost:3000\\S*)",
          "uriFormat": "%s",
          "action": "debugWithChrome"
        },
        "skipFiles": ["<node_internals>/**", "${workspaceFolder:app}/.next/**"]
      },
      {
        "name": "Frontend: attach to running next dev",
        "type": "node",
        "request": "attach",
        "port": 9229,
        "restart": true,
        "cwd": "${workspaceFolder:app}",
        "skipFiles": ["<node_internals>/**", "${workspaceFolder:app}/.next/**"]
      },
      {
        "name": "Backend: attach debugpy (start stack)",
        "type": "debugpy",
        "request": "attach",
        "connect": { "host": "127.0.0.1", "port": 5678 },
        "pathMappings": [
          { "localRoot": "${workspaceFolder:core}", "remoteRoot": "/app" }
        ],
        "django": true,
        "justMyCode": false,
        "preLaunchTask": "backend: make dev (debugpy)"
      },
      {
        "name": "Backend: attach debugpy (already running)",
        "type": "debugpy",
        "request": "attach",
        "connect": { "host": "127.0.0.1", "port": 5678 },
        "pathMappings": [
          { "localRoot": "${workspaceFolder:core}", "remoteRoot": "/app" }
        ],
        "django": true,
        "justMyCode": false
      }
    ],
    "compounds": [
      {
        "name": "Run Everything Local (debug both)",
        "configurations": [
          "Backend: attach debugpy (start stack)",
          "Frontend: next dev (--inspect)"
        ],
        "stopAll": true
      }
    ]
  }
}
```

### `core/.vscode/settings.json`

```jsonc
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.terminal.activateEnvironment": false,
  "python.languageServer": "Pylance",
  "python.analysis.typeCheckingMode": "basic",
  "python.analysis.extraPaths": ["${workspaceFolder}", "${workspaceFolder}/core"],
  "ruff.importStrategy": "fromEnvironment",
  "ruff.interpreter": ["${workspaceFolder}/.venv/bin/python"],
  "mypy-type-checker.importStrategy": "fromEnvironment",
  "mypy-type-checker.interpreter": ["${workspaceFolder}/.venv/bin/python"],
  "mypy-type-checker.cwd": "${workspaceFolder}",
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "python.testing.cwd": "${workspaceFolder}",
  "python.testing.pytestArgs": ["-c", "pyproject.toml"],
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports.ruff": "explicit",
      "source.fixAll.ruff": "explicit"
    }
  },
  "files.exclude": {
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/.mypy_cache": true,
    "**/.ruff_cache": true,
    "staticfiles": true
  },
  "files.watcherExclude": {
    "**/.venv/**": true,
    "**/staticfiles/**": true,
    "**/media/**": true,
    "**/.mypy_cache/**": true,
    "**/.ruff_cache/**": true,
    "**/.pytest_cache/**": true
  }
}
```

Notes: `python.analysis.extraPaths` includes BOTH `${workspaceFolder}` (resolves `config`/`apps`/`middleware`) and `${workspaceFolder}/core` (resolves the editable `saasmint_core` package that physically lives at `core/core/saasmint_core/`). `ruff.configuration` is intentionally omitted so ruff auto-discovers the nearest `pyproject.toml` per file (`core/core/pyproject.toml` for the lib, `core/pyproject.toml` elsewhere). `ruff.interpreter`/`mypy-type-checker.interpreter` are arrays per the extension schema.

### `app/.vscode/settings.json`

```jsonc
{
  "eslint.workingDirectories": [{ "mode": "location" }],
  "eslint.runtime": "node",
  "prettier.prettierPath": "${workspaceFolder}/node_modules/prettier",
  "typescript.tsdk": "${workspaceFolder}/node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "vitest.rootConfig": "${workspaceFolder}/vitest.config.ts",
  "npm.packageManager": "pnpm",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "files.exclude": { "**/.next": true, "**/.turbo": true },
  "files.watcherExclude": {
    "**/.next/**": true,
    "**/.turbo/**": true,
    "**/node_modules/**": true
  }
}
```

Notes: a SINGLE `eslint.workingDirectories` definition lives here (`{ "mode": "location" }`); the workspace file does NOT define it. `eslint.useFlatConfig` is unnecessary under ESLint 9 (flat `eslint.config.js` is auto-detected) and is omitted.

### `infra/docker-compose.debug.yml`

```yaml
services:
  django:
    entrypoint: ["/app/infra/entrypoint.debug.sh"]
    ports:
      - "8001:8001"
      - "5678:5678"
    environment:
      DEBUGPY_WAIT_FOR_CLIENT: "0"
```

### `core/infra/entrypoint.debug.sh` (chmod +x; bind-mounted to `/app/infra`)

```bash
#!/usr/bin/env bash
set -euo pipefail

if [ "${DJANGO_SETTINGS_MODULE:-}" = "config.settings.dev" ]; then
  echo "==> Running Django migrations..."
  uv run python manage.py migrate --no-input
  echo "==> Seeding dev data and syncing Stripe catalog..."
  uv run python manage.py seed_dev_data --sync-stripe
fi

WAIT=""
[ "${DEBUGPY_WAIT_FOR_CLIENT:-0}" = "1" ] && WAIT="--wait-for-client"

# debugpy is NOT a pyproject dep -> pull it in ephemerally with `uv run --with`.
# No --reload: the reloader child breaks the attach and drops breakpoints.
exec uv run --with debugpy python -m debugpy --listen 0.0.0.0:5678 $WAIT \
  -m uvicorn config.asgi:application --host 0.0.0.0 --port "${DJANGO_PORT:-8001}" \
  --log-config /app/infra/uvicorn-log-config.json
```

### `app/package.json` — corrected `dev` script + new devDependency

```jsonc
{
  "scripts": {
    "dev": "dotenv -e ../.env.local -- next dev --turbo --experimental-https --experimental-https-key ../infra/certs/localhost-key.pem --experimental-https-cert ../infra/certs/localhost.pem --experimental-https-ca ../infra/certs/rootCA.pem"
  },
  "devDependencies": {
    "dotenv-cli": "^7.4.4"
  }
}
```

Notes: `NODE_EXTRA_CA_CERTS=../infra/certs/rootCA.pem` is provided through the launch `env`; if you also want `pnpm dev` from a plain terminal to trust the CA, keep `NODE_EXTRA_CA_CERTS=../infra/certs/rootCA.pem` prefixed in the script. The frontend env file (`../.env.local`'s frontend slice) must contain ONLY `NEXT_PUBLIC_*` keys; backend secrets stay in the compose `env_file` for django and are never injected into the Next process.

Deleted/superseded: `core/.vscode/launch.json` (old single `make dev`) and `app/.vscode/launch.json` (old `pnpm dev` + `pnpm dev (debug)` with stale `../saasmint-core/infra/certs/...` paths).
