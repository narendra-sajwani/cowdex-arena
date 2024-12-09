import { BigNumber } from 'ethers';

type PoolKey = {
    token0: string;
    token1: string;
    fee: number;
};

type Task = {
    zeroForOne: boolean;
    amountSpecified: bigint;
    sqrtPriceLimitX96: bigint;
    sender: `0x${string}`;
    poolId: `0x${string}`;
    poolKey: PoolKey;
    taskCreatedBlock: number;
    taskId: number;
    poolOutputAmount: bigint | null;
    poolInputAmount: bigint | null;
};

class AdvancedCowMatcher {
    private tasks: Task[];
    private compatibilityGraph: Map<number, Set<number>>;
    private weightedMatchGraph: Map<number, Map<number, bigint>>;

    constructor(tasks: Task[]) {
        this.tasks = tasks;
        this.compatibilityGraph = new Map();
        this.weightedMatchGraph = new Map();
    }

    private buildCompatibilityGraph() {
        for (let i = 0; i < this.tasks.length; i++) {
            const compatibleTasks = new Set<number>();

            for (let j = 0; j < this.tasks.length; j++) {
                if (i !== j && this.areTasksCompatible(this.tasks[i], this.tasks[j])) {
                    compatibleTasks.add(this.tasks[j].taskId);
                }
            }

            this.compatibilityGraph.set(this.tasks[i].taskId, compatibleTasks);
        }
    }

    private areTasksCompatible(task1: Task, task2: Task): boolean {
        // Opposite trade directions
        if (task1.zeroForOne === task2.zeroForOne) return false;

        // Pool key compatibility
        const sameTokenPair =
            (task1.poolKey.token0 === task2.poolKey.token0 &&
                task1.poolKey.token1 === task2.poolKey.token1);

        return sameTokenPair;
    }

    private calculateMatchWeight(task1: Task, task2: Task): bigint {
        // Complex weight calculation considering:
        // 1. Potential output improvement
        // 2. Transaction complexity
        // 3. Slippage reduction

        const poolOutput1 = task1.poolOutputAmount ?? 0n;
        const poolOutput2 = task2.poolOutputAmount ?? 0n;

        // Placeholder for weight calculation
        return poolOutput1 + poolOutput2;
    }

    private buildWeightedMatchGraph() {
        for (const [taskId, compatibleTasks] of this.compatibilityGraph.entries()) {
            const taskWeights = new Map<number, bigint>();

            const currentTask = this.tasks.find(t => t.taskId === taskId);
            if (!currentTask) continue;

            for (const compatibleTaskId of compatibleTasks) {
                const compatibleTask = this.tasks.find(t => t.taskId === compatibleTaskId);
                if (!compatibleTask) continue;

                const matchWeight = this.calculateMatchWeight(currentTask, compatibleTask);
                taskWeights.set(compatibleTaskId, matchWeight);
            }

            this.weightedMatchGraph.set(taskId, taskWeights);
        }
    }

    private findParetoEfficientMatches(): Task[] {
        const matchedTasks = new Set<number>();
        const finalMatches: Task[] = [];

        // Sort tasks by potential match weight
        const sortedTaskIds = Array.from(this.weightedMatchGraph.keys()).sort((a, b) => {
            const weightsA = this.weightedMatchGraph.get(a) ?? new Map();
            const weightsB = this.weightedMatchGraph.get(b) ?? new Map();

            const maxWeightA = Math.max(...Array.from(weightsA.values()).map(Number));
            const maxWeightB = Math.max(...Array.from(weightsB.values()).map(Number));

            return Number(maxWeightB - maxWeightA);
        });

        for (const taskId of sortedTaskIds) {
            if (matchedTasks.has(taskId)) continue;

            const compatibleWeights = this.weightedMatchGraph.get(taskId);
            if (!compatibleWeights) continue;

            const bestMatchTaskId = Array.from(compatibleWeights.entries())
                .filter(([matchId]) => !matchedTasks.has(matchId))
                .sort(([, weightA], [, weightB]) => Number(weightB - weightA))[0]?.[0];

            if (bestMatchTaskId === undefined) continue;

            const task1 = this.tasks.find(t => t.taskId === taskId);
            const task2 = this.tasks.find(t => t.taskId === bestMatchTaskId);

            if (task1 && task2) {
                finalMatches.push(task1, task2);
                matchedTasks.add(taskId);
                matchedTasks.add(bestMatchTaskId);
            }
        }

        return finalMatches;
    }

    public performCoWMatching(): Task[] {
        this.buildCompatibilityGraph();
        this.buildWeightedMatchGraph();
        return this.findParetoEfficientMatches();
    }
}

export default AdvancedCowMatcher;