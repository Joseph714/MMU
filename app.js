const pastelColors = [
  "#d3f99e",
  "#f9cab3",
  "#f4dec2",
  "#d8f9bd",
  "#dafdcd",
  "#e4cffb",
  "#f4b3c5",
  "#feb8ce",
  "#bfe9f7",
  "#f8b3bd",
  "#c6f1d8",
  "#b6eff5",
  "#f6c1c3",
  "#c9f2da",
  "#ffe1b3",
  "#d2f0bf",
  "#d0d7f9",
  "#fbd6d8",
  "#d4e6fa",
  "#b3f7d4",
  "#f4f3b6",
  "#fdd3df",
  "#d9f7cf",
  "#ffddb4",
  "#e1f5b3",
  "#b3e2f9",
  "#f7c1e4",
  "#c2f0f5",
  "#f9e0b6",
  "#e3f7cf",
  "#ffbde0",
  "#bce7f7",
  "#f1c6e4",
  "#d4fbd7",
  "#f0c7b4",
  "#cce6f7",
  "#fcd5b3",
  "#d0f9cd",
  "#b3f5e1",
  "#f7d1c9",
  "#ffe2b3",
  "#e3d3f9",
  "#d8f3cf",
  "#ffd6b3",
  "#b3f4e5",
  "#f9bde3",
  "#e2fbcb",
  "#f6bdd6",
  "#f2e0b3",
  "#cbf2f3",
  "#b3ecf5",
  "#fcd8b3",
  "#f9d0d4",
  "#e4c3fb",
  "#ccf7de",
  "#fad2b3",
  "#b3f2e9",
  "#ffd9b3",
  "#fbd0ec",
  "#c2f0b9",
  "#fbd2b3",
  "#c7e8fb",
  "#f7c0cf",
  "#b3f2dc",
  "#fad4b3",
  "#e8b3f9",
  "#cdf2d3",
  "#f9d0b3",
  "#bcecf7",
  "#f7b3c3",
  "#d2fcb3",
  "#f5c8df",
  "#c3f7ef",
  "#ffceb3",
  "#d7c3fb",
  "#f5d2b3",
  "#b3f7e6",
  "#fcced1",
  "#b6f5cf",
  "#fddab3",
  "#d8c1fa",
  "#b3f5e0",
  "#f3b3cb",
  "#f4c3de",
  "#d9f7b3",
  "#e6c2fb",
  "#f4b3b8",
  "#c9f5d3",
  "#ffdbb3",
  "#b3f0f9",
  "#f6b3d0",
  "#b4f3f0",
  "#c7b3fb",
  "#f3d0b3",
  "#b9f0d9",
  "#f5b3cb",
  "#bceff2",
  "#fcd9b3",
  "#f3c5f0",
  "#d2b3fb",
];

// MMU.js
class MMU {
  constructor(algorithmName = "FIFO") {
    this.page_size = 4000; // 4KB
    this.total_ram_pages = 100; // 400KB RAM
    this.ram = []; // páginas en memoria real
    this.virtualMemory = []; // páginas en disco
    this.ptrCounter = 1;
    this.memoryMap = new Map(); // ptr -> { pid, pages: [Page, ...] }
    this.symbolTable = new Map(); // pid -> [ptrs]
    this.time = 0;
    this.thrashing = 0;
    this.algorithmName = algorithmName;
    this.pageIdCounter = 0;

    this.tokenStream = [];
    this.tokenPointer = 0;
    this.fifoQueue = [];
    this.loadedCount = 0;
    this.unloadedCount = 0;
  }

  reset() {
    this.ram = [];
    this.virtualMemory = [];
    this.memoryMap.clear();
    this.symbolTable.clear();
    this.time = 0;
    this.thrashing = 0;
    this.loadedCount = 0;
    this.unloadedCount = 0;
    this.pageIdCounter = 0;
    this.tokenStream = [];
    this.tokenPointer = 0;
    this.fifoQueue = [];
  }

  setTokenStream(tokens) {
    this.tokenStream = tokens;
    this.tokenPointer = 0;
  }

  generatePage(pid, ptr) {
    const page = {
      pageId: this.pageIdCounter++,
      pid,
      ptr,
      inRAM: false,
      frame: null,
      lastUsed: null,
      referenceBit: 0,
    };
    return page;
  }

