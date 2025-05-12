const fs = require('fs');
const path = require('path');

function lexer(input) {
  const lines = input.trim().split('\n');
  const tokens = [];

  const tokenPatterns = {
    new: /^new\((\d+),(\d+)\)$/,
    use: /^use\((\d+)\)$/,
    delete: /^delete\((\d+)\)$/,
    kill: /^kill\((\d+)\)$/
  };

  for (const line of lines) {
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

// Read instrucciones.txt from same directory
const filePath = path.join(__dirname, 'instrucciones.txt');

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
