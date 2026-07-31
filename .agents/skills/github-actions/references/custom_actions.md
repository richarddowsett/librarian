# Creating Custom GitHub Actions

Custom Actions allow packaging shell steps, JavaScript code, or Docker containers into reusable modules defined by an `action.yml` metadata file.

---

## 1. Action Metadata (`action.yml`) Structure

Every custom action must contain an `action.yml` or `action.yaml` in its root folder (or subfolder like `.github/actions/my-action/action.yml`).

```yaml
name: 'My Custom Action'
description: 'Concise explanation of what this action does'
author: 'Your Name or Org'

inputs:
  target-environment:
    description: 'Deployment target environment'
    required: true
    default: 'staging'

outputs:
  deployment-url:
    description: 'URL of deployed environment'

runs:
  using: 'composite'
  steps:
    - name: Run logic
      shell: bash
      run: |
        echo "Deploying to ${{ inputs.target-environment }}"
        echo "deployment-url=https://${{ inputs.target-environment }}.example.com" >> $GITHUB_OUTPUT
```

---

## 2. Action Types Comparison

| Type | Runtime | Best Used For | Key Requirement |
| :--- | :--- | :--- | :--- |
| **Composite Action** | Shell / Existing Actions | Combining multiple shell steps and actions into one module | `using: 'composite'`, explicit `shell:` on steps |
| **JavaScript Action** | Node.js engine | Complex API interactions, custom logic, cross-platform speed | `using: 'node20'`, `main: 'dist/index.js'` |
| **Docker Action** | Container runtime | OS-level dependencies, specific toolchains (Linux runners only) | `using: 'docker'`, `image: 'Dockerfile'` |

---

## 3. Composite Action Example

Location: `.github/actions/setup-toolchain/action.yml`

```yaml
name: 'Setup Toolchain & Cache'
description: 'Configures Python environment and installs dependencies with caching'

inputs:
  python-version:
    description: 'Python version to install'
    required: false
    default: '3.11'

runs:
  using: 'composite'
  steps:
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ inputs.python-version }}

    - name: Install dependencies
      shell: bash
      run: |
        python -m pip install --upgrade pip
        if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
```

### Calling Local Composite Action in Workflow
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run setup toolchain
        uses: ./.github/actions/setup-toolchain
        with:
          python-version: '3.12'
```

---

## 4. JavaScript Action Example

Structure:
```
my-js-action/
├── action.yml
├── index.js
└── package.json
```

`action.yml`:
```yaml
name: 'Slack Notifier'
description: 'Sends release notifications to Slack'
inputs:
  webhook-url:
    description: 'Slack Webhook URL'
    required: true
runs:
  using: 'node20'
  main: 'index.js'
```

`index.js`:
```javascript
const core = require('@actions/core');
const https = require('https');

try {
  const webhookUrl = core.getInput('webhook-url', { required: true });
  console.log('Sending notification...');
  // Logic here
  core.setOutput('status', 'success');
} catch (error) {
  core.setFailed(error.message);
}
```

---

## 5. Setting Outputs & Handling State
- Write step outputs to `$GITHUB_OUTPUT`:
  ```bash
  echo "result=success" >> $GITHUB_OUTPUT
  ```
- Write environment variables to `$GITHUB_ENV`:
  ```bash
  echo "BUILD_TIME=$(date)" >> $GITHUB_ENV
  ```
- Write path modifications to `$GITHUB_PATH`:
  ```bash
  echo "$HOME/.local/bin" >> $GITHUB_PATH
  ```
