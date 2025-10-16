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
    public static readonly phase4replaceSymbolWeight = [8, 12, 14, 16];

    public static readonly scatterWeight: number[] = [90, 8, 2];
    public static readonly scatterCounts: number[] = [4, 5, 6];
}

export default Config;
