# .kiro/settings/ — Kiro IDE Settings

## ⚠️ File MCP config phải đặt tại đây, KHÔNG phải .kiro/mcp/

### mcp.json — MCP Server configuration

Format chuẩn:
```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "npx",
      "args": ["-y", "<package-name>"],
      "env": {
        "API_KEY": "${ENV_VAR_NAME}"
      }
    }
  }
}
```

### Cách bật MCP trong Kiro IDE

1. Tạo / chỉnh sửa `.kiro/settings/mcp.json`
2. Mở Settings: `Cmd+,` (Mac) hoặc `Ctrl+,` (Windows/Linux)
3. Tìm kiếm "MCP"
4. Bật toggle **MCP support**
5. Kiểm tra: Kiro panel → tab **MCP Servers**

### MCP servers phổ biến

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL}"]
    },
    "gitlab": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gitlab"],
      "env": {
        "GITLAB_PERSONAL_ACCESS_TOKEN": "${GITLAB_TOKEN}",
        "GITLAB_API_URL": "https://gitlab.com"
      }
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

### Remote MCP (HTTP) — Kiro v0.5+

```json
{
  "mcpServers": {
    "stripe": {
      "url": "https://mcp.stripe.com",
      "headers": {
        "Authorization": "Bearer ${STRIPE_API_KEY}"
      }
    }
  }
}
```

### Troubleshoot

Nếu MCP không load:
- Kiểm tra file đúng path: `.kiro/settings/mcp.json` (không phải `.kiro/mcp/`)
- Bật MCP support trong Settings
- Xem log: Help → Toggle Developer Tools → Console
- Kiro panel → MCP Servers tab → kiểm tra status
