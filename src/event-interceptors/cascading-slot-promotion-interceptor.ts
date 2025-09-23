import { EventInterceptors } from "sc-slot-game-base";

export default class CascadingSlotPromotionInterceptor extends EventInterceptors.SlotPromotionInterceptor {
    shouldCompletePromotion(player: {
        promotion: {
            remainingBonusItems: number;
            freeSpinAvailable: number;
        };
    }) {
        return player.promotion.remainingBonusItems === 0 && player.promotion.freeSpinAvailable <= 0;
    }
}
