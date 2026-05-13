const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

// Simple Bearer Token
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'mcp_9Kx7pL$mQv2!zR8nT4wY6uE3iO5pA';

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const server = new Server({ name: 'terminal-server', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'run_terminal_command',
        description: 'Run any shell command on the server. Full terminal access.',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string' },
            timeout: { type: 'number' }
          },
          required: ['command']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
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

// OAuth Protected Resource Metadata (helps Grok connect)
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  res.json({
    resource: `https://${req.get('host')}`,
    authorization_servers: [`https://${req.get('host')}`]
  });
});

// SSE endpoint with auth
app.get('/sse', authenticate, async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

app.post('/messages', authenticate, express.json(), (req, res) => res.sendStatus(200));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Terminal MCP Server running on port ${PORT}`));