import { asClass, asValue } from "awilix";
import { SlotContainerRegistry } from "sc-slot-game-base";
import { TumbleCalculator } from "./board";
import defaultDefinition from "./board/default-definition";
import BoardGenerator from "./cluster-board/board-generator";
import RoundCalculator from "./cluster-board/round-calculator";
import { CascadingBot, CascadingGameCron, CascadingProcessBetQueue } from "./crons";
import {
    FreeSpinStateConsumer,
    FreeSpinsConsumer,
    InGameConsumer,
    PlaceBetConsumer,
    PromotionFreeSpinsConsumer,
    SettleGameRoundConsumer,
    UserSignInConsumer,
} from "./event-consumers";
import { CascadingSlotPromotionInterceptor } from "./event-interceptors";
import { HistoryQuery } from "./query-apis";
import HttpRouter from "./routers/cascading-http-router";

export default class CascadingSlotContainerRegistry extends SlotContainerRegistry {
    register(appConfigs, definition, gameData) {
        this.registerBoardUtilities();
        super.register(appConfigs, definition, gameData);

        return this.container;
    }

    registerBoardUtilities() {
        this.container.register({
            boardSettings: asValue(defaultDefinition.boardSettings),
        });

        this.container.register({
            tumbleCalculator: asClass(TumbleCalculator),
            roundCalculator: asClass(RoundCalculator).proxy(),
            boardGenerator: asClass(BoardGenerator).singleton().proxy(),
        });
    }

    registerRouters() {
        super.registerRouters();

        this.container.register({
            httpRouter: asClass(HttpRouter),
        });
    }

    registerConsumers() {
        super.registerConsumers();

        this.container.register({
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            freeSpinStateConsumer: asClass(FreeSpinStateConsumer).singleton(),
            freeSpinsConsumer: asClass(FreeSpinsConsumer).singleton(),
            inGameConsumer: asClass(InGameConsumer).singleton().proxy(),
            userSignInConsumer: asClass(UserSignInConsumer).singleton().proxy(),
            promotionFreeSpinsConsumer: asClass(PromotionFreeSpinsConsumer).singleton().proxy(),
        });
    }

    registerApis() {
        super.registerApis();

        this.container.register({
            historyQuery: asClass(HistoryQuery).singleton(),
        });
    }

    registerCrons() {
        super.registerCrons();

        this.container.register({
            bot: asClass(CascadingBot).singleton().proxy(),
            gameCron: asClass(CascadingGameCron).singleton().proxy(),
            processBetQueue: asClass(CascadingProcessBetQueue).singleton().proxy(),
        });
    }

    registerInterceptors() {
        super.registerInterceptors();

        this.container.register({
            promotionBetInterceptor: asClass(CascadingSlotPromotionInterceptor).singleton().proxy(),
        });
    }
}
