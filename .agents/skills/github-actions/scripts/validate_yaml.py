#!/usr/bin/env python3
"""
GitHub Actions YAML & Schema Validator

Validates YAML syntax and GitHub Actions structural rules for workflow files (.github/workflows/*.yml)
and custom action metadata files (action.yml / action.yaml).

Usage:
    python3 scripts/validate_yaml.py <path-to-yaml-file-or-directory>
"""

import os
import sys
import re
import subprocess
import json
from pathlib import Path

# Color terminal helpers
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"

def print_info(msg):
    print(f"{BLUE}[INFO]{RESET} {msg}")

def print_success(msg):
    print(f"{GREEN}[SUCCESS]{RESET} {msg}")

def print_warning(msg):
    print(f"{YELLOW}[WARNING]{RESET} {msg}")

def print_error(msg):
    print(f"{RED}[ERROR]{RESET} {msg}")

def check_basic_yaml_rules(content, filepath):
    """Basic line-by-line YAML sanity checks."""
    errors = []
    warnings = []
    lines = content.splitlines()

    for idx, line in enumerate(lines, 1):
        # Rule: No hard tab indentation in YAML
        if re.match(r'^\s*\t+', line):
            errors.append(f"Line {idx}: Indentation contains tab characters. Use 2 spaces instead of tabs.")

    return errors, warnings

