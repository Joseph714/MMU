import MMU from './MMU.js';
import { writeSequenceToFile } from './languageModule/languageGenerator.js';
import { readTokensFromFile } from './languageModule/lexer.js';

async function main() {


    await writeSequenceToFile(3, 10, 12345); // Example usage

    const tokens = await readTokensFromFile(); // Read and tokenize the instructions from the file

    console.log("Tokens:", tokens);

}


main();