# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for a security problem. Report it privately through
[GitHub security advisories](https://github.com/neeelbhavsar/mcp-skills-hub/security/advisories/new).
You'll get a reply within a few days.

In scope:

- The website, its JSON API and its generated configs (for example, a config that would run
  something other than the listed server)
- The data pipeline in `scripts/`
- The MCP server in `mcp-server/`

## A listed MCP server is malicious

MCP Skills Hub lists servers from public registries and doesn't vet them. If you believe a
listed server is malicious or impersonating another project, report it the same way. Please
also report it to the registry it was published on (the [MCP Registry](https://registry.modelcontextprotocol.io)
or npm), since that is where it can be taken down.
