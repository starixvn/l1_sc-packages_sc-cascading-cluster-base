class Statistician {
    public totalWin: number;
    public ngTotalWin: number;
    public hitFreq: number;
    public ngHitFreq: number;
    public fgHitFreq: number;
    public fgTotalWin: number;
    public fgTriggerFreq: number;
    public MSE: number;
    public ngCascadeFreq: number;
    public fgCascadeFreq: number;
    public maxWin: number;
    public ngPrizeDist: number[];
    public fgPrizeDist: number[];
    public ngRageMeterFreq: number[];
    public fgRageMeterFreq: number[];

    constructor() {
        this.totalWin = 0;
        this.ngTotalWin = 0;
        this.hitFreq = 0;
        this.ngHitFreq = 0;
        this.fgHitFreq = 0;
        this.fgTotalWin = 0;
        this.fgTriggerFreq = 0;
        this.MSE = 0;
        this.ngCascadeFreq = 0;
        this.fgCascadeFreq = 0;
        this.maxWin = 0;
        this.ngPrizeDist = new Array(10).fill(0);
        this.fgPrizeDist = new Array(10).fill(0);
        this.ngRageMeterFreq = new Array(4).fill(0);
        this.fgRageMeterFreq = new Array(4).fill(0);
    }
}

export default Statistician;
