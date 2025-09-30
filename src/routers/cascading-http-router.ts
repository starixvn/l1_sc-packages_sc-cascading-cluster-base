import { utils } from "sc-common";
import { Core } from "sc-game-base";
import defaultDefinition from "../board/default-definition";
import { TumbleCalculator } from "../board";
import { CascadingBoardGenerator } from "../board";
import CascadingClusterGameData from "../game-data";

export default class CascadingHttpRouter extends Core.Routers.HttpRouter {
    declare tumbleCalculator: TumbleCalculator;
    declare boardGenerator: CascadingBoardGenerator;
    declare gameData: CascadingClusterGameData;

    constructor(appConfigs, gameData, tumbleCalculator, boardGenerator, logService, historyQuery, metricQuery) {
        super(appConfigs, gameData, historyQuery, metricQuery, logService);

        this.tumbleCalculator = tumbleCalculator;
        this.boardGenerator = boardGenerator;
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
    }

    handleSetBoard(params, res) {
        try {
            if (this.appConfigs.sentry.env !== "PROD") {
                if (!params || !params.name || !params.result) {
                    this.logService.logError("receives a result cheating call with invalid params.");
                    res.send({ error: true });

                    return;
                }

                this.logService.logWarning(`receives a result cheating call for ${params?.name} with the board as ${params.result}.`);

                this.gameData.settlementResultFromAdmin[params.name] = params.result;

                res.send(
                    {
                        success: true,
                        result: params.result,
                    }
                );
            } else {
                res.send({ noPermission: true });
            }
        } catch (error) {
            this.logService.logError(error);
            res.send({ error: true });
        }
    }
}
