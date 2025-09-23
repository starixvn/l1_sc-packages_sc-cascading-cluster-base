import Config from "./config";
import Coordinate from "./coordinate";
import Grid from "./grid";
import Prize from "./prize";

export class ClusterFindBFS {
    private gridSize: number;
    private grid: Grid[][];
    constructor(gridSize: number, grid: Grid[][]) {
        this.gridSize = gridSize;
        this.grid = grid;
    }

    getPrizeList(): Prize[] {
        const prizeList: Prize[] = [];
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = this.grid[i][j].symbol;
                if (!this.grid[i][j].used && symbol !== 0 && symbol !== Config.space && symbol !== Config.SC) {
                    const prize = new Prize();
                    prize.symbol = symbol;
                    prize.position.push(new Coordinate(i, j));
                    prize.link = this.walk(i, j, prize, this.grid);
                    if (prize.link >= Config.minLinkRequirement) {
                        prizeList.push(prize);
                    }
                }
            }
        }
        return prizeList;
    }

    private walk(i: number, j: number, prize: Prize, grid: Grid[][]): number {
        grid[i][j].used = true;
        let result = 1;
        result += this.move(i - 1, j, prize, grid);
        result += this.move(i, j + 1, prize, grid);
        result += this.move(i, j - 1, prize, grid);
        result += this.move(i + 1, j, prize, grid);
        return result;
    }

    private move(i: number, j: number, prize: Prize, grid: Grid[][]): number {
        if (!this.checkPositionLegit(i, j)) {
            return 0;
        }

        if (grid[i][j].used) {
            return 0;
        }

        if (grid[i][j].symbol === prize.symbol) {
            prize.position.push(new Coordinate(i, j));
            return this.walk(i, j, prize, grid);
        } else return 0;
    }

    private checkPositionLegit(i: number, j: number): boolean {
        return i >= 0 && j >= 0 && i < this.gridSize && j < this.gridSize;
    }
}

export class ClusterFindBFSOptimized {
    private gridSize: number;
    private grid: Grid[][];
    constructor(gridSize: number, grid: Grid[][]) {
        this.gridSize = gridSize;
        this.grid = grid;
    }

    getPrizeList(): Prize[] {
        const prizeList: Prize[] = [];
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = this.grid[i][j].symbol;
                if (!this.grid[i][j].used && symbol !== 0 && symbol !== Config.space && symbol !== Config.SC) {
                    const clusterSize = this.countClusterSize(i, j, symbol);
                    if (clusterSize >= Config.minLinkRequirement) {
                        const prize = new Prize();
                        prize.symbol = symbol;
                        prize.link = clusterSize;
                        prizeList.push(prize);
                    }
                }
            }
        }
        return prizeList;
    }

    private countClusterSize(startI: number, startJ: number, symbol: number): number {
        const stack: number[] = [];
        let clusterSize = 0;

        const startPos = startI * this.gridSize + startJ;
        stack.push(startPos);
        this.grid[startI][startJ].used = true;

        while (stack.length > 0) {
            const pos = stack.pop()!;
            const i = Math.floor(pos / this.gridSize);
            const j = pos % this.gridSize;
            clusterSize++;

            if (i > 0 && !this.grid[i - 1][j].used && this.grid[i - 1][j].symbol === symbol) {
                this.grid[i - 1][j].used = true;
                stack.push((i - 1) * this.gridSize + j);
            }
            if (i < this.gridSize - 1 && !this.grid[i + 1][j].used && this.grid[i + 1][j].symbol === symbol) {
                this.grid[i + 1][j].used = true;
                stack.push((i + 1) * this.gridSize + j);
            }
            if (j > 0 && !this.grid[i][j - 1].used && this.grid[i][j - 1].symbol === symbol) {
                this.grid[i][j - 1].used = true;
                stack.push(i * this.gridSize + (j - 1));
            }
            if (j < this.gridSize - 1 && !this.grid[i][j + 1].used && this.grid[i][j + 1].symbol === symbol) {
                this.grid[i][j + 1].used = true;
                stack.push(i * this.gridSize + (j + 1));
            }
        }

        return clusterSize;
    }
}

