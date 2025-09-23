import { SlotGameDefinition } from "sc-slot-game-base";

export type CascadingClusterGameDefinition = SlotGameDefinition & {
    durations: {
        wholeRound: number;
        beforeJackpot: number;
        afterJackpot: number;
    };
};