  allocatePages(pid, size) {
    const numPages = Math.ceil(size / this.page_size);
    const pages = [];
    const ptr = this.ptrCounter++;

    for (let i = 0; i < numPages; i++) {
      const page = this.generatePage(pid, ptr);
      this.loadPage(page);
      pages.push(page);
    }

    this.memoryMap.set(ptr, { pid, pages, requestedSize: size });

    if (!this.symbolTable.has(pid)) this.symbolTable.set(pid, []);
    this.symbolTable.get(pid).push(ptr);

    return ptr;
  }

loadPage(page) {
    if (page.inRAM) {
        console.warn(`Warning: Page ${page.pageId} is already in RAM, skipping load.`);
        return;
    }
    this.loadedCount++;

    if (this.ram.filter(p => p !== null).length < this.total_ram_pages) {
        // Find next available frame
        const frameIndex = this.ram.findIndex(p => p === null);
        page.frame = frameIndex !== -1 ? frameIndex : this.ram.length;

        this.ram[page.frame] = page;
        page.inRAM = true;
        this.fifoQueue.push(page);
        page.referenceBit = 1;

        this.time += 1;
        page.lastUsed = this.time;

    } else {
        const evicted = this.replacePage();
        this.unloadedCount++;

        // Clean evicted page
        if (evicted) {
            evicted.inRAM = false;
            this.virtualMemory.push(evicted);

            const frameToReuse = evicted.frame;
            page.inRAM = true;
            page.frame = frameToReuse;

            this.ram[frameToReuse] = page;
            this.fifoQueue.push(page);
            page.referenceBit = 1;

            this.time += 5;
            this.thrashing += 5;
            page.lastUsed = this.time;
        } else {
            throw new Error("No page to evict, but RAM is full.");
        }
    }
}


  replacePage() {
    switch (this.algorithmName) {
      case "FIFO":
        return this.replaceFIFO();
      case "OPT":
        return this.replaceOPT();
      case "MRU":
        return this.replaceMRU();
      case "RND":
        return this.replaceRND();
      case "SC":
        return this.replaceSC();
      default:
        throw new Error(`Unknown algorithm: ${this.algorithmName}`);
    }
  }

replaceFIFO() {
    const evicted = this.fifoQueue.shift();
    const index = this.ram.findIndex(p => p && p.pageId === evicted.pageId);
    if (index !== -1) {
        evicted.frame = index;
    }
    return evicted;
}

replaceOPT() {
    let indexToReplace = -1;
    let farthestUse = -1;

    for (let i = 0; i < this.ram.length; i++) {
        const page = this.ram[i];
        let nextUse = Infinity;

        for (let j = this.tokenPointer + 1; j < this.tokenStream.length; j++) {
            const token = this.tokenStream[j];
            if (token.type !== "use") continue;

            const target = this.memoryMap.get(token.args[0]);
            if (!target) continue;

            const isUsed = target.pages.some(p => p.pageId === page.pageId);
            if (isUsed) {
                nextUse = j;
            }
        }

        if (nextUse === Infinity) {
            // This page is never used again — best one to evict
            return page;
        }

        if (nextUse > farthestUse) {
            farthestUse = nextUse;
            indexToReplace = i;
        }
    }

    console.log(`OPT: Replacing page ${this.ram[indexToReplace]?.pageId} (used again at token ${farthestUse})`);
    return this.ram[indexToReplace];
}


  replaceMRU() {
    let mostRecent = -1;
    let indexToReplace = -1;

    for (let i = 0; i < this.ram.length; i++) {
      if (this.ram[i].lastUsed > mostRecent) {
        mostRecent = this.ram[i].lastUsed;
        indexToReplace = i;
      }
    }

    return this.ram[indexToReplace];
  }

  replaceRND() {
    const index = Math.floor(Math.random() * this.ram.length);
    return this.ram[index];
  }

replaceSC() {
    while (true) {
        const candidate = this.fifoQueue[0];

        if (candidate.referenceBit === 0) {
            this.fifoQueue.shift();
            const index = this.ram.findIndex(p => p && p.pageId === candidate.pageId);
            if (index !== -1) {
                candidate.frame = index;
            }
            return candidate;
        } else {
            candidate.referenceBit = 0;
            this.fifoQueue.push(this.fifoQueue.shift());
        }
    }
}


  usePage(ptr) {
    const entry = this.memoryMap.get(ptr);
    if (!entry) throw new Error(`Invalid ptr: ${ptr}`);

    for (const page of entry.pages) {
      if (!page.inRAM) {
        this.loadPage(page);
      } else {
        this.time += 1;
        page.lastUsed = this.time;
        page.referenceBit = 1;
      }
    }
    return ptr;
  }

