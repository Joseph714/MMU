
// P: number of processes, N: number of operations
function generateSequence(P, N) { 
  const totalOperations = [];
  const processes = {};
  let operationCounter = 1;
  let remainingKills = 0;
  let ptrCounter = 1;

  if (P <= 0|| N <= 0) {
    throw new Error("Number of processes and operations must be greater than 0.");
  } else if (P < N / 2) {
    throw new Error("Number of operations must be at least twice the number of processes.");
  }

  // Initialize processes
  for (let pid = 1; pid <= P; pid++) {
    processes[pid] = {
      pointers: [],
      terminated: false,
      created: false,
    };
  }

  // Pick a random active process
  const activeProcesses = Object.entries(processes).filter(([pid, process]) => !process.terminated);
  while (operationCounter <= N && remainingKills < N - operationCounter) {

    if (activeProcesses.length === 0) break;


    const [pidStr, process] = activeProcesses[Math.floor(Math.random() * activeProcesses.length)];
    const pid = parseInt(pidStr);

    const canNew = !process.created;
    const canUse = process.pointers.length > 0;
    const canDelete = process.pointers.length > 0;
    const canKill = !process.terminated && process.created;


    let operation = Math.floor(Math.random() * 4);
    if (operation === 0 && canNew) {
      const size = Math.floor(Math.random() * 10000) + 1; // Random size between 1 and 10000
      totalOperations.push(`new(${pid}, ${size})`);
      process.pointers.push(ptrCounter++);
      remainingKills++;
      process.created = true;
    } else if (operation === 1 && canUse) {
      const pointer = process.pointers[Math.floor(Math.random() * process.pointers.length)];
      totalOperations.push(`use(${pointer})`);
    } else if (operation === 2 && canDelete) {
      const pointer = process.pointers[Math.floor(Math.random() * process.pointers.length)];
      totalOperations.push(`delete(${pointer})`);
      process.pointers = process.pointers.filter(p => p !== pointer);
    } else if (operation === 3 && canKill) {
      totalOperations.push(`kill(${pid})`);
      process.terminated = true;
      activeProcesses.splice(activeProcesses.indexOf([pidStr, process]), 1);
    } else {
      // If no valid operation can be performed, skip to the next iteration
      continue;
    }
   

    operationCounter++;
  }

  // Ensure all processes are terminated properly
  for (const [pid, process] of Object.entries(processes)) {
    if (!process.terminated && process.created) {
      totalOperations.push(`kill(${pid})`);
    }
    operationCounter++;
  }

  return totalOperations;
}



// Example usage:
const result = generateSequence(10, 20);
console.log(result.join('\n'));
