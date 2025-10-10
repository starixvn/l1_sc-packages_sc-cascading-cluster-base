export interface Player {
    UID: string;
    profile: {
        name: string;
    };
    usePromotion: boolean;
    promotion: {
        promotionId: string;
        endDate: Date;
    };
    session: {
        totalAmount: number;
    };
}
