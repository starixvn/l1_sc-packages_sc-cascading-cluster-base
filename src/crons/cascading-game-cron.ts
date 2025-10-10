import cron from "cron";
import mongoose from "mongoose";
import { Core } from "sc-game-base";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { Crons, EventConsumers, SlotGameData, SlotGameDefinition } from "sc-slot-game-base";
import { SlotGameBot } from "sc-slot-game-base/dist/crons";
import { CascadingBoardGenerator } from "../board";
import { FreeSpinStateConsumer, FreeSpinsConsumer, PromotionFreeSpinsConsumer, SettleGameRoundConsumer } from "../event-consumers";
import CascadingClusterGameData from "../game-data";
import { CascadingClusterGameDefinition } from "../game-definition";
import { Round } from "../models/interfaces";

export default class CascadingGameCron extends Crons.SlotGameCron {
    declare freeSpinStateConsumer: FreeSpinStateConsumer;
    declare boardGenerator: CascadingBoardGenerator;
    declare gameData: CascadingClusterGameData;
    declare definition: CascadingClusterGameDefinition;

    constructor({
        definition,
        gameData,
        bot,
        settleGameRoundConsumer,
        freeSpinsConsumer,
        idCountersConsumer,
        gameStatusPublisher,
        runningRoundInfoPublisher,
        logService,
        roundsRepository,
        roundIdConsumer,
        gameManagementApiClientFactory,
        freeSpinStateConsumer,
        boardGenerator,
        promotionFreeSpinsConsumer,
    }: {
        definition: SlotGameDefinition;
        gameData: SlotGameData;
        bot: SlotGameBot;
        settleGameRoundConsumer: SettleGameRoundConsumer;
        freeSpinsConsumer: FreeSpinsConsumer;
        idCountersConsumer: EventConsumers.IdCountersConsumer;
        gameStatusPublisher: Core.BaseEventPublishers.GameStatusPublisher;
        runningRoundInfoPublisher: Core.BaseEventPublishers.RunningRoundInfoPublisher;
        logService: any;
        roundsRepository: mongoose.Model<Round>;
        roundIdConsumer: EventConsumers.IdCountersConsumer;
        gameManagementApiClientFactory: GameManagementApiClientFactory;
        freeSpinStateConsumer: FreeSpinStateConsumer;
        boardGenerator: CascadingBoardGenerator;
        promotionFreeSpinsConsumer: PromotionFreeSpinsConsumer;
    }) {
        super({
            definition,
            gameData,
            bot,
            settleGameRoundConsumer,
            gameStatusPublisher,
            runningRoundInfoPublisher,
            logService,
            roundsRepository,
            freeSpinsConsumer,
            idCountersConsumer,
            roundIdConsumer,
            gameManagementApiClientFactory,
            promotionFreeSpinsConsumer,
        } as any);

        this.freeSpinStateConsumer = freeSpinStateConsumer;
        this.boardGenerator = boardGenerator;
    }

    async start() {
        this.gameData.roundId = await this.idCountersConsumer.getLatestId("round");
        this.gameData.freeSpinId = await this.idCountersConsumer.getLatestId("freespin");

        if (this.gameData.roundId < 1 && this.gameData.freeSpinId < 1) {
            const { roundId, freeSpinId } = await this.getLastArchiveRound(undefined);

            await this.idCountersConsumer.updateLatestId("round", roundId);
            await this.idCountersConsumer.updateLatestId("freespin", freeSpinId);

            this.gameData.roundId = roundId;
            this.gameData.freeSpinId = freeSpinId;

            this.logService.logError(
                `${this.definition.name} get roundId #${this.gameData.roundId} and freeSpinId #${this.gameData.freeSpinId} from archive.`
            );
        }

        this.checkPromotionReadiness();
        await this.loadUnsettledBetsToIngame();
        await this.freeSpinsConsumer.reload();
        await this.freeSpinStateConsumer.reload();

        await this.getSettingForNewRound();
        await this.updateExchangeRates();
        await this.promotionFreeSpinsConsumer.loadPromotionsRunning();
        this.initTrialMode();

        const job = new cron.CronJob(
            "* * * * * *",
            () => this.proceed().catch(this.logService.logError),
            () => {
                this.logService.logError(
                    `${this.definition.name} unexpectedly stopped at round #${this.gameData.roundId} because some other tasks halt it.`
                );
                job.start();
            }
        );

        job.start();
    }

    async proceed() {
        const { durations } = this.definition;

        if (this.gameData.remainingTime === durations.wholeRound) {
            await this.checkGameStatus();
            this.bot && (await this.bot.reset());
        }

        if (!this.gameData.disabled) {
            this.gameData.remainingTime--;
            this.bot && (await this.bot.run());
        }

        if (this.gameData.remainingTime < 0) {
            this.gameData.remainingTime = durations.wholeRound;

            await this.promotionFreeSpinsConsumer.loadPromotionsRunning();
            await this.freeSpinsConsumer.reload();
            await this.freeSpinStateConsumer.reload();
        }
        await this.promotionFreeSpinsConsumer.checkExpiry(this.gameData.gameConfigs.gameId);
    }

    async checkGameStatus() {
        await super.checkGameStatus();

        if (!this.gameData.disabled) {
            // TODO: Update board config
            // const { multiplierBonus, mode: difficulty } = this.gameData.gameConfigs.cascadingClusterConfig;
            // this.boardGenerator.updateBoardConfig(difficulty, multiplierBonus.min, multiplierBonus.max);
        }
    }

    initTrialMode() {}
}
