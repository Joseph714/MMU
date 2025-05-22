// Simple Lexer for the project
// This lexer reads a file named instrucciones.txt and tokenizes its contents
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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


//Test the lexer with the file =========================

// Read instrucciones.txt from the parent directory

export async function readTokensFromFile() {
  try {
    const filePath = path.join(__dirname, '../instrucciones.txt');
    const data = await fs.readFile(filePath, 'utf8');
    return lexer(data);
  } catch (err) {
    console.error('[Lexer] Error:', err.message);
  }
}