const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const server = new Server({ name: 'terminal-server', version: '1.0.0' }, { capabilities: { tools: {} } });

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'run_terminal_command',
        description: 'Run any shell command on the server. Use this for checking dependencies, installing packages, running curl, python commands, etc. Be careful with destructive commands.',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The shell command to execute (e.g. "pip list", "curl https://example.com", "python -m pip install requests")'
            },
            timeout: {
              type: 'number',
              description: 'Timeout in milliseconds (default 120000 = 2 minutes)'
            }
          },
          required: ['command']
        }
      }
    ]
  };
});

// Execute terminal command
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'run_terminal_command') {
    const command = args?.command;
    const timeout = args?.timeout || 120000;

    if (!command) {
      return { content: [{ type: 'text', text: 'Error: No command provided' }] };
    }

    return new Promise((resolve) => {
      exec(command, { timeout }, (error, stdout, stderr) => {
        let output = '';

        if (stdout) output += `STDOUT:\n${stdout}\n`;
        if (stderr) output += `STDERR:\n${stderr}\n`;
        if (error) output += `ERROR: ${error.message}\n`;

        if (!output) output = 'Command executed with no output.';

        resolve({ content: [{ type: 'text', text: output }] });
      });
    });
  }

  return { content: [{ type: 'text', text: 'Unknown tool' }] };
});

// SSE endpoint
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

app.post('/messages', express.json(), (req, res) => res.sendStatus(200));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Terminal MCP Server running on port ${PORT}`));