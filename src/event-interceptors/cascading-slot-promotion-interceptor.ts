import { EventInterceptors } from "sc-slot-game-base";

declare module "sc-slot-game-base" {
    namespace EventInterceptors {
        interface SlotPromotionInterceptor {
            completePromotion(player: any): Promise<void>;
        }
    }
}

export default class CascadingSlotPromotionInterceptor extends EventInterceptors.SlotPromotionInterceptor {
    declare gamePromotionApiClient: any;
    declare placeBetPublisher: any;
    declare definition: any;

    shouldCompletePromotion(player: {
        promotion: {
            remainingBonusItems: number;
            freeSpinAvailable: number;
        };
        reachMaxWin: boolean;
    }) {
        return (player.promotion.remainingBonusItems === 0 && player.promotion.freeSpinAvailable <= 0) || player.reachMaxWin;
    }

    async completePromotion(player: any) {
        await super.completePromotion(player);
        delete player.reachMaxWin;
        delete player.promotion;
    }
}
