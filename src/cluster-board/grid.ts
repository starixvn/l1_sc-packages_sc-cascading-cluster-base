class Grid {
    public symbol: number;
    public used: boolean;
    public isDetonated: boolean;

    constructor(symbol: number) {
        this.symbol = symbol;
        this.used = false;
        this.isDetonated = false;
    }
}

export default Grid;
