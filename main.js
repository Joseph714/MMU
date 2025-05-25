import MMU from './MMU.js';
import { writeSequenceToFile } from './languageModule/languageGenerator.js';
import { readTokensFromFile } from './languageModule/lexer.js';

async function main() {


    const mmu = new MMU('SC'); // Initialize the MMU with FIFO algorithm

    //await writeSequenceToFile(10, 500, 12345); // Example usage

    const tokens = await readTokensFromFile(); // Read and tokenize the instructions from the file

    tokens.forEach(token => {
        if (token.type === 'new') {
            mmu.allocatePages(token.args[0], token.args[1]);
        } else if (token.type === 'use') {
            mmu.usePage(token.args[0]);
        } else if (token.type === 'delete') {
            mmu.deletePtr(token.args[0]);
        } else if (token.type === 'kill') {
            mmu.killProcess(token.args[0]);
        }
        console.log("Stats: ", mmu.getStats());
    });

    console.log("Stats: ", mmu.getStats());

}


main();