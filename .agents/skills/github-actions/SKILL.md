---
name: github-actions
description: Expert AI skill for creating, editing, and hardening GitHub Actions workflows (.github/workflows/*.yml) and custom actions (action.yml). Provides guidance for using external module actions, pinning action versions, configuring strategy matrices, OIDC authentication, and automatically validating YAML syntax and schema integrity on every change.
---

# GitHub Actions AI Skill

This skill provides comprehensive instructions, standard patterns, security best practices, and automated validation for building and maintaining GitHub Actions workflows and custom actions.

---

## Core Capabilities & Responsibilities

When this skill is active, the agent must adhere to the following core responsibilities:

1. **Creating Workflows & Custom Actions**:
   - Write clean, robust `.github/workflows/*.yml` workflow files and `action.yml` custom action metadata.
   - Use standard GitHub Actions triggers (`push`, `pull_request`, `workflow_dispatch`, `schedule`).
   - Implement matrix builds, dependency caching, artifacts management, and environment secrets.

2. **Using External Modules & Actions**:
   - Utilize standard GitHub Actions modules (`actions/checkout`, `actions/setup-node`, `actions/setup-python`, `actions/upload-artifact`, etc.).
   - Follow version pinning best practices: use full 40-character commit SHAs for third-party actions to prevent supply-chain attacks.
   - Modularize complex pipelines using reusable workflows (`workflow_call`) and local composite actions (`./.github/actions/...`).

3. **Security Hardening**:
   - Always enforce top-level minimal permissions (`permissions: contents: read` or `{}`).
   - Avoid untrusted input script injection: never pass `${{ github.event... }}` directly in inline `run:` commands; pass via environment variables (`env:`).
   - Use OIDC authentication (`id-token: write`) instead of long-lived secrets when interacting with AWS, GCP, or Azure.

4. **MANDATORY YAML & Schema Validation**:
   - **For ANY creation or modification of a GitHub Actions YAML file**, the agent **MUST** run the validation check using:
     ```bash
     python3 scripts/validate_yaml.py <path-to-yaml-file>
     ```
   - If validation errors are detected, fix them immediately before concluding the task.

---

## Standard Development Workflow

When tasked with creating or modifying GitHub Actions files:

### Step 1: Consult Reference Documentation
Before writing workflow or action code, refer to the relevant offline guide:
- **Syntax & Triggers**: [references/workflow_syntax.md](references/workflow_syntax.md)
- **External Modules & Pinning**: [references/external_actions.md](references/external_actions.md)
- **Custom Actions (Composite/Node/Docker)**: [references/custom_actions.md](references/custom_actions.md)
- **Security & Injection Prevention**: [references/security_best_practices.md](references/security_best_practices.md)

### Step 2: Implement Workflow or Action
- Ensure indentation uses 2 spaces (no tabs).
- Ensure explicit `permissions:` block is defined.
- Ensure every step specifies either `uses:` or `run:`.
- For composite actions (`action.yml`), ensure all `run:` steps specify `shell:` (e.g. `shell: bash`).

### Step 3: Validate YAML Syntax & Schema (Required)
Run the validation script against the created/modified file:

```bash
python3 scripts/validate_yaml.py .github/workflows/my_workflow.yml
```

Verify that the script returns `[SUCCESS] PASSED` with 0 errors.

---

## References

- [Workflow Syntax & Expressions Reference](references/workflow_syntax.md)
- [Using External Modules & Action Pinning](references/external_actions.md)
- [Creating Custom Actions (`action.yml`)](references/custom_actions.md)
- [Security Hardening & Best Practices](references/security_best_practices.md)

---

## Examples

- [Complete CI/CD Matrix Workflow](examples/ci_cd_workflow.yml)
- [Reusable Workflow (`workflow_call`)](examples/reusable_workflow.yml)
- [Composite Custom Action (`action.yml`)](examples/composite_action/action.yml)
