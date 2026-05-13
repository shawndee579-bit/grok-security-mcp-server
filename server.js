const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

// ================== CONFIG ==================
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'mcp_9Kx7pL$mQv2!zR8nT4wY6uE3iO5pA';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_OWNER = 'shawndee579-bit';
const GITHUB_REPO = 'grok-security-mcp-server';
const COMMANDS_PATH = 'commands';

async function githubRequest(path) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

// ================== AUTH ==================
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const server = new Server({ name: 'terminal-server', version: '1.0.0' }, { capabilities: { tools: {} } });

// ================== TOOLS ==================
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_github_scripts',
        description: 'List all available scripts stored in the GitHub commands folder',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'run_terminal_command',
        description: 'Run any shell command. You can also run scripts from commands/ folder (e.g. python check_packages.py)',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command or script to run' },
            timeout: { type: 'number', description: 'Timeout in ms (default 120000)' }
          },
          required: ['command']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'list_github_scripts') {
    try {
      const folders = ['shell', 'python'];
      let result = '=== Available Scripts from GitHub ===\n\n';
      for (const folder of folders) {
        const files = await githubRequest(`${COMMANDS_PATH}/${folder}`);
        result += `--- ${folder.toUpperCase()} ---\n`;
        files.forEach(file => {
          if (file.type === 'file') result += `- ${file.name}\n`;
        });
        result += '\n';
      }
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
    }
  }

  if (name === 'run_terminal_command') {
    const command = args?.command;
    const timeout = args?.timeout || 120000;
    if (!command) return { content: [{ type: 'text', text: 'Error: No command provided' }] };

    return new Promise((resolve) => {
      exec(command, { timeout }, (error, stdout, stderr) => {
        let output = '';
        if (stdout) output += stdout;
        if (stderr) output += stderr;
        if (error) output += `Error: ${error.message}`;
        resolve({ content: [{ type: 'text', text: output || 'Command executed successfully.' }] });
      });
    });
  }

  return { content: [{ type: 'text', text: 'Unknown tool' }] };
});

// ================== DUMMY OAUTH ==================
app.get('/authorize', (req, res) => {
  const redirectUri = req.query.redirect_uri;
  const state = req.query.state;
  res.redirect(`${redirectUri}?code=dummy_code&state=${state}`);
});

app.post('/token', (req, res) => {
  res.json({ access_token: AUTH_TOKEN, token_type: 'Bearer', expires_in: 3600 });
});

app.get('/.well-known/oauth-protected-resource', (req, res) => {
  res.json({ resource: `https://${req.get('host')}` });
});

// ================== SSE ==================
app.get('/sse', authenticate, async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

app.post('/messages', authenticate, express.json(), (req, res) => res.sendStatus(200));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MCP Server running on port ${PORT}`));