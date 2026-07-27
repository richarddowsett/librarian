# Product Owner AI Skill for Antigravity

This repository contains a reusable **Product Owner AI Skill** designed for [Google Antigravity](https://antigravity.google). It empowers your AI agent to act as a strategic, security-minded Product Owner.

---

## Features

1.  **Security-First Prioritization**: Guides the agent to prioritize Phase 1 (Security & Foundation), followed by Phase 2 (Functional Core & UI), and finally Phase 3 (AI & Advanced Enhancements).
2.  **Docusaurus Documentation**: Automates writing project specs and roadmaps in valid Markdown with Docusaurus frontmatter.
3.  **Task Manager Integration**: Instructs the agent on how to sync stories and tasks directly to **GitHub Issues** (via `gh` CLI) or **Jira** (via REST APIs, CSVs, or wiki markup).

---

## Repository Structure

```text
product-owner-skill/
├── README.md                 # Setup and usage guide
├── SKILL.md                  # Main Antigravity skill instruction file
└── references/               # Skill sub-documentation and templates
    ├── github_setup.md       # Integration guide for GitHub Issues
    ├── jira_setup.md         # Integration guide for Jira Tickets
    ├── mvp_template.md       # Docusaurus-compatible MVP Spec template
    └── roadmap_template.md   # Docusaurus-compatible Product Roadmap template
```

---

## Installation & Setup

You can use this skill in two ways depending on your needs.

### Option 1: Global Installation (Available across all local workspaces)
Copy the skill files into your global Antigravity configuration directory:

```bash
mkdir -p ~/.gemini/config/skills/product-owner
cp SKILL.md ~/.gemini/config/skills/product-owner/
cp -r references/ ~/.gemini/config/skills/product-owner/references/
```

### Option 2: Workspace-Specific Installation (Included in a Git repo)
Add it directly to a project's repository so anyone checking out the repository can use it:

```bash
mkdir -p .agents/skills/product-owner
cp -r /path/to/product-owner-skill/* .agents/skills/product-owner/
```

---

## How to Trigger the Skill

Once installed, the AI agent will automatically detect and load the skill when you ask relevant product planning prompts:
*   *"Help me plan the roadmap for our new project."*
*   *"Write the MVP specification for our user profile page."*
*   *"Groom the backlog and create tasks for the authentication feature."*
*   *"Sync the current MVP-1 backlog to GitHub Issues."*

---

## Storing in GitHub & Using on Other Machines

Since you want to share this skill across machines:

1.  **Initialize Git & Publish to GitHub**:
    ```bash
    cd /Users/richarddowsett/development/product-owner-skill
    git init
    git add .
    git commit -m "Initial commit: Product Owner AI Skill"
    # Create a repository on GitHub (e.g., github.com/username/product-owner-skill)
    git remote add origin git@github.com:<your-username>/product-owner-skill.git
    git branch -M main
    git push -u origin main
    ```

2.  **Using on other machines**:
    Whenever you are on a new machine, clone this repo:
    ```bash
    git clone git@github.com:<your-username>/product-owner-skill.git
    ```
    Then run the copy command to install it globally (Option 1 above) or copy it into your workspace (Option 2 above).
