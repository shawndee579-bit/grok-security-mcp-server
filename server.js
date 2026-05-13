const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());

const ALLOWED_SCRIPTS = ['header_checker.py', 'simple_fuzzer.py'];

const server = new Server({ name: 'security-arsenal', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      { name: 'list_security_scripts', description: 'List available security scripts', inputSchema: { type: 'object', properties: {} } },
      { name: 'run_security_script', description: 'Run a whitelisted security script', inputSchema: { type: 'object', properties: { script_name: { type: 'string' }, target: { type: 'string' }, extra_args: { type: 'string' } }, required: ['script_name', 'target'] } }
    ]
  };
});

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  if (name === 'list_security_scripts') {
    return { content: [{ type: 'text', text: ALLOWED_SCRIPTS.join('\n') }] };
  }
  if (name === 'run_security_script') {
    const { script_name, target, extra_args = '' } = args;
    if (!ALLOWED_SCRIPTS.includes(script_name)) return { content: [{ type: 'text', text: 'Error: Script not allowed' }] };
    const scriptPath = path.join(__dirname, 'scripts', script_name);
    const cmd = `python3 "${scriptPath}" "${target}" ${extra_args}`;
    return new Promise(resolve => {
      exec(cmd, { timeout: 300000 }, (err, stdout, stderr) => {
        resolve({ content: [{ type: 'text', text: err ? `Error: ${err.message}` : `=== ${script_name} ===\n${stdout}\n${stderr || ''}` }] });
      });
    });
  }
});

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});
app.post('/messages', express.json(), (req, res) => res.sendStatus(200));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MCP Server running on port ${PORT}`));