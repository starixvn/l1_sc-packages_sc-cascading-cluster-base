import BoardGenerator from "./board-generator";
import NgResult from "./ng-result";
import Prize from "./prize";
import { ResultCategory } from "./result";
import RoundCalculator from "./round-calculator";
import Statistician from "./Statistician";

function simulate() {
    const stat = new Statistician();
    const totalRounds = 1_000_000;
    const generator = new BoardGenerator();
    const gameData = {
        baseBet: 1,
    };
}
