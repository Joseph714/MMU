// Clase MMU (Memory Management Unit) para simular la gestión de memoria virtual
 
/* 
Por default se usa FIFO (First In First Out) como algoritmo de reemplazo de páginas.


*/

export default class MMU {
    constructor(algorithmName = 'FIFO') {
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
    }

    generatePage(pid, ptr) {
        return {
            id: this.pageIdCounter++,
            pid,
            ptr,
            inRAM: false,
            frame: null, // índice en RAM si está presente
            lastUsed: this.time,
        };
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

        this.memoryMap.set(ptr, { pid, pages });

        if (!this.symbolTable.has(pid)) this.symbolTable.set(pid, []);
        this.symbolTable.get(pid).push(ptr);

        return ptr;
    }

    loadPage(page) {
        if (this.ram.length < this.total_ram_pages) {
            page.inRAM = true;
            page.frame = this.ram.length;
            this.ram.push(page);
            this.time += 1;
        } else {
            const evicted = this.replacePage();
            evicted.inRAM = false;
            evicted.frame = null;
            this.virtualMemory.push(evicted);

            page.inRAM = true;
            page.frame = evicted.frame;
            this.ram[page.frame] = page;

            this.time += 5;
            this.thrashing += 5;
        }
    }


    // Reemplaza una página en RAM usando el algoritmo XXXXXXXX
    replacePage() {
        switch (this.algorithmName) {
            case 'FIFO':
                return this.replaceFIFO();
            case 'SC':
                // Implementar SC (Second Chance)
                break;
            case 'MRU':
                // Implementar MRU (Most Recently Used)
                break;
            case 'RND':
                // Implementar RND (Random)
                break;
            default:
                throw new Error(`Unknown algorithm: ${this.algorithmName}`);
        }
    }

    // Reemplaza la página más antigua (FIFO)
    replaceFIFO() {
        const page = this.ram[0];
        this.ram.shift();
        return page;
    }

    // Simula el uso de un puntero, cargando las páginas en RAM si es necesario
    usePage(ptr) {
        const entry = this.memoryMap.get(ptr);
        if (!entry) throw new Error(`Invalid ptr: ${ptr}`);
        for (const page of entry.pages) {
            if (!page.inRAM) {
                // Page fault
                this.loadPage(page);
            } else {
                this.time += 1;
                page.lastUsed = this.time;
            }
        }
    }

    // Elimina un puntero y libera sus páginas de la memoria
    deletePtr(ptr) {
        const entry = this.memoryMap.get(ptr);
        if (!entry) return;

        for (const page of entry.pages) {
            if (page.inRAM) {
                this.ram = this.ram.filter(p => p.id !== page.id);
            } else {
                this.virtualMemory = this.virtualMemory.filter(p => p.id !== page.id);
            }
        }

        this.memoryMap.delete(ptr);
        const ptrs = this.symbolTable.get(entry.pid);
        this.symbolTable.set(entry.pid, ptrs.filter(p => p !== ptr));
    }


    // Llama a deletePtr para eliminar todas las páginas de un proceso y también elimina el proceso de la tabla de símbolos
    killProcess(pid) {
        const ptrs = this.symbolTable.get(pid) || [];
        for (const ptr of ptrs) {
            this.deletePtr(ptr);
        }
        this.symbolTable.delete(pid);
    }

    //  Stats en vivo de la simulación en un punto en concreto en formato JSON
    getStats() {
        const ramUsed = this.ram.length * this.page_size;
        const vramUsed = this.virtualMemory.length * this.page_size;
        const totalSimTime = this.time;
        // Hay que poner el wasted memory en KB
        return {
            runningProcesses: Array.from(this.symbolTable.keys()),
            ram: this.ram,
            ramUsedKB: ramUsed / 1000,
            ramUsedPercent: (ramUsed / (this.total_ram_pages * this.page_size)) * 100,
            vramUsedKB: vramUsed / 1000,
            vramUsedPercent: (vramUsed / (this.total_ram_pages * this.page_size)) * 100,
            time: totalSimTime,
            thrashing: this.thrashing,
            thrashingPercent: (this.thrashing / totalSimTime) * 100,
        };
    }
}
