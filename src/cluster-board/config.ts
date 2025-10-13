class Config {
    public static readonly scatterSymbol: number = 8;
    public static readonly space: number = 9;

    public static readonly featureRageMeterRequire: Record<number, number> = {
        1: 15,
        2: 30,
        3: 50,
        4: 80,
    };

    // space is 8, Scatter is 9
    public static readonly minLinkRequirement: number = 5;

    public static readonly phase4replaceSymbol = [0, 1, 2, 3];
    public static readonly phase4replaceSymbolWeight = [10, 12, 14, 15];

    public static readonly scatterWeight: number[] = [90, 1, 1];
    public static readonly scatterCounts: { min: number; max: number }[] = [
        { min: 4, max: 9 },
        { min: 10, max: 14 },
        { min: 16, max: 20 },
    ];
}

export default Config;
