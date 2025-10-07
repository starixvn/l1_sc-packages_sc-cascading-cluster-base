class Config {
    public static readonly scatterSymbol: number = 8;
    public static readonly space: number = 9;

    public static readonly featureRageMeterRequire: number[] = [15, 30, 50, 80];

    // space is 8, Scatter is 9
    public static readonly minLinkRequirement: number = 5;

    public static readonly phase4replaceSymbol = [0, 1, 2, 3];
    public static readonly phase4replaceSymbolWeight = [10, 12, 14, 15];
}

export default Config;
