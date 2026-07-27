# Jira Sync via MCP (Model Context Protocol)

When a Jira MCP server is active in the environment, use it to sync backlog items directly to your Jira project boards.

---

## 1. Tool Identification
Verify the presence of Jira MCP tools in your tool definitions. Typical tool names include:
*   `jira/create_issue` or `create_issue`
*   `jira/search_issues` or `search_issues`
*   `jira/update_issue` or `update_issue`

---

## 2. Invoking the Jira Issue Creation Tool
Call the issue creation tool for each user story and key technical task defined in Docusaurus.

### Expected Tool Parameter Format
Format the tool call with clean parameter maps. Below is an example payload representing the typical tool schema:

```json
{
  "projectKey": "PROJ",
  "summary": "[MVP-1] Security: Setup Auth Rate Limiting",
  "description": "*User Story*\nAs an API developer, I want to rate-limit login attempts so that our backend is protected from brute-force credentials scanning.\n\n*Acceptance Criteria*\n*Given* the login endpoint /api/auth/login is public\n*When* an IP address makes more than 5 requests per minute\n*Then* return HTTP 429 Too Many Requests.\n\n*Technical Tasks*\n- [ ] Configure rate-limiting middleware.\n- [ ] Add integration tests for rate limits.\n- [ ] Monitor rate-limit hits in console.",
  "issueType": "Story",
  "priority": "High",
  "labels": ["security", "mvp-1"]
}
```

*Note: Ensure to use Jira-style wiki markup (like `*bold*` or `*Given*`) inside the description string as Jira Markdown rendering depends on the project's editor style.*

---

## 3. Fallback Methods (If MCP is Inactive)

If Jira MCP tools are not found in the environment:

### Fallback A: Bulk CSV Template
Generate a CSV file named `scratch/jira_import.csv` so the user can import it using Jira's **Bulk Import** wizard:
```csv
Summary,Issue Type,Priority,Description,Labels
"[Sec-1.1] Setup JWT Auth",Story,High,"*User Story*\nAs a user...\n\n*Acceptance Criteria*\nGiven...",security,mvp-1
"[Fun-2.1] Core Dashboard",Story,Medium,"*User Story*\nAs a user...\n\n*Acceptance Criteria*\nGiven...",ui,mvp-1
```

### Fallback B: Copy-Paste Jira Wiki Markup
Print formatted Jira Wiki Markup to the terminal so the user can copy-paste stories directly into their Jira editor.
*   **Headers**: `h1. `, `h2. `, `h3. `
*   **Lists**: `* ` for bulleted, `# ` for numbered
*   **Formatting**: `*bold*`, `_italics_`, `+underlined+`