def parse_yaml_content(filepath):
    """Attempt YAML parsing using PyYAML, node js-yaml, or python fallback."""
    # 1. Try python pyyaml if installed
    try:
        import yaml
        with open(filepath, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        return data, None
    except ImportError:
        pass
    except Exception as e:
        return None, f"YAML Syntax Error (PyYAML): {str(e)}"

    # 2. Try node / js-yaml via npx if available
    try:
        cmd = ["npx", "-y", "js-yaml", str(filepath)]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                return data, None
            except json.JSONDecodeError:
                return {}, None
        else:
            return None, f"YAML Syntax Error: {result.stderr.strip()}"
    except Exception:
        pass

    # 3. Fallback: try yamllint if installed
    yamllint_paths = ["yamllint", "/Users/richarddowsett/Library/Python/3.9/bin/yamllint"]
    for ypath in yamllint_paths:
        try:
            res = subprocess.run([ypath, "-d", "relaxed", str(filepath)], capture_output=True, text=True)
            if res.returncode != 0 and ("error" in res.stdout.lower() or "error" in res.stderr.lower()):
                return None, f"yamllint found syntax issues:\n{res.stdout}"
            elif res.returncode == 0:
                return {}, None
        except Exception:
            continue

    print_warning("No external YAML parser available. Performing regex lint checks.")
    return {}, None

def validate_github_workflow_schema(data, content, filepath):
    """Validates structural rules for GitHub Actions workflow files."""
    errors = []
    warnings = []

    if isinstance(data, dict) and data:
        if "on" not in data and True not in data: # YAML 'on' can parse as boolean True!
            errors.append("Workflow is missing required top-level key 'on:' (triggers).")
        if "jobs" not in data:
            errors.append("Workflow is missing required top-level key 'jobs:'.")
        
        jobs = data.get("jobs", {})
        if isinstance(jobs, dict):
            if not jobs:
                errors.append("'jobs:' section cannot be empty.")
            for job_id, job_def in jobs.items():
                if not isinstance(job_def, dict):
                    errors.append(f"Job '{job_id}' definition must be a mapping/object.")
                    continue
                
                if "runs-on" not in job_def and "uses" not in job_def:
                    errors.append(f"Job '{job_id}' must specify either 'runs-on:' or 'uses:'.")
                
                if "runs-on" in job_def:
                    steps = job_def.get("steps", [])
                    if not isinstance(steps, list) or len(steps) == 0:
                        errors.append(f"Job '{job_id}' has no 'steps:' defined.")
                    else:
                        for step_idx, step in enumerate(steps, 1):
                            if not isinstance(step, dict):
                                errors.append(f"Job '{job_id}' step {step_idx} is invalid.")
                                continue
                            if "uses" not in step and "run" not in step:
                                errors.append(f"Job '{job_id}' step {step_idx} ('{step.get('name', 'unnamed')}') must specify either 'uses:' or 'run:'.")

        if "permissions" not in data:
            warnings.append("Top-level 'permissions:' key is missing. Consider declaring minimal explicit permissions (e.g. permissions: contents: read).")

    lines = content.splitlines()
    for idx, line in enumerate(lines, 1):
        uses_match = re.search(r'uses:\s*([^\s#]+)', line)
        if uses_match:
            action_ref = uses_match.group(1)
            if not action_ref.startswith("./") and "@" in action_ref:
                action_name, version_tag = action_ref.split("@", 1)
                if not re.match(r'^[0-9a-f]{40}$', version_tag, re.IGNORECASE):
                    warnings.append(f"Line {idx}: Action '{action_ref}' uses tag/branch '{version_tag}'. Pinning to a full 40-character commit SHA is recommended for security.")

        if "run:" in line and "${{" in line:
            if any(untrusted in line for untrusted in ["github.event.issue.title", "github.event.issue.body", "github.event.comment.body", "github.event.pull_request.title"]):
                warnings.append(f"Line {idx}: Potential script injection! Avoid direct ${{ ... }} interpolation in 'run:' steps for untrusted inputs. Use environment variables ('env:') instead.")

    return errors, warnings

def validate_custom_action_schema(data, content, filepath):
    """Validates structural rules for custom action files (action.yml)."""
    errors = []
    warnings = []

    if isinstance(data, dict) and data:
        if "name" not in data:
            errors.append("Custom action metadata missing required key 'name:'.")
        if "description" not in data:
            errors.append("Custom action metadata missing required key 'description:'.")
        if "runs" not in data:
            errors.append("Custom action metadata missing required key 'runs:'.")
        else:
            runs = data.get("runs", {})
            if isinstance(runs, dict):
                using = runs.get("using")
                if not using:
                    errors.append("'runs:' section missing 'using:' key (e.g., 'using: composite' or 'using: node20').")
                elif using == "composite":
                    steps = runs.get("steps", [])
                    if not isinstance(steps, list) or len(steps) == 0:
                        errors.append("Composite action 'runs.steps:' must be a non-empty list.")
                    else:
                        for s_idx, step in enumerate(steps, 1):
                            if isinstance(step, dict) and "run" in step and "shell" not in step:
                                errors.append(f"Composite action step {s_idx} ('{step.get('name', 'unnamed')}') uses 'run:' but is missing explicit 'shell:' parameter.")

    return errors, warnings

def validate_file(filepath):
    """Validates a single YAML file."""
    filepath = Path(filepath).resolve()
    if not filepath.exists():
        print_error(f"File not found: {filepath}")
        return False

    print_info(f"Validating: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    basic_errors, basic_warnings = check_basic_yaml_rules(content, filepath)
    parsed_data, parse_error = parse_yaml_content(filepath)
    if parse_error:
        basic_errors.append(parse_error)

    filename = filepath.name.lower()
    is_action = filename in ["action.yml", "action.yaml"]
    is_workflow = ".github/workflows" in str(filepath).lower() or ("jobs" in content and "on" in content)

    schema_errors = []
    schema_warnings = []

    if is_action:
        schema_errors, schema_warnings = validate_custom_action_schema(parsed_data, content, filepath)
    elif is_workflow:
        schema_errors, schema_warnings = validate_github_workflow_schema(parsed_data, content, filepath)
    else:
        print_info("Generic YAML file detected (not recognized as workflow or action metadata).")

    all_errors = basic_errors + schema_errors
    all_warnings = basic_warnings + schema_warnings

    if all_warnings:
        for w in all_warnings:
            print_warning(w)

    if all_errors:
        for e in all_errors:
            print_error(e)
        print_error(f"FAILED: {filepath} ({len(all_errors)} errors, {len(all_warnings)} warnings)\n")
        return False
    else:
        print_success(f"PASSED: {filepath} (0 errors, {len(all_warnings)} warnings)\n")
        return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 validate_yaml.py <file-or-directory-path>")
        sys.exit(1)

    target_path = Path(sys.argv[1]).resolve()
    files_to_check = []

    if target_path.is_file():
        files_to_check.append(target_path)
    elif target_path.is_dir():
        for ext in ["*.yml", "*.yaml"]:
            files_to_check.extend(target_path.rglob(ext))
    else:
        print_error(f"Path does not exist: {target_path}")
        sys.exit(1)

    if not files_to_check:
        print_warning(f"No YAML files found in {target_path}")
        sys.exit(0)

    success_count = 0
    fail_count = 0

    for f in files_to_check:
        if validate_file(f):
            success_count += 1
        else:
            fail_count += 1

    print("=" * 50)
    print(f"Summary: {success_count} passed, {fail_count} failed out of {len(files_to_check)} files checked.")
    print("=" * 50)

    if fail_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
