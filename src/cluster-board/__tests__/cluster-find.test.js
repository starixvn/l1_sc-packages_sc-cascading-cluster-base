const { ClusterFindBFS, ClusterFindHK } = require("../../../dist/cluster-board/cluster-find");
const Grid = require("../../../dist/cluster-board/grid").default;
const Config = require("../../../dist/cluster-board/config").default;

describe("ClusterFind Comparison Tests", () => {
  // Helper function to create a grid from a 2D array
  const createGrid = (gridData) => {
    const size = gridData.length;
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        grid[i][j] = new Grid(gridData[i][j]);
      }
    }
    return grid;
  };

  // Helper function to reset grid used flags
  const resetGrid = (grid) => {
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        grid[i][j].used = false;
      }
    }
  };

  // Helper function to compare prize lists
  const comparePrizeLists = (prizes1, prizes2) => {
    if (prizes1.length !== prizes2.length) {
      console.log(`Different number of clusters: BFS=${prizes1.length}, HK=${prizes2.length}`);
      return false;
    }

    // Sort by symbol and link count for comparison
    const sorted1 = prizes1.sort((a, b) => {
      if (a.symbol !== b.symbol) return a.symbol - b.symbol;
      return b.link - a.link;
    });
    const sorted2 = prizes2.sort((a, b) => {
      if (a.symbol !== b.symbol) return a.symbol - b.symbol;
      return b.link - a.link;
    });

    for (let i = 0; i < sorted1.length; i++) {
      if (sorted1[i].symbol !== sorted2[i].symbol ||
        sorted1[i].link !== sorted2[i].link) {
        console.log(`Cluster ${i} differs: BFS(symbol=${sorted1[i].symbol}, link=${sorted1[i].link}) vs HK(symbol=${sorted2[i].symbol}, link=${sorted2[i].link})`);
        return false;
      }
    }
    return true;
  };

  describe("Basic Functionality Tests", () => {
    test("should find identical clusters for simple 3x3 grid", () => {
      const gridData = [
        [1, 1, 1, 1, 1], // 5 in a row
        [2, 2, 2, 2, 2], // 5 in a row
        [3, 3, 3, 3, 3], // 5 in a row
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      console.log("BFS Prizes:", bfsPrizes.map(p => ({ symbol: p.symbol, link: p.link })));
      console.log("HK Prizes:", hkPrizes.map(p => ({ symbol: p.symbol, link: p.link })));

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(3); // Three clusters of 5 symbols each
    });

    test("should find identical clusters for 4x4 grid with multiple symbols", () => {
      const gridData = [
        [1, 1, 1, 1, 1], // 5 in a row
        [2, 2, 2, 2, 2], // 5 in a row
        [3, 3, 3, 3, 3], // 5 in a row
        [4, 4, 4, 4, 4], // 5 in a row
        [0, 0, 0, 0, 0]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(4); // Four clusters of 5 symbols each
    });

    test("should handle empty clusters correctly", () => {
      const gridData = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(0); // No valid clusters
    });

    test("should handle space and SC symbols correctly", () => {
      const gridData = [
        [1, 1, 1, 1, 1], // 5 in a row
        [1, Config.SC, Config.space, 1, 1], // 3 valid 1s + SC + space
        [2, 2, 2, 2, 2], // 5 in a row
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(2); // Two clusters: 5 1s, 5 2s
    });
  });

  describe("Edge Cases", () => {
    test("should handle single symbol grid", () => {
      const gridData = [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(1);
      expect(bfsPrizes[0].link).toBe(9); // All 9 positions
    });

    test("should handle isolated symbols", () => {
      const gridData = [
        [1, 0, 2],
        [0, 0, 0],
        [3, 0, 4]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(0); // No clusters meet minimum requirement
    });

    test("should handle minimum link requirement", () => {
      const gridData = [
        [1, 1, 1, 1, 1], // 5 in a row
        [0, 0, 0, 0, 0],
        [2, 2, 2, 2, 0], // 4 in a row (below minimum)
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(1); // Only the 5-symbol cluster
      expect(bfsPrizes[0].link).toBe(5);
    });
  });

  describe("Complex Scenarios", () => {
    test("should handle L-shaped clusters", () => {
      const gridData = [
        [1, 1, 1, 0],
        [1, 0, 1, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(1);
      expect(bfsPrizes[0].link).toBe(8); // L-shaped cluster
    });

    test("should handle multiple complex clusters", () => {
      const gridData = [
        [1, 1, 2, 2, 3],
        [1, 0, 2, 0, 3],
        [1, 1, 2, 2, 3],
        [4, 4, 4, 4, 4],
        [5, 0, 5, 0, 5]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(5); // Five clusters
    });

    test("should handle diagonal-like patterns", () => {
      const gridData = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsPrizes.length).toBe(0); // No connected clusters (diagonal not connected)
    });
  });

  describe("Performance Comparison", () => {
    test("should have similar performance for small grids", () => {
      const gridData = [
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const iterations = 1000000;

      // Test BFS performance
      const bfsStart = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        resetGrid(grid);
        const bfsFinder = new ClusterFindBFS(gridSize, grid);
        bfsFinder.getPrizeList();
      }
      const bfsEnd = process.hrtime.bigint();
      const bfsTime = Number(bfsEnd - bfsStart) / 1000000; // Convert to milliseconds

      // Test HK performance
      const hkStart = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        resetGrid(grid);
        const hkFinder = new ClusterFindHK(gridSize, grid);
        hkFinder.getPrizeList();
      }
      const hkEnd = process.hrtime.bigint();
      const hkTime = Number(hkEnd - hkStart) / 1000000; // Convert to milliseconds

      console.log(`BFS Time: ${bfsTime.toFixed(2)}ms for ${iterations} iterations`);
      console.log(`HK Time: ${hkTime.toFixed(2)}ms for ${iterations} iterations`);
      console.log(`Performance ratio: ${(hkTime / bfsTime).toFixed(2)}x`);

      // Both should complete in reasonable time
      expect(bfsTime).toBeLessThan(1000); // Less than 1 second
      expect(hkTime).toBeLessThan(1000); // Less than 1 second
    });

    test("should handle larger grids efficiently", () => {
      const size = 10;
      const gridData = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => Math.floor(Math.random() * 5) + 1)
      );
      const grid = createGrid(gridData);

      const bfsFinder = new ClusterFindBFS(size, grid);
      const hkFinder = new ClusterFindHK(size, grid);

      const bfsStart = process.hrtime.bigint();
      const bfsPrizes = bfsFinder.getPrizeList();
      const bfsEnd = process.hrtime.bigint();

      const hkStart = process.hrtime.bigint();
      const hkPrizes = hkFinder.getPrizeList();
      const hkEnd = process.hrtime.bigint();

      const bfsTime = Number(bfsEnd - bfsStart) / 1000000;
      const hkTime = Number(hkEnd - hkStart) / 1000000;

      console.log(`10x10 Grid - BFS: ${bfsTime.toFixed(2)}ms, HK: ${hkTime.toFixed(2)}ms`);

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      expect(bfsTime).toBeLessThan(100); // Should be fast
      expect(hkTime).toBeLessThan(100); // Should be fast
    });
  });

  describe("Algorithm Correctness", () => {
    test("should produce identical results for all test cases", () => {
      const testCases = [
        // Simple cases
        [[1, 1], [1, 1]],
        [[1, 2], [2, 1]],
        [[1, 1, 1], [1, 1, 1], [1, 1, 1]],

        // Complex cases
        [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
        [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
        [[1, 1, 0], [1, 0, 1], [0, 1, 1]],

        // Edge cases
        [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
        [[1, 0, 0], [0, 0, 0], [0, 0, 0]],
        [[1, 1, 0], [0, 0, 0], [0, 0, 0]],
      ];

      testCases.forEach((gridData, index) => {
        const grid = createGrid(gridData);
        const gridSize = gridData.length;

        const bfsFinder = new ClusterFindBFS(gridSize, grid);
        const hkFinder = new ClusterFindHK(gridSize, grid);

        const bfsPrizes = bfsFinder.getPrizeList();
        const hkPrizes = hkFinder.getPrizeList();

        expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);
      });
    });

    test("should handle minimum link requirement consistently", () => {
      const gridData = [
        [1, 1, 1, 1, 1, 1], // 6 in a row
        [2, 2, 2, 2, 2, 0], // 5 in a row
        [3, 3, 3, 3, 0, 0], // 4 in a row
        [4, 4, 4, 0, 0, 0], // 3 in a row
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0]
      ];
      const grid = createGrid(gridData);
      const gridSize = gridData.length;

      const bfsFinder = new ClusterFindBFS(gridSize, grid);
      const hkFinder = new ClusterFindHK(gridSize, grid);

      const bfsPrizes = bfsFinder.getPrizeList();
      const hkPrizes = hkFinder.getPrizeList();

      expect(comparePrizeLists(bfsPrizes, hkPrizes)).toBe(true);

      // Only clusters with 5+ links should be included
      const validClusters = bfsPrizes.filter(prize => prize.link >= Config.minLinkRequirement);
      expect(validClusters.length).toBe(2); // 6-symbol and 5-symbol clusters
    });
  });
});
