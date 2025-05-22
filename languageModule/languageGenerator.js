const { write, writeFile } = require("fs");

// Seeded PRNG (Mulberry32)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// P: number of processes, N: number of operations, seed: fixed seed for reproducibility
function generateSequence(P, N, seed = Date.now()) {
  console.log(`Seed: ${seed}`);
  const rand = mulberry32(seed); // seed-based random generator

  const totalOperations = [];
  const processes = {};
  let operationCounter = 0;
  let ptrCounter = 1;
  let remainingKills = P;

  if (P <= 0 || N <= 0) {
    throw new Error("Number of processes and operations must be greater than 0.");
  } else if (N < 2 * P) {
    throw new Error("Number of operations must be at least twice the number of processes.");
  }

  for (let pid = 1; pid <= P; pid++) {
    processes[pid] = {
      pointers: [],
      terminated: false,
      created: false,
    };
  }

  const getActiveProcesses = () =>
    Object.entries(processes).filter(([_, p]) => !p.terminated);

  while (operationCounter + remainingKills < N) {
    const active = getActiveProcesses();
    if (active.length === 0) break;

    const [pidStr, process] = active[Math.floor(rand() * active.length)];
    const pid = parseInt(pidStr);

    const canNew = true;
    const canUse = process.pointers.length > 0;
    const canDelete = process.pointers.length > 0;
    const canKill = process.created && !process.terminated;

    const shouldKill = canKill && rand() < 0.025; // 2.5% chance to kill

    if (shouldKill) {
      totalOperations.push(`kill(${pid})`);
      process.terminated = true;
      remainingKills--;
    } else {
      const operationType = Math.floor(rand() * 3); // 0: new, 1: use, 2: delete

      if (operationType === 0 && canNew) {
        const size = Math.floor(rand() * 10000) + 1;
        totalOperations.push(`new(${pid}, ${size})`);
        process.pointers.push(ptrCounter++);
        process.created = true;
      } else if (operationType === 1 && canUse) {
        const pointer = process.pointers[Math.floor(rand() * process.pointers.length)];
        totalOperations.push(`use(${pointer})`);
      } else if (operationType === 2 && canDelete) {
        const pointer = process.pointers[Math.floor(rand() * process.pointers.length)];
        process.pointers = process.pointers.filter(p => p !== pointer);
        totalOperations.push(`delete(${pointer})`);
      } else {
        continue; // Skip invalid operation
      }
    }

    operationCounter++;
  }

  console.log(`Operations generated: ${operationCounter}`);
  console.log(`Remaining kills: ${remainingKills}`);
  console.log(`N: ${N}`);

  // Final kills to reach exactly N
  for (const [pid, process] of Object.entries(processes)) {
    if (!process.terminated && process.created) {
      totalOperations.push(`kill(${pid})`);
      operationCounter++;
      if (operationCounter === N) break;
    }
  }


  return totalOperations;
}

// Example usage with seed:
const result = generateSequence(50, 500);
console.log(result.join('\n'));

writeFile(
  "../instrucciones.txt",
  result.join("\n"),
  (err) => {
    if (err) {
      console.error("Error writing to instrucciones.txt:", err);
    } else {
      console.log("Instructions written to instrucciones.txt");
    }
  }
);

