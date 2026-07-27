# GitHub Issue Sync via MCP (Model Context Protocol)

When the GitHub MCP server is active in the environment, use it to sync backlog items directly rather than running shell commands or using local Git CLI configurations.

---

## 1. Tool Identification
Verify the presence of GitHub MCP tools in your tool definitions. Typical tool names include:
*   `github/create_issue` or `create_issue`
*   `github/list_issues` or `list_issues`
*   `github/get_issue` or `get_issue`
*   `github/update_issue` or `update_issue`

---

## 2. Invoking the Issue Creation Tool
Call the creation tool for each user story and key technical task defined in Docusaurus.

### Expected Tool Parameter Format
Format the tool call with clean parameter maps. Below is an example payload representing the typical tool schema:

```json
{
  "owner": "repository-owner-username",
  "repo": "repository-name",
  "title": "[MVP-1] Security: Implement JWT Session Storage & Secure Cookies",
  "body": "### User Story\nAs a registered user, I want my session to be stored in an encrypted JWT cookie so that my session cannot be hijacked.\n\n### Acceptance Criteria\n**Given** a user logs in successfully\n**When** the server issues a session token\n**Then** it is written to a cookie with flags: `HttpOnly`, `Secure`, and `SameSite=Strict`.\n\n### Tasks\n- [ ] Configure JWT signing using private keys.\n- [ ] Setup cookie validation middleware.\n- [ ] Audit cookie headers.",
  "labels": ["security", "mvp-1", "priority:high"]
}
```

---

## 3. Best Practices for MCP-Based Syncing
1.  **Extract Repo Info**: Automatically extract the repository `owner` and `repo` name from the project's local `.git/config` file (check Git remote urls).
2.  **Verify Before Call**: Check if the issue already exists by calling `github/list_issues` or `github/search_issues` with the title to avoid creating duplicates.
3.  **Cross-reference Docs**: In the issue body, reference the corresponding Docusaurus file path in the workspace (e.g. `Ref: docs/product/stories/jwt-auth.md`) so developers can easily find full specifications.
