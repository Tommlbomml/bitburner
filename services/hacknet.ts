import { HacknetNode } from "../models/hacknet-node";
import { Logger } from "./logger";

export class HacknetService {
    private readonly ns: NS;
    private readonly logger: Logger;
    private readonly percentOfMoneyUsed: number; // Percentage of money to use for purchases, default is 0.1%
    private maxNodes: number;
    private currentNodeCount: number;

    constructor(ns: NS, percentOfMoneyUsed: number = 0.1) {
        this.ns = ns;
        this.logger = new Logger(ns, "info");
        this.percentOfMoneyUsed = percentOfMoneyUsed;
        this.maxNodes = ns.hacknet.maxNumNodes();
        this.currentNodeCount = ns.hacknet.numNodes();
    }

    public async manageHacknet(): Promise<void> {
        while (this.isAnythingAvailable()) {
            await this.purchaseNodesAsync();
            await this.purchaseUpgradesAsync();
            await this.ns.sleep(10000);
        }
    }

    private async purchaseNodesAsync(): Promise<void> {
        let nodesPurchased: number = 0;
        while (this.isNodeAvailable() && this.isNodeAffordable()) {
            this.ns.hacknet.purchaseNode();
            this.currentNodeCount++;
            nodesPurchased++;
            await this.ns.sleep(10);
        }

        this.logBoughtNodes(nodesPurchased);
    }

    private async purchaseUpgradesAsync(): Promise<void> {
        const levelsPurchased = await this.purchaseLevelUpgradesAsync();
        const ramsPurchased = await this.purchaseRamUpgradesAsync();
        const coresPurchased = await this.purchaseCoreUpgradesAsync();

        this.logBoughtUpgrades(levelsPurchased, ramsPurchased, coresPurchased);
    }

    private async purchaseLevelUpgradesAsync(): Promise<number> {
        let levelsPurchased = 0;
        let lastNode: HacknetNode | null = null;
        let lastCost: number = Infinity;
        while (true) {
            const node = this.getCheapestAffordableLevelUpgradeNode();
            if (!node) break;
            const cost = node.getLevelUpgradeCost();
            if (node === lastNode && cost === lastCost) {
                this.logger.warn(`Level upgrade purchase stalled for node ${node.index} (cost: ${cost})`);
                break;
            }
            node.upgradeLevel();
            this.logger.debug(`Level upgrade purchased for node ${node.index} (cost: ${cost})`);
            levelsPurchased++;
            lastNode = node;
            lastCost = cost;
            await this.ns.sleep(10);
        }
        return levelsPurchased;
    }

    private async purchaseRamUpgradesAsync(): Promise<number> {
        let ramsPurchased = 0;
        let lastNode: HacknetNode | null = null;
        let lastCost: number = Infinity;
        while (true) {
            const node = this.getCheapestAffordableRamUpgradeNode();
            if (!node) break;
            const cost = node.getRamUpgradeCost();
            if (node === lastNode && cost === lastCost) {
                this.logger.warn(`RAM upgrade purchase stalled for node ${node.index} (cost: ${cost})`);
                break;
            }
            node.upgradeRam();
            this.logger.debug(`RAM upgrade purchased for node ${node.index} (cost: ${cost})`);
            ramsPurchased++;
            lastNode = node;
            lastCost = cost;
            await this.ns.sleep(10);
        }
        return ramsPurchased;
    }

    private async purchaseCoreUpgradesAsync(): Promise<number> {
        let coresPurchased = 0;
        let lastNode: HacknetNode | null = null;
        let lastCost: number = Infinity;
        while (true) {
            const node = this.getCheapestAffordableCoreUpgradeNode();
            if (!node) break;
            const cost = node.getCoreUpgradeCost();
            if (node === lastNode && cost === lastCost) {
                this.logger.warn(`Core upgrade purchase stalled for node ${node.index} (cost: ${cost})`);
                break;
            }
            node.upgradeCore();
            this.logger.debug(`Core upgrade purchased for node ${node.index} (cost: ${cost})`);
            coresPurchased++;
            lastNode = node;
            lastCost = cost;
            await this.ns.sleep(10);
        }
        return coresPurchased;
    }

    private isAnythingAvailable(): boolean {
        return this.isNodeAvailable() || this.isLevelUpgradeAvailable() || this.isRamUpgradeAvailable() || this.isCoreUpgradeAvailable();
    }

    private isNodeAvailable(): boolean {
        return this.currentNodeCount < this.maxNodes;
    }

    private isNodeAffordable(): boolean {
        const cost = this.ns.hacknet.getPurchaseNodeCost();
        return cost <= this.getAvailableMoney();
    }

    private isLevelUpgradeAvailable(): boolean {
        return this.getNodes().some((node) => node.getLevelUpgradeCost() < Infinity);
    }

    private isRamUpgradeAvailable(): boolean {
        return this.getNodes().some((node) => node.getRamUpgradeCost() < Infinity);
    }

    private isCoreUpgradeAvailable(): boolean {
        return this.getNodes().some((node) => node.getCoreUpgradeCost() < Infinity);
    }

    private getAvailableMoney(): number {
        return this.ns.getServerMoneyAvailable("home") * (this.percentOfMoneyUsed / 100);
    }

    private getCheapestAffordableLevelUpgradeNode(): HacknetNode | null {
        const nodes = this.getNodes();
        let cheapestNode: HacknetNode | null = null;
        let cheapestCost = Infinity;
        for (const node of nodes) {
            const cost = node.getLevelUpgradeCost();
            if (cost < cheapestCost && cost <= this.getAvailableMoney()) {
                cheapestCost = cost;
                cheapestNode = node;
            }
        }
        return cheapestNode;
    }

    private getCheapestAffordableRamUpgradeNode(): HacknetNode | null {
        const nodes = this.getNodes();
        let cheapestNode: HacknetNode | null = null;
        let cheapestCost = Infinity;
        for (const node of nodes) {
            const cost = node.getRamUpgradeCost();
            if (cost < cheapestCost && cost <= this.getAvailableMoney()) {
                cheapestCost = cost;
                cheapestNode = node;
            }
        }
        return cheapestNode;
    }

    private getCheapestAffordableCoreUpgradeNode(): HacknetNode | null {
        const nodes = this.getNodes();
        let cheapestNode: HacknetNode | null = null;
        let cheapestCost = Infinity;
        for (const node of nodes) {
            const cost = node.getCoreUpgradeCost();
            if (cost < cheapestCost && cost <= this.getAvailableMoney()) {
                cheapestCost = cost;
                cheapestNode = node;
            }
        }
        return cheapestNode;
    }

    private logBoughtNodes(count: number): void {
        if (count > 0) {
            this.logger.info(`Purchased ${count} nodes (total owned: ${this.currentNodeCount} / ${this.maxNodes})`);
        }
    }

    private logBoughtUpgrades(levels: number, rams: number, cores: number): void {
        if (levels > 0 || rams > 0 || cores > 0) {
            this.logger.info(`Purchased ${levels} level upgrades, ${rams} RAM upgrades, and ${cores} core upgrades`);
        }
    }

    private getNodes(): HacknetNode[] {
        return Array.from({ length: this.currentNodeCount }, (_, i) => new HacknetNode(this.ns, i));
    }
}
