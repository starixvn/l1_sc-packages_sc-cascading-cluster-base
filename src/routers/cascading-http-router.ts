import { utils } from "sc-common";
import { Core } from "sc-game-base";
import CascadingClusterGameData from "../game-data";

export default class CascadingHttpRouter extends Core.Routers.HttpRouter {
    declare gameData: CascadingClusterGameData;

    constructor(appConfigs, gameData, logService, historyQuery, metricQuery) {
        super(appConfigs, gameData, historyQuery, metricQuery, logService);
    }

    init(app) {
        super.init(app);

        app.post(
            "/api/set-result",
            utils.authentication.useAuthenticate({
                authUrl: this.appConfigs.apiSettings.authUrl,
                audiences: this.appConfigs.authenticateSettings.audiences,
            }),
            (_req, res) => this.handleSetBoard(_req.body, res)
        );

        //For testing
        app.post("/api/set-result-test", (_req, res) => this.handleSetBoard(_req.body, res));
    }

    handleSetBoard(params, res) {
        try {
            if (this.appConfigs.sentry.env !== "PROD") {
                if (!params?.name || !params?.result) {
                    this.logService.logError("receives a result cheating call with invalid params.");
                    res.send({ error: true });
                    return;
                }

                this.logService.logWarning(`receives a result cheating call for ${params?.name} with the board as ${params.result}.`);

                this.gameData.settlementResultFromAdmin[params.name] = params.result;

                res.send({
                    success: true
                });
            } else {
                res.send({ noPermission: true });
            }
        } catch (error) {
            this.logService.logError(error);
            res.send({ error: true });
        }
    }
}
