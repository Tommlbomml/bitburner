export class HacknetNode {
    constructor(private ns: NS, public index: number) {}

    getLevelUpgradeCost(): number {
        return this.ns.hacknet.getLevelUpgradeCost(this.index, 1);
    }
    getRamUpgradeCost(): number {
        return this.ns.hacknet.getRamUpgradeCost(this.index, 1);
    }
    getCoreUpgradeCost(): number {
        return this.ns.hacknet.getCoreUpgradeCost(this.index, 1);
    }

    upgradeLevel(): void {
        this.ns.hacknet.upgradeLevel(this.index, 1);
    }
    upgradeRam(): void {
        this.ns.hacknet.upgradeRam(this.index, 1);
    }
    upgradeCore(): void {
        this.ns.hacknet.upgradeCore(this.index, 1);
    }

    getAdditionalProductionForLevelUpgrade(): number {
        if (this.useFormulasAPI()) {
            const nodeStats = this.ns.hacknet.getNodeStats(this.index);
            let base = this.ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level, nodeStats.ram, nodeStats.cores, this.ns.getHacknetMultipliers().production);
            let level = this.ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level + 1, nodeStats.ram, nodeStats.cores, this.ns.getHacknetMultipliers().production);
            return level - base;
        }

        const production = this.ns.hacknet.getNodeStats(this.index).production;
        const level = this.ns.hacknet.getNodeStats(this.index).level;
        const factor = (level + 1) / level;
        return production * (factor - 1);
    }

    getAdditionalProductionForRamUpgrade(): number {
        if (this.useFormulasAPI()) {
            const nodeStats = this.ns.hacknet.getNodeStats(this.index);
            let base = this.ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level, nodeStats.ram, nodeStats.cores, this.ns.getHacknetMultipliers().production);
            let ram = this.ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level, nodeStats.ram * 2, nodeStats.cores, this.ns.getHacknetMultipliers().production);
            return ram - base;
        }

        const production = this.ns.hacknet.getNodeStats(this.index).production;
        const ram = this.ns.hacknet.getNodeStats(this.index).ram;
        const factor = Math.pow(1.035, ram * 2 - 1) / Math.pow(1.035, ram - 1);
        return production * (factor - 1);
    }

    getAdditionalProductionForCoreUpgrade(): number {
        if (this.useFormulasAPI()) {
            const nodeStats = this.ns.hacknet.getNodeStats(this.index);
            let base = this.ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level, nodeStats.ram, nodeStats.cores, this.ns.getHacknetMultipliers().production);
            let cores = this.ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level, nodeStats.ram, nodeStats.cores + 1, this.ns.getHacknetMultipliers().production);
            return cores - base;
        }

        const production = this.ns.hacknet.getNodeStats(this.index).production;
        const cores = this.ns.hacknet.getNodeStats(this.index).cores;
        const factor = (cores + 6) / 6 / ((cores + 5) / 6);
        return production * (factor - 1);
    }

    getLevelROI(): number {
        const cost = this.getLevelUpgradeCost();
        const additionalProduction = this.getAdditionalProductionForLevelUpgrade();
        return additionalProduction / cost;
    }

    getRamROI(): number {
        const cost = this.getRamUpgradeCost();
        const additionalProduction = this.getAdditionalProductionForRamUpgrade();
        return additionalProduction / cost;
    }

    getCoreROI(): number {
        const cost = this.getCoreUpgradeCost();
        const additionalProduction = this.getAdditionalProductionForCoreUpgrade();
        return additionalProduction / cost;
    }

    getBestUpgradeROI(): number {
        return Math.max(this.getLevelROI(), this.getRamROI(), this.getCoreROI());
    }

    upgradeBest(): void {
        const levelROI = this.getLevelROI();
        const ramROI = this.getRamROI();
        const coreROI = this.getCoreROI();

        if (levelROI >= ramROI && levelROI >= coreROI) {
            this.upgradeLevel();
        } else if (ramROI >= coreROI) {
            this.upgradeRam();
        } else {
            this.upgradeCore();
        }
    }

    private useFormulasAPI(): boolean {
        return this.ns.fileExists("Formulas.exe", "home");
    }
}
