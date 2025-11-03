import Coordinate from "./coordinate";

export class SymbolCoordinate extends Coordinate {
    public symbol: number;
    constructor(x: number, y: number, symbol: number) {
        super(x, y);
        this.symbol = symbol;
    }
}