export class ClusterFindBFSIterative {
    private gridSize: number;
    private grid: Grid[][];
    constructor(gridSize: number, grid: Grid[][]) {
        this.gridSize = gridSize;
        this.grid = grid;
    }

    getPrizeList(): Prize[] {
        const prizeList: Prize[] = [];
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = this.grid[i][j].symbol;
                if (!this.grid[i][j].used && symbol !== 0 && symbol !== Config.space && symbol !== Config.SC) {
                    const clusterSize = this.countClusterSize(i, j, symbol);
                    if (clusterSize >= Config.minLinkRequirement) {
                        const prize = new Prize();
                        prize.symbol = symbol;
                        prize.link = clusterSize;
                        prizeList.push(prize);
                    }
                }
            }
        }
        return prizeList;
    }

    private countClusterSize(startI: number, startJ: number, symbol: number): number {
        const queue: number[] = [];
        let clusterSize = 0;

        // Use linear indexing for better performance
        const startPos = startI * this.gridSize + startJ;
        queue.push(startPos);
        this.grid[startI][startJ].used = true;

        while (queue.length > 0) {
            const pos = queue.shift()!;
            const i = Math.floor(pos / this.gridSize);
            const j = pos % this.gridSize;
            clusterSize++;

            if (i > 0 && !this.grid[i - 1][j].used && this.grid[i - 1][j].symbol === symbol) {
                this.grid[i - 1][j].used = true;
                queue.push((i - 1) * this.gridSize + j);
            }
            if (i < this.gridSize - 1 && !this.grid[i + 1][j].used && this.grid[i + 1][j].symbol === symbol) {
                this.grid[i + 1][j].used = true;
                queue.push((i + 1) * this.gridSize + j);
            }
            if (j > 0 && !this.grid[i][j - 1].used && this.grid[i][j - 1].symbol === symbol) {
                this.grid[i][j - 1].used = true;
                queue.push(i * this.gridSize + (j - 1));
            }
            if (j < this.gridSize - 1 && !this.grid[i][j + 1].used && this.grid[i][j + 1].symbol === symbol) {
                this.grid[i][j + 1].used = true;
                queue.push(i * this.gridSize + (j + 1));
            }
        }

        return clusterSize;
    }
}

export class ClusterFindUltraFast {
    private gridSize: number;
    private grid: Grid[][];
    constructor(gridSize: number, grid: Grid[][]) {
        this.gridSize = gridSize;
        this.grid = grid;
    }

    getPrizeList(): Prize[] {
        const prizeList: Prize[] = [];

        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = this.grid[i][j].symbol;
                if (!this.grid[i][j].used && symbol !== 0 && symbol !== Config.space && symbol !== Config.SC) {
                    const clusterSize = this.countClusterSize(i, j, symbol);
                    if (clusterSize >= Config.minLinkRequirement) {
                        const prize = new Prize();
                        prize.symbol = symbol;
                        prize.link = clusterSize;
                        prizeList.push(prize);
                    }
                }
            }
        }

        return prizeList;
    }

    private countClusterSize(startI: number, startJ: number, symbol: number): number {
        const stack: number[] = [];
        let clusterSize = 0;

        const startPos = startI * this.gridSize + startJ;
        stack.push(startPos);
        this.grid[startI][startJ].used = true;

        while (stack.length > 0) {
            const pos = stack.pop()!;
            const i = Math.floor(pos / this.gridSize);
            const j = pos % this.gridSize;
            clusterSize++;

            const iMinus1 = i - 1;
            const iPlus1 = i + 1;
            const jMinus1 = j - 1;
            const jPlus1 = j + 1;

            if (iMinus1 >= 0 && !this.grid[iMinus1][j].used && this.grid[iMinus1][j].symbol === symbol) {
                this.grid[iMinus1][j].used = true;
                stack.push(iMinus1 * this.gridSize + j);
            }
            if (iPlus1 < this.gridSize && !this.grid[iPlus1][j].used && this.grid[iPlus1][j].symbol === symbol) {
                this.grid[iPlus1][j].used = true;
                stack.push(iPlus1 * this.gridSize + j);
            }
            if (jMinus1 >= 0 && !this.grid[i][jMinus1].used && this.grid[i][jMinus1].symbol === symbol) {
                this.grid[i][jMinus1].used = true;
                stack.push(i * this.gridSize + jMinus1);
            }
            if (jPlus1 < this.gridSize && !this.grid[i][jPlus1].used && this.grid[i][jPlus1].symbol === symbol) {
                this.grid[i][jPlus1].used = true;
                stack.push(i * this.gridSize + jPlus1);
            }
        }

        return clusterSize;
    }
}

