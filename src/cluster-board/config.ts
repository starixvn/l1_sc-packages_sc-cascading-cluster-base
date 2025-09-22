class Config {
    public static readonly SC: number = 9;
    public static readonly space: number = 10;
    
    // Configuration
    public static readonly payout: number[][] = [
        [0],
        [
            0, 0, 0, 0, 0, 1.0, 1.2, 1.5, 2.0, 2.5, 5.0, 8.0, 15.0, 30.0, 60.0,
            250.0,
        ], // 1
        [
            0, 0, 0, 0, 0, 0.8, 1.0, 1.2, 1.5, 2.0, 4.0, 6.0, 12.0, 25.0, 50.0,
            120.0,
        ], // 2
        [
            0, 0, 0, 0, 0, 0.6, 0.8, 1.0, 1.2, 1.5, 3.0, 5.0, 10.0, 20.0, 40.0,
            100.0,
        ], // 3
        [
            0, 0, 0, 0, 0, 0.5, 0.6, 0.8, 1.0, 1.2, 2.5, 4.0, 8.0, 15.0, 30.0,
            60.0,
        ], // 4
        [
            0, 0, 0, 0, 0, 0.4, 0.5, 0.6, 0.8, 1.0, 2.0, 3.0, 5.0, 10.0, 20.0,
            40.0,
        ], // 5
        [
            0, 0, 0, 0, 0, 0.3, 0.4, 0.5, 0.6, 0.8, 1.5, 2.5, 4.0, 8.0, 15.0,
            30.0,
        ], // 6
        [
            0, 0, 0, 0, 0, 0.25, 0.3, 0.4, 0.5, 0.6, 1.2, 2.0, 3.0, 6.0, 12.0,
            25.0,
        ], // 7
        [
            0, 0, 0, 0, 0, 0.2, 0.25, 0.3, 0.4, 0.5, 1.0, 1.5, 2.5, 5.0, 10.0,
            20.0,
        ], // 8
    ];

    public static readonly featureRageMeterRequire: number[] = [15, 30, 50, 80];

    // space is 8, Scatter is 9
    public static readonly fgRoundsArray: number[] = [0, 0, 0, 10, 15, 20, 25];

    public static readonly minLinkRequirement: number = 5;
}

export default Config;
