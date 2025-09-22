import Coordinate from "./coordinate";

class Prize {
    public symbol: number;
    public link: number;
    public position: Coordinate[];
    public winScore: number;
    public multiplier: number;
    public odds: number;

    constructor() {
        this.symbol = 0;
        this.link = 0;
        this.position = [];
        this.winScore = 0;
        this.multiplier = 1;
        this.odds = 0;
    }
}

export default Prize;
