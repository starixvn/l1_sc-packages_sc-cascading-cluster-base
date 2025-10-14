import { Core } from "sc-game-base";
import { EventConsumers } from "sc-slot-game-base";
export default class CascadingBot extends Core.Crons.BaseBot {
    declare idCountersConsumer: EventConsumers.IdCountersConsumer;
    constructor({ definition, gameData, idCountersConsumer, gameManagementApiClientFactory }) {
        super(definition, gameData, gameManagementApiClientFactory);

        this.idCountersConsumer = idCountersConsumer;
    }

    async placeBet() {
        this.gameData.roundId = await this.idCountersConsumer.consume("round");
    }
}
