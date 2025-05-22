import MMU from './MMU.js';



function main() {


const mmu = new MMU('RND');

const tokens = [
  // Llenamos los 6 marcos
  { type: 'new', args: [1, 4000] }, // page 0
  { type: 'new', args: [1, 4000] }, // page 1
  { type: 'new', args: [1, 4000] }, // page 2
  { type: 'new', args: [1, 4000] }, // page 3
  { type: 'new', args: [1, 4000] }, // page 4
  { type: 'new', args: [1, 4000] }, // page 5

  // Accedemos algunas (aunque no afecta a RND)
  { type: 'use', args: [3] }, // page 2
  { type: 'use', args: [5] }, // page 4

  // Estas 3 causarán reemplazo aleatorio
  { type: 'new', args: [1, 4000] }, // page 6
  { type: 'new', args: [1, 4000] }, // page 7
  { type: 'new', args: [1, 4000] }, // page 8
];

mmu.setTokenStream(tokens);

tokens.forEach(t => {
  if (t.type === 'new') mmu.allocatePages(t.args[0], t.args[1]);
  else if (t.type === 'use') mmu.usePage(t.args[0]);
});

console.log('RAM Final:', mmu.ram.map(p => p?.pageId));
console.log('Virtual Memory:', mmu.virtualMemory.map(p => p.pageId));
console.log('Stats:', mmu.getStats());

}


main();