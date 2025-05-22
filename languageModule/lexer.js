// Simple Lexer for the project
// This lexer reads a file named instrucciones.txt and tokenizes its contents
const fs = require('fs');
const path = require('path');

function lexer(input) {
  const lines = input.split(/\r?\n/); // OS-agnostic line splitting
  const tokens = [];

  const tokenPatterns = {
    new: /^new\((\d+),\s*(\d+)\)$/,
    use: /^use\((\d+)\)$/,
    delete: /^delete\((\d+)\)$/,
    kill: /^kill\((\d+)\)$/
  };

  for (let line of lines) {
    line = line.trim(); // Remove surrounding spaces and \r if present
    if (line === '') continue; // Skip empty lines
    let matched = false;

    for (const [type, pattern] of Object.entries(tokenPatterns)) {
      const match = line.match(pattern);
      if (match) {
        const args = match.slice(1).map(Number);
        tokens.push({ type, args });
        matched = true;
        break;
      }
    }

    if (!matched) {
      throw new Error(`Unknown instruction: ${line}`);
    }
  }

  return tokens;
}

// Read instrucciones.txt from the parent directory
const filePath = path.join(__dirname, '../instrucciones.txt');

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading instrucciones.txt:', err.message);
    return;
  }

  try {
    const tokens = lexer(data);
    console.log('Tokens:', tokens);
  } catch (e) {
    console.error('Lexer error:', e.message);
  }
});
