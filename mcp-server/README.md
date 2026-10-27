# MCP Skills Hub MCP server

An MCP server that finds MCP servers. Lets your assistant search the
[MCP Skills Hub](https://mcp-skills-hub.vercel.app) directory and hand back
ready-to-paste install configs, without you leaving the conversation.

## Install

```bash
claude mcp add mcp-skills-hub -- npx -y mcp-skills-hub
```

<details>
<summary>Other clients</summary>

```json
{
  "mcpServers": {
    "mcp-skills-hub": {
      "command": "npx",
      "args": ["-y", "mcp-skills-hub"]
    }
  }
}
```
</details>

Until the package is published to npm, run it from a clone instead:
`node /absolute/path/to/mcp-server/index.mjs`.

## Tools

| Tool | Purpose |
| --- | --- |
| `search_mcp_servers` | Find servers by keyword or use case; returns launch config and trust signals |
| `search_skills` | Find Agent Skills by keyword or use case |
| `search_tools` | Find servers by the tools they expose, with input schemas |
| `get_install_config` | Full install configuration for one server, by slug |

## Notes

Reads the site's public JSON API at request time, so results track the daily
data refresh. Point it elsewhere with `MCP_SKILLS_HUB_URL` (the old
`AI_LIBRARY_URL` still works).

Zero runtime dependencies — it speaks JSON-RPC over stdio directly.

## Publishing

`mcpName` in package.json is the MCP Registry name. To list it:

```bash
cd mcp-server && npm publish
mcp-publisher login github && mcp-publisher publish
```
