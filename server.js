const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());

const ALLOWED_SCRIPTS = ['header_checker.py', 'simple_fuzzer.py'];

const server = new Server({ name: 'security-arsenal', version: '1.0.0' }, { capabilities: { tools: {} } });

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_security_scripts',
        description: 'Lists all available security scripts you can run.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'run_security_script',
        description: 'Runs one of your allowed security scripts against a target.',
        inputSchema: {
          type: 'object',
          properties: {
            script_name: { type: 'string', description: 'Exact script name (e.g. header_checker.py)' },
            target: { type: 'string', description: 'Target URL or IP' },
            extra_args: { type: 'string', description: 'Optional extra arguments' }
          },
          required: ['script_name', 'target']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'list_security_scripts') {
    return { content: [{ type: 'text', text: ALLOWED_SCRIPTS.join('\n') }] };
  }

  if (name === 'run_security_script') {
    const { script_name, target, extra_args = '' } = args || {};

    if (!ALLOWED_SCRIPTS.includes(script_name)) {
      return { content: [{ type: 'text', text: `Error: Script "${script_name}" is not allowed.` }] };
    }

    const scriptPath = path.join(__dirname, 'scripts', script_name);
    const cmd = `python3 "${scriptPath}" "${target}" ${extra_args}`;

    return new Promise((resolve) => {
      exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({ content: [{ type: 'text', text: `Error running script: ${error.message}` }] });
        } else {
          resolve({
            content: [{
              type: 'text',
              text: `=== Output from ${script_name} ===\n${stdout}\n${stderr ? 'STDERR:\n' + stderr : ''}`
            }]
          });
        }
      });
    });
  }

  return { content: [{ type: 'text', text: 'Unknown tool' }] };
});

// SSE endpoint for Grok
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

app.post('/messages', express.json(), (req, res) => {
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MCP Server running on port ${PORT}`));