  deletePtr(ptr) {
    const entry = this.memoryMap.get(ptr);
    if (!entry) return;

    for (const page of entry.pages) {
      if (page.inRAM) {
        // Find the index of the page in RAM and set it to null
        const index = this.ram.findIndex((p) => p && p.pageId === page.pageId);
        if (index !== -1) this.ram[index] = null;

        // Remove it from FIFO queue
        this.fifoQueue = this.fifoQueue.filter(
          (p) => p && p.pageId !== page.pageId
        );
      } else {
        this.virtualMemory = this.virtualMemory.filter(
          (p) => p && p.pageId !== page.pageId
        );
      }
    }

    this.memoryMap.delete(ptr);
    const ptrs = this.symbolTable.get(entry.pid) || [];
    this.symbolTable.set(
      entry.pid,
      ptrs.filter((p) => p !== ptr)
    );
  }

  killProcess(pid) {
    const ptrs = this.symbolTable.get(pid) || [];
    for (const ptr of ptrs) {
      this.deletePtr(ptr);
    }
    this.symbolTable.delete(pid);
  }

  getStats() {
    const ramUsed = this.ram.filter((p) => p !== null).length * this.page_size;
    const vramUsed = this.virtualMemory.length * this.page_size;
    const totalSimTime = this.time;

    let wastedMemory = 0;
    for (const { pages, requestedSize } of this.memoryMap.values()) {
      const allocated = pages.length * this.page_size;
      wastedMemory += allocated - requestedSize;
    }

    return {
      runningProcesses: Array.from(this.symbolTable.keys()),
      ram: this.ram,
      virtualMemory: this.virtualMemory,
      ramUsedKB: ramUsed / 1000,
      ramUsedPercent: (ramUsed / (this.total_ram_pages * this.page_size)) * 100,
      vramUsedKB: vramUsed / 1000,
      vramUsedPercent:
        (vramUsed / (this.total_ram_pages * this.page_size)) * 100,
      time: totalSimTime,
      thrashing: this.thrashing,
      thrashingPercent: (this.thrashing / totalSimTime) * 100,
      wastedKB: wastedMemory / 1024,
      pagesLoaded: this.loadedCount,
      pagesUnloaded: this.unloadedCount,
    };
  }
}

