# GitHub Actions Workflow Syntax Reference

This reference covers the syntax, triggers, environment variables, expressions, and execution flow of GitHub Actions workflows defined in `.github/workflows/*.yml`.

---

## 1. Top-Level Workflow Structure

A valid GitHub Actions workflow YAML file requires `on:` (triggers) and `jobs:`.

```yaml
name: CI & Quality Check

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
    inputs:
      debug_enabled:
        description: 'Enable debug mode'
        required: false
        default: 'false'

permissions:
  contents: read

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
```

---

## 2. Triggers (`on:`)

Workflows can be triggered by repository events, manual dispatches, or scheduled cron events.

### Common Event Triggers
- **Push / Pull Request**:
  ```yaml
  on:
    push:
      branches: [ "main", "release/*" ]
      paths-ignore: [ "**.md", "docs/**" ]
    pull_request:
      types: [ opened, synchronize, reopened ]
  ```
- **Manual Execution (`workflow_dispatch`)**:
  ```yaml
  on:
    workflow_dispatch:
      inputs:
        environment:
          type: choice
          description: Target environment
          options:
            - staging
            - production
  ```
- **Scheduled (`schedule`)**:
  ```yaml
  on:
    schedule:
      - cron: '0 2 * * *' # Every day at 02:00 UTC
  ```

---

## 3. Scoped Permissions (`permissions:`)

Always set minimal permissions to follow the principle of least privilege.

```yaml
permissions:
  contents: read          # Access code
  pull-requests: write    # Comment on PRs
  id-token: write         # OIDC authentication (AWS, GCP, Vault)
  issues: write           # Interact with issues
```

Set top-level permissions to `read-all` or `{}` and grant explicit permissions per job:

```yaml
permissions: {}

jobs:
  test:
    permissions:
      contents: read
    runs-on: ubuntu-latest
    steps: ...
```

---

## 4. Jobs & Strategy Matrix

Jobs run concurrently by default unless chained with `needs:`.

### Matrix Builds & Parallel Execution
```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ ubuntu-latest, macos-latest ]
        node-version: [ 18.x, 20.x ]
        exclude:
          - os: macos-latest
            node-version: 18.x
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

### Job Dependencies (`needs:`)
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps: ...

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps: ...
```

---

## 5. Expressions & Contexts

GitHub Actions supports expressions using `${{ <expression> }}`.

### Context Objects
- `github`: Information about the workflow run (e.g. `github.sha`, `github.ref`, `github.actor`, `github.event_name`).
- `env`: Environment variables set in workflow/job/step.
- `vars`: Repository/organization variables.
- `secrets`: Encrypted secrets (e.g. `secrets.GITHUB_TOKEN`, `secrets.DEPLOY_KEY`).
- `inputs`: Inputs provided to `workflow_dispatch` or `workflow_call`.
- `matrix`: Current matrix configuration.

### Useful Functions
- `always()`: Forces step execution even if previous steps failed.
- `failure()`: Executes when any previous step failed.
- `cancelled()`: Executes if workflow was manually cancelled.
- `contains(search, item)`: Checks substring or array item.
- `format('Hello {0}', 'World')`: String formatting.

Example conditional step:
```yaml
- name: Post Failure Notification
  if: failure()
  run: echo "Job failed!"
```

---

## 6. Environment Variables & Secrets

Passing variables and masking secrets safely:

```yaml
jobs:
  run-script:
    runs-on: ubuntu-latest
    env:
      GLOBAL_VAR: "my-value"
    steps:
      - name: Run python script
        env:
          API_KEY: ${{ secrets.MY_API_KEY }}
          PR_TITLE: ${{ github.event.pull_request.title }}
        run: python3 script.py
```
