# Using External Modules & Actions in GitHub Actions

GitHub Actions allows workflows to compose reusable building blocks called **Actions**. Actions can be official first-party modules maintained by GitHub, community marketplace actions, or local repo actions.

---

## 1. Popular Official GitHub Actions Modules

| Module Name | Purpose | Example Usage |
| :--- | :--- | :--- |
| `actions/checkout` | Check out repository code into `$GITHUB_WORKSPACE` | `uses: actions/checkout@v4` |
| `actions/setup-node` | Install Node.js & set up npm/yarn caching | `uses: actions/setup-node@v4` |
| `actions/setup-python` | Install Python & set up pip/pipenv caching | `uses: actions/setup-python@v4` |
| `actions/setup-go` | Install Go language tools & build cache | `uses: actions/setup-go@v4` |
| `actions/upload-artifact` | Upload build artifacts/logs for workflow runs | `uses: actions/upload-artifact@v4` |
| `actions/download-artifact` | Download artifacts created in prior jobs | `uses: actions/download-artifact@v4` |
| `actions/cache` | Cache arbitrary files (e.g. build dependencies) | `uses: actions/cache@v4` |
| `docker/setup-buildx-action` | Setup Docker Buildx for container building | `uses: docker/setup-buildx-action@v3` |
| `docker/login-action` | Log into Docker registries (GHCR, DockerHub) | `uses: docker/login-action@v3` |

---

## 2. Using External Modules

### Example: Setting up Node.js with Dependency Caching
```yaml
steps:
  - name: Checkout Code
    uses: actions/checkout@v4

  - name: Setup Node.js 20
    uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: 'npm'
      cache-dependency-path: 'package-lock.json'

  - name: Install & Test
    run: |
      npm ci
      npm test
```

### Example: Setting up Python with Pip Caching
```yaml
steps:
  - name: Checkout Code
    uses: actions/checkout@v4

  - name: Setup Python
    uses: actions/setup-python@v4
    with:
      python-version: '3.11'
      cache: 'pip'

  - name: Install dependencies
    run: |
      python -m pip install --upgrade pip
      pip install -r requirements.txt
```

---

## 3. Action Versioning & Commit SHA Pinning

When referencing external actions, you can specify versions via tag, branch, or 40-character commit SHA.

### Security Best Practice: Commit SHA Pinning
Major version tags (e.g., `@v4`) can be mutated by action maintainers. For supply chain security, pin third-party actions to an immutable commit SHA and add a comment indicating the release tag:

```yaml
# Recommended for production security:
- name: Checkout Code
  uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.7

- name: Setup Node.js
  uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
  with:
    node-version: 20
```

Automate SHA updates using tools like **Dependabot**:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## 4. Reusable Workflows (`workflow_call`)

Reusable workflows allow modularization across repositories or within `.github/workflows/`.

### Defining a Reusable Workflow (`.github/workflows/build-module.yml`)
```yaml
name: Reusable Build Module

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '20'
    secrets:
      NPM_TOKEN:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Calling a Reusable Workflow
```yaml
jobs:
  call-build:
    uses: ./.github/workflows/build-module.yml
    with:
      node-version: '20'
    secrets:
      NPM_TOKEN: ${{ secrets.MY_NPM_TOKEN }}
```
