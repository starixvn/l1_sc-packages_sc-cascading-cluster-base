module.exports = async () => {
    return {
        preset: "ts-jest",
        rootDir: "./",
        verbose: true,
        transformIgnorePatterns: [
            "node_modules/(?!(sc-base-database|sc-common|sc-game-base|sc-base-apis|sc-api-client|jest-auto-fixture|sc-slot-game-base|axios|sc-game-management-client|nanoid|crypto-random-string|@sc/user-tracking-client|openid-client|oauth4webapi|jose|chance)/)",
        ],
        testEnvironment: "node",
        testResultsProcessor: "jest-sonar-reporter",
        setupFilesAfterEnv: ["jest-extended/all"],
    };
};
