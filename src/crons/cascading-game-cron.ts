import cron from "cron";
import { Crons, SlotGameData, SlotGameDefinition, EventConsumers, EventPublishers } from "sc-slot-game-base";
import { SlotGameBot } from "sc-slot-game-base/dist/crons";
import { FreeSpinsConsumer, SettleGameRoundConsumer, TotalMultiplierConsumer } from "../event-consumers";
import { Core } from "sc-game-base";
import { CascadingBoardGenerator } from "../board";
import { Round } from "../models/interfaces";
import mongoose from "mongoose";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { PromotionFreeSpinsConsumer } from "../event-consumers";
import CascadingClusterGameData from "../game-data";
import { CascadingClusterGameDefinition } from "../game-definition";

export default class CascadingGameCron extends Crons.SlotGameCron {
    declare totalMultiplierConsumer: TotalMultiplierConsumer;
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
        totalMultiplierConsumer,
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
        totalMultiplierConsumer: TotalMultiplierConsumer;
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

        this.totalMultiplierConsumer = totalMultiplierConsumer;
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
        await this.totalMultiplierConsumer.reload();

        await this.getSettingForNewRound();
        await this.updateExchangeRates();
        await this.promotionFreeSpinsConsumer.loadPromotionsRunning();
        // this.boardGenerator.initialize();
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
            await this.totalMultiplierConsumer.reload();
        }
        await this.promotionFreeSpinsConsumer.checkExpiry(this.gameData.gameConfigs.gameId);
    }

    async checkGameStatus() {
        await super.checkGameStatus();

        if (!this.gameData.disabled) {
            ///TODO: Update board config
            //const { multiplierBonus, mode: difficulty } = this.gameData.gameConfigs.cascadingClusterConfig;
            //this.boardGenerator.updateBoardConfig(difficulty, multiplierBonus.min, multiplierBonus.max);
        }
    }

    initTrialMode() {}
}
