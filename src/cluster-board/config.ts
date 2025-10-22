class Config {
    public static readonly scatterSymbol: number = 8;
    public static readonly space: number = 9;

    public static readonly featureRageMeterRequire: Record<number, number> = {
        1: 12,
        2: 25,
        3: 40,
        4: 60,
    };

    // space is 8, Scatter is 9
    public static readonly minLinkRequirement: number = 5;

    public static readonly phase4replaceSymbol = [0, 1, 2, 3];
    public static readonly phase4replaceSymbolWeight = [10, 12, 14, 16];

    public static readonly scatterWeightForSupper: number[] = [783, 265, 10, 5];
    public static readonly scatterWeight: number[] = [859, 150, 20, 10];
    public static readonly scatterCounts: number[] = [3, 4, 5, 6];
}

export default Config;
