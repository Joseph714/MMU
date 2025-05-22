// MMU.js
export default class MMU {
    constructor(algorithmName = 'FIFO') {
        this.page_size = 4000; // 4KB
        this.total_ram_pages = 6; // 400KB RAM
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
        this.referenceBits = new Map(); // for Second Chance
    }

    setTokenStream(tokens) {
        this.tokenStream = tokens;
        this.tokenPointer = 0;
    }

    generatePage(pid, ptr) {
        return {
            pageId: this.pageIdCounter++,
            pid,
            ptr,
            inRAM: false,
            frame: null,
            lastUsed: null,
        };
    }

    // Simulate the allocation of pages in RAM (New operation)
    // If there is enought space it will not generate a page fault
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
        if (this.ram.length < this.total_ram_pages) {
            page.inRAM = true;
            page.frame = this.ram.length;
            this.ram.push(page);
            this.fifoQueue.push(page);
            this.time += 1;
            page.lastUsed = this.time;
            this.referenceBits.set(page.pageId, 1);
        } else {
            const evicted = this.replacePage();
            console.log("Reemplazando:", evicted.pageId)
            evicted.inRAM = false;
            this.virtualMemory.push(evicted);

            page.inRAM = true;
            page.frame = evicted.frame;
            this.ram[evicted.frame] = page;
            this.fifoQueue.push(page);
            this.referenceBits.set(page.pageId, 1);

            this.time += 5;
            this.thrashing += 5;

            page.lastUsed = this.time;
        }
    }

    replacePage() {
        switch (this.algorithmName) {
            case 'FIFO': return this.replaceFIFO();
            case 'OPT': return this.replaceOPT();
            case 'MRU': return this.replaceMRU();
            case 'RND': return this.replaceRND();
            case 'SC': return this.replaceSC();
            default: throw new Error(`Unknown algorithm: ${this.algorithmName}`);
        }
    }


    replaceFIFO() {
        const evicted = this.fifoQueue.shift();
        const index = this.ram.findIndex(p => p.pageId === evicted.pageId);
        if (index !== -1) {
            this.ram[index] = null;
            evicted.frame = index;
        }
        return evicted;
    }

    replaceOPT() {
        let farthestUse = -1;
        let indexToReplace = -1;

        for (let i = 0; i < this.ram.length; i++) {
            const page = this.ram[i];
            let found = false;

            for (let j = this.tokenPointer; j < this.tokenStream.length; j++) {
                const token = this.tokenStream[j];
                if (token.type === 'use') {
                    const targetPtr = token.args[0];
                    const target = this.memoryMap.get(targetPtr);
                    if (!target) continue;

                    if (target.pages.some(p => p.pageId === page.pageId)) {
                        const distance = j - this.tokenPointer;
                        if (distance > farthestUse) {
                            farthestUse = distance;
                            indexToReplace = i;
                        }
                        found = true;
                        break;
                    }
                }
            }

            if (!found) return this.ram[i];
        }

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
            if (this.referenceBits.get(candidate.pageId) === 0) {
                this.fifoQueue.shift();
                const index = this.ram.findIndex(p => p.pageId === candidate.pageId);
                if (index !== -1) {
                    this.ram[index] = null;
                    candidate.frame = index;
                }
                return candidate;
            } else {
                this.referenceBits.set(candidate.pageId, 0);
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
                this.referenceBits.set(page.pageId, 1);
            }
        }

        this.tokenPointer++;
    }

    deletePtr(ptr) {
        const entry = this.memoryMap.get(ptr);
        if (!entry) return;

        for (const page of entry.pages) {
            if (page.inRAM) {
                this.ram = this.ram.filter(p => p.pageId !== page.pageId);
                this.fifoQueue = this.fifoQueue.filter(p => p.pageId !== page.pageId);
                this.referenceBits.delete(page.pageId);
            } else {
                this.virtualMemory = this.virtualMemory.filter(p => p.pageId !== page.pageId);
            }
        }

        this.memoryMap.delete(ptr);
        const ptrs = this.symbolTable.get(entry.pid);
        this.symbolTable.set(entry.pid, ptrs.filter(p => p !== ptr));
    }

    killProcess(pid) {
        const ptrs = this.symbolTable.get(pid) || [];
        for (const ptr of ptrs) {
            this.deletePtr(ptr);
        }
        this.symbolTable.delete(pid);
    }

    getStats() {
        const ramUsed = this.ram.filter(p => p !== null).length * this.page_size;
        const vramUsed = this.virtualMemory.length * this.page_size;
        const totalSimTime = this.time;

        let wastedMemory = 0;
        for (const { pages, requestedSize } of this.memoryMap.values()) {
            const allocated = pages.length * this.page_size;
            wastedMemory += (allocated - requestedSize);
        }

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
            wastedKB: wastedMemory / 1000,
        };
    }
}
