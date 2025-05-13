import MMU from './MMU.js';



function main() {

    const mmu = new MMU('FIFO');
    const pid = 1;
    const size = 8000; // 8KB
    const ptr = mmu.allocatePages(pid, size);
    console.log(mmu.getStats());
    
}


main();