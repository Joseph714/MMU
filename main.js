import MMU from './MMU.js';



function main() {



    const mmu = new MMU('FIFO');

    // new(1,8000)
    const ptr1 = mmu.allocatePages(1, 8000);
    console.log(mmu.getStats());

    // new(2,8000)
    const ptr2 = mmu.allocatePages(2, 8000);
    console.log(mmu.getStats());

    // new(3,8000)
    const ptr3 = mmu.allocatePages(3, 8000);
    console.log(mmu.getStats());

    // new(4,8000)
    const ptr4 = mmu.allocatePages(4, 8000);
    console.log(mmu.getStats());



    // const mmu = new MMU('OPT');
    // mmu.setTokenStream(Tokens);
    // Tokens.forEach(t => {
    //   if (t.type === 'new') mmu.allocatePages(t.args[0], t.args[1]);
    //   else if (t.type === 'use') mmu.usePage(t.args[0]);
    //   else if (t.type === 'delete') mmu.deletePtr(t.args[0]);
    //   else if (t.type === 'kill') mmu.killProcess(t.args[0]);
    // });
}


main();