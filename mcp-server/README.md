# AI Library MCP server

An MCP server that finds MCP servers. Lets your assistant search the
[AI Library](https://mcp-skills-hub.netlify.app) directory and hand back
ready-to-paste install configs, without you leaving the conversation.

## Install

```bash
claude mcp add ai-library -- npx -y @ai-library/mcp
```

<details>
<summary>Other clients</summary>

```json
{
  "mcpServers": {
    "ai-library": { "command": "npx", "args": ["-y", "@ai-library/mcp"] }
  }
}
```
</details>

## Tools

| Tool | Purpose |
| --- | --- |
| `search_mcp_servers` | Find servers by keyword or use case; returns launch config and trust signals |
| `search_skills` | Find Agent Skills by keyword or use case |
| `get_install_config` | Full install configuration for one server, by slug |

## Notes

Reads the site's public JSON API at request time, so results track the daily
data refresh. Point it elsewhere with `AI_LIBRARY_URL`.

Zero runtime dependencies — it speaks JSON-RPC over stdio directly.
