class Coordinate {
    public x: number;
    public y: number;
    public symbol?: number;

    constructor(x: number, y: number, symbol?: number) {
        this.x = x;
        this.y = y;
        this.symbol = symbol;
    }
}

export default Coordinate;