// PRNG
function generateSequence(P, N, seed) {
  if (P <= 0 || N <= 0 || N < 2 * P) {
    throw new Error("Número de procesos y operaciones inválido.");
  }

  const rand = mulberry32(seed);
  const totalOperations = [];
  const processes = {};
  let operationCounter = 0;
  let ptrCounter = 1;
  let remainingKills = P;

  for (let pid = 1; pid <= P; pid++) {
    processes[pid] = { pointers: [], terminated: false, created: false };
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

    const shouldKill = canKill && rand() < 0.005;

    if (shouldKill) {
      totalOperations.push(`kill(${pid})`);
      process.terminated = true;
      remainingKills--;
    } else {
      const operationType = Math.floor(rand() * 3);

      if (operationType === 0 && canNew) {
        const size = Math.floor(rand() * 10000) + 1;
        totalOperations.push(`new(${pid}, ${size})`);
        process.pointers.push(ptrCounter++);
        process.created = true;
      } else if (operationType === 1 && canUse) {
        const pointer =
          process.pointers[Math.floor(rand() * process.pointers.length)];
        totalOperations.push(`use(${pointer})`);
      } else if (operationType === 2 && canDelete) {
        const pointer =
          process.pointers[Math.floor(rand() * process.pointers.length)];
        process.pointers = process.pointers.filter((p) => p !== pointer);
        totalOperations.push(`delete(${pointer})`);
      } else {
        continue;
      }
    }

    operationCounter++;
  }

  // Final kills
  for (const [pid, process] of Object.entries(processes)) {
    if (!process.terminated && process.created) {
      totalOperations.push(`kill(${pid})`);
      operationCounter++;
      if (operationCounter === N) break;
    }
  }

  // Si aún faltan operaciones, agregar NO-OP (si aplica) o más kills
  while (totalOperations.length < N) {
    totalOperations.push("kill(0)"); // marcador neutro si quieres forzar a N
  }

  return totalOperations;
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lexer(input) {
  const lines = input.split(/\r?\n/);
  const tokens = [];
  const patterns = {
    new: /^new\((\d+),\s*(\d+)\)$/,
    use: /^use\((\d+)\)$/,
    delete: /^delete\((\d+)\)$/,
    kill: /^kill\((\d+)\)$/,
  };

  for (const line of lines.map((l) => l.trim())) {
    if (!line) continue;
    let matched = false;
    for (const [type, regex] of Object.entries(patterns)) {
      const match = line.match(regex);
      if (match) {
        tokens.push({ type, args: match.slice(1).map(Number) });
        matched = true;
        break;
      }
    }
    if (!matched) throw new Error("Instrucción inválida: " + line);
  }

  return tokens;
}

function downloadInstructions(
  instructionLines,
  filename = "instrucciones.txt"
) {
  const blob = new Blob([instructionLines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function mostrarDivSi() {
  const divSi = document.getElementById("contSi");
  const divNo = document.getElementById("contNo");
  divNo.style.display = "none";
  divSi.style.display =
    divSi.style.display === "none" || divSi.style.display === ""
      ? "flex"
      : "none";
}

function mostrarDivNo() {
  const divSi = document.getElementById("contSi");
  const divNo = document.getElementById("contNo");
  divSi.style.display = "none";
  divNo.style.display =
    divNo.style.display === "none" || divNo.style.display === ""
      ? "flex"
      : "none";
}

function volverPreparacion() {
  window.location.reload();
}

function validarDatosDescarga() {
  const algoritmo = document.getElementById("idAlg").value;
  const semilla = document.getElementById("idSemilla").value;
  const procesos = document.getElementById("idNProcesos").value;
  const operaciones = document.getElementById("idNOperaciones").value;

  if (
    algoritmo === "" ||
    semilla === "" ||
    procesos === "" ||
    operaciones === ""
  ) {
    alert("Faltan datos para la descarga.");
  } else {
    seed = parseInt(semilla, 10);
    P = parseInt(procesos, 10);
    N = parseInt(operaciones, 10);
    const sequence = generateSequence(P, N, seed);
    tokens = lexer(sequence.join("\n"));
    downloadInstructions(sequence);
  }
}

function validarDatos() {
  const algoritmo = document.getElementById("idAlg").value;
  const semilla = document.getElementById("idSemilla").value;
  const procesos = document.getElementById("idNProcesos").value;
  const operaciones = document.getElementById("idNOperaciones").value;
  const archivo = document.getElementById("archivoInstrucciones");

  if (archivo.files.length > 0) {
    if (algoritmo === "") {
      alert("No se ha seleccionado ningún algoritmo.");
    } else {
      const divSim = document.getElementById("contSimulador");
      const divPre = document.getElementById("contPreparacion");
      divSim.style.display = "flex";
      divPre.style.display = "none";
      document.getElementById("algSelect").textContent =
        "RAM - [" + algoritmo + "]";
      document.getElementById("algSelectMMU").textContent =
        "RAM - [" + algoritmo + "]";

      const archivoTxt = archivo.files[0];
      const lector = new FileReader();

      lector.onload = function (e) {
        const contenido = e.target.result;

        try {
          const tokens = lexer(contenido);
          hacerSimulacion(tokens);
        } catch (error) {
          console.error("Error al procesar el archivo:", error.message);
        }
      };

      lector.readAsText(archivoTxt);
    }
  } else {
    if (
      algoritmo === "" ||
      semilla === "" ||
      procesos === "" ||
      operaciones === ""
    ) {
      alert("Faltan datos para la simulación.");
    } else {
      const divSim = document.getElementById("contSimulador");
      const divPre = document.getElementById("contPreparacion");
      divSim.style.display = "flex";
      divPre.style.display = "none";
      document.getElementById("algSelect").textContent =
        "RAM - [" + algoritmo + "]";
      document.getElementById("algSelectMMU").textContent =
        "RAM - [" + algoritmo + "]";

      seed = parseInt(semilla, 10);
      P = parseInt(procesos, 10);
      N = parseInt(operaciones, 10);
      const sequence = generateSequence(P, N, seed);
      const tokens = lexer(sequence.join("\n"));
      hacerSimulacion(tokens);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function procesarTokensConRetraso(mmuA, mmuB, tokens, delay) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    //console.log(`Paso ${i + 1}: Ejecutando token`, token);

    // Clone the token for each MMU
    const tokenA = { ...token };
    const tokenB = { ...token };

    aplicarToken(mmuA, tokenA, "ALG");
    aplicarToken(mmuB, tokenB, "OPT");

    mmuA.tokenPointer = i;
    mmuB.tokenPointer = i;

    actualizarResumen(mmuA.getStats(), "ALG");
    actualizarResumen(mmuB.getStats(), "OPT");

    await sleep(delay);
  }

  console.log("Final Stats MMU A:", mmuA.getStats());
  console.log("Final Stats MMU B:", mmuB.getStats());
}

function aplicarToken(mmu, token, tipo) {
  if (token.type === "new") {
    const ptr = mmu.allocatePages(token.args[0], token.args[1]);
    const pages = mmu.memoryMap.get(ptr)?.pages || [];
    pintarPaginas(pages, tipo);
    renderTablaMMU(
      mmu.getStats().ram.filter((p) => p),
      tipo
    );
  } else if (token.type === "use") {
    const ptr = mmu.usePage(token.args[0]);
    const pages = mmu.memoryMap.get(ptr)?.pages || [];
    pintarPaginas(pages, tipo);
    renderTablaMMU(
      mmu.getStats().ram.filter((p) => p),
      tipo
    );
  } else if (token.type === "delete") {
    mmu.deletePtr(token.args[0]);
    renderTablaMMU(
      mmu.getStats().ram.filter((p) => p),
      tipo
    );
  } else if (token.type === "kill") {
    const pid = token.args[0];
    limpiarPaginasPorPID(mmu, pid, tipo);
    mmu.killProcess(pid);
  }
}

async function hacerSimulacion(tokens) {
  const algoritmo = document.getElementById("idAlg").value;
  const mmuA = new MMU(algoritmo);
  const mmuO = new MMU("OPT");
  
  mmuO.setTokenStream(tokens);

  await procesarTokensConRetraso(mmuA, mmuO, tokens, 50);
}

const pidColors = {};

function pintarPaginas(pages, tipo) {
  for (const page of pages) {
    // sólo pintamos las que están realmente en RAM
    if (!page.inRAM) continue;

    const pid   = page.pid;
    const frame = page.frame;    // número entre 0 y 99

    // asigna (la primera vez) un color fijo a este PID
    if (!pidColors[pid]) {
      const idx = (pid - 1) % pastelColors.length;
      pidColors[pid] = pastelColors[idx];
    }

    // busca la celda por el índice de marco y el tipo ("OPT" o "ALG")
    const celda = document.getElementById(`pg${frame}${tipo}`);
    if (celda) {
      celda.style.backgroundColor = pidColors[pid];
      celda.dataset.pid = pid; 
    } else {
      console.warn(`No existe celda pg${frame}${tipo}`);
    }
  }
}

function renderTablaMMU(pages, tipo) {
  const tbody = document.getElementById(`tablaBody${tipo}`);
  tbody.innerHTML = ""; // Limpiar tabla antes de redibujar

  for (const page of pages) {
    const row = document.createElement("tr");
    row.id = `row_pg${page.pid}${tipo}`;

    const color = pidColors[page.pid] || "#ffffff";

    row.innerHTML = `
            <td class="processMMU">${page.pageId}</td>
            <td class="processMMU">${page.pid}</td>
            <td class="processMMU">${page.inRAM ? "X" : ""}</td>
            <td class="processMMU">${page.inRAM ? page.frame : ""}</td>
            <td class="processMMU">${page.inRAM ? page.frame : "..."}</td>
            <td class="processMMU">${
              !page.inRAM ? page.frame ?? "..." : ""
            }</td>
            <td class="processMMU">${
              page.lastUsed !== null ? page.lastUsed + "s" : ""
            }</td>
            <td class="processMMU">${page.referenceBit}</td>
        `;

    row.style.backgroundColor = color;
    tbody.appendChild(row);
  }
}

function limpiarPaginas(pages, tipo) {
  for (const page of pages) {
    const celda = document.getElementById(`pg${page.pageId}${tipo}`);
    if (celda) celda.style.backgroundColor = ""; // Limpia color
  }
}

function limpiarPaginasPorPID(mmu, pid, tipo) {
  // Obtenemos todos los punteros que el proceso aún tiene
  const ptrs = mmu.symbolTable.get(pid) || [];

  if (ptrs.length === 0) {
    // Caso A: no hay ptrs, pero el proceso sigue vivo → 
    // limpiamos todas las celdas que tengan el color de este PID.
    const color = pidColors[pid];
    if (color) {
      // todas las celdas de RAM llevan la clase "pagesMF"
      document.querySelectorAll(`.pagesMF`).forEach(cell => {
        // Compara style.backgroundColor (string) con el color exacto
        if (cell.style.backgroundColor === color) {
          cell.style.backgroundColor = "";
        }
      });
    }
    return;
  }

  // Caso B: el proceso aún tiene páginas asignadas → limpiamos cada una
  for (const ptr of ptrs) {
    const pages = mmu.memoryMap.get(ptr)?.pages || [];

    for (const page of pages) {
      // 1) Si la página estaba en RAM, quitamos su color del marco físico
      if (page.inRAM && page.frame != null) {
        const celda = document.getElementById(`pg${page.frame}${tipo}`);
        if (celda) celda.style.backgroundColor = "";
      }

      // 2) Quitamos la fila de la tabla de MMU (usa pageId para el row id)
      const fila = document.getElementById(`row_pg${pid}${tipo}`);
      if (fila) fila.remove();
    }
  }
}

function actualizarResumen(stats, tipo) {
  // PROCESSES y SIM-TIME
  document.getElementById("idProcesses" + tipo).textContent =
    stats.runningProcesses.length;
  document.getElementById("idSimTime" + tipo).textContent = stats.time + "s";

  // RAM y VRAM
  document.getElementById("idRamKB" + tipo).textContent =
    stats.ramUsedKB.toFixed(1) + " KB";
  document.getElementById("idRamPor" + tipo).textContent =
    stats.ramUsedPercent.toFixed(0) + "%";
  document.getElementById("idVRamKB" + tipo).textContent =
    stats.vramUsedKB.toFixed(1) + " KB";
  document.getElementById("idVRamPor" + tipo).textContent =
    stats.vramUsedPercent.toFixed(0) + "%";

  // PAGES
  const loaded = stats.pagesLoaded;
  const unloaded = stats.pagesUnloaded;

  document.getElementById("idLoa" + tipo).textContent = loaded;
  document.getElementById("idUnloa" + tipo).textContent = unloaded;

  // THRASHING
  const cellThrashingTime = document.getElementById(`idThrasS${tipo}`);
  const cellThrashingPct = document.getElementById(`idThrasP${tipo}`);
  cellThrashingTime.textContent = stats.thrashing + "s";
  cellThrashingPct.textContent = stats.thrashingPercent.toFixed(0) + "%";

  if (stats.thrashingPercent >= 50) {
    document.getElementById("idPintar1").style.backgroundColor = "#ff6363";
    document.getElementById("idPintar2").style.backgroundColor = "#ff6363";
    document.getElementById("idPintar3").style.backgroundColor = "#ff6363";
    document.getElementById("idPintar4").style.backgroundColor = "#ff6363";
    cellThrashingTime.style.backgroundColor = "#ff6363";
    cellThrashingPct.style.backgroundColor = "#ff6363";
  } else {
    document.getElementById("idPintar1").style.backgroundColor = "";
    document.getElementById("idPintar2").style.backgroundColor = "";
    document.getElementById("idPintar3").style.backgroundColor = "";
    document.getElementById("idPintar4").style.backgroundColor = "";
    cellThrashingTime.style.backgroundColor = "";
    cellThrashingPct.style.backgroundColor = "";
  }

  // FRAGMENTACIÓN
  document.getElementById("idFrag" + tipo).textContent =
    stats.wastedKB.toFixed(0) + "KB";
}

function resetearSimulacion(tipo) {
  // 1. Limpiar celdas de RAM
  for (let i = 0; i < 100; i++) {
    const celda = document.getElementById(`pg${i}${tipo}`);
    if (celda) celda.style.backgroundColor = "";
  }

  // 2. Limpiar tabla de páginas MMU
  const tabla = document.getElementById(`tablaBody${tipo}`);
  if (tabla) tabla.innerHTML = "";

  // 3. Limpiar resumen de valores
  const resumenIds = [
    "idProcesses",
    "idSimTime",
    "idRamKB",
    "idRamPor",
    "idVRamKB",
    "idVRamPor",
    "idLoa",
    "idUnloa",
    "idThrasS",
    "idThrasP",
    "idFrag",
  ];
  for (const id of resumenIds) {
    const elem = document.getElementById(id + tipo);
    if (elem) {
      elem.textContent = "";
      // **Quitamos aquí cualquier clase de alerta**:
      elem.classList.remove("high-thrash");
      // **Y limpiamos estilo en línea por si usaste style.backgroundColor**
      elem.style.backgroundColor = "";
    }
  }

  // 4. (opcional) Limpiar celdas de procesos por PID
  for (let pid = 1; pid <= 8; pid++) {
    const pr = document.getElementById(`pr${pid}${tipo}`);
    if (pr) pr.textContent = "";
  }
}