export class ClusterFindHK {
    private gridSize: number;
    private grid: Grid[][];
    private label: number[][];
    private parent: number[];
    private rank: number[];
    private nextLabel: number;

    constructor(gridSize: number, grid: Grid[][]) {
        this.gridSize = gridSize;
        this.grid = grid;
        this.nextLabel = 1;
        this.label = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
        this.parent = [];
        this.rank = [];
        this.labelAllSymbols();
    }

    labelAllSymbols() {
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = this.grid[i][j].symbol;
                if (symbol === 0 || symbol === Config.space || symbol === Config.SC) {
                    continue;
                }

                // Check left and top neighbors (Hoshen-Kopelman scans left-to-right, top-to-bottom)
                const leftLabel = j > 0 && this.grid[i][j - 1].symbol === symbol ? this.label[i][j - 1] : 0;
                const topLabel = i > 0 && this.grid[i - 1][j].symbol === symbol ? this.label[i - 1][j] : 0;

                if (leftLabel === 0 && topLabel === 0) {
                    this.label[i][j] = this.getNewLabel();
                } else if (leftLabel !== 0 && topLabel === 0) {
                    this.label[i][j] = leftLabel;
                } else if (leftLabel === 0 && topLabel !== 0) {
                    this.label[i][j] = topLabel;
                } else {
                    this.label[i][j] = leftLabel;
                    this.union(leftLabel, topLabel);
                }
            }
        }
    }

    // Optimized Union-Find with path compression and union by rank
    union(x: number, y: number) {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX !== rootY) {
            // Union by rank for better performance
            if (this.rank[rootX] < this.rank[rootY]) {
                this.parent[rootX] = rootY;
            } else if (this.rank[rootX] > this.rank[rootY]) {
                this.parent[rootY] = rootX;
            } else {
                this.parent[rootY] = rootX;
                this.rank[rootX]++;
            }
        }
    }

    find(x: number) {
        // Path compression for better performance
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    private getNewLabel(): number {
        const label = this.nextLabel++;
        this.parent[label] = label;
        this.rank[label] = 0;
        return label;
    }

    getPrizeList(): Prize[] {
        // Count cluster sizes efficiently
        const clusterCounts = new Map<number, number>();
        const clusterSymbols = new Map<number, number>();

        // Single pass to count clusters and identify symbols
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = this.grid[i][j].symbol;
                if (symbol === 0 || symbol === Config.space || symbol === Config.SC) {
                    continue;
                }

                const rootLabel = this.find(this.label[i][j]);
                clusterCounts.set(rootLabel, (clusterCounts.get(rootLabel) || 0) + 1);
                clusterSymbols.set(rootLabel, symbol);
            }
        }

        // Create prize list from valid clusters
        const prizeList: Prize[] = [];
        const processedClusters = new Set<number>();

        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = this.grid[i][j].symbol;
                if (symbol === 0 || symbol === Config.space || symbol === Config.SC) {
                    continue;
                }

                const rootLabel = this.find(this.label[i][j]);
                if (processedClusters.has(rootLabel)) {
                    continue;
                }

                const clusterSize = clusterCounts.get(rootLabel) || 0;
                if (clusterSize >= Config.minLinkRequirement) {
                    const prize = new Prize();
                    prize.symbol = symbol;
                    prize.link = clusterSize;
                    prizeList.push(prize);
                    processedClusters.add(rootLabel);
                }
            }
        }

        return prizeList;
    }
}
