import { openPorts, countAvailablePortHackers } from "../utils/port.helper";
import { ScriptName } from "../utils/file.helper";
import { executeAndWait } from "../utils/process.helper";
import { calculateGrowThreads, calculateWeakenThreads, calculateHackThreads, calculateAdditionalWeakenThreads } from "../utils/thread.helper";

export class Server {
    constructor(private ns: NS, public hostname: string) {}

    getMaxMoney(): number {
        return this.ns.getServerMaxMoney(this.hostname);
    }

    getMoneyAvailable(): number {
        return this.ns.getServerMoneyAvailable(this.hostname);
    }

    getMinSecurity(): number {
        return this.ns.getServerMinSecurityLevel(this.hostname);
    }

    getSecurity(): number {
        return this.ns.getServerSecurityLevel(this.hostname);
    }

    getMaxRam(): number {
        return this.ns.getServerMaxRam(this.hostname);
    }

    getUsedRam(): number {
        return this.ns.getServerUsedRam(this.hostname);
    }

    getRootAccess(): boolean {
        if (this.ns.hasRootAccess(this.hostname)) {
            return true;
        }
        if (this.canNuke()) {
            this.openPorts();
            return this.ns.nuke(this.hostname);
        }
        return false;
    }

    async weaken(threads: number = 1, executingHost: string = "home"): Promise<boolean> {
        return await executeAndWait(this.ns, ScriptName.WEAKEN, executingHost, threads, 100, this.hostname);
    }

    async grow(threads: number = 1, executingHost: string = "home"): Promise<boolean> {
        return await executeAndWait(this.ns, ScriptName.GROW, executingHost, threads, 100, this.hostname);
    }

    async hack(threads: number = 1, executingHost: string = "home"): Promise<boolean> {
        return await executeAndWait(this.ns, ScriptName.HACK, executingHost, threads, 100, this.hostname);
    }

    calculateGrowThreads(executingHost: string): number {
        return calculateGrowThreads(this.ns, this.hostname, this.getMoneyAvailable(), executingHost);
    }

    calculateWeakenThreads(executingHost: string): number {
        return calculateWeakenThreads(this.ns, this.hostname, this.getSecurity(), executingHost);
    }

    calculateHackThreads(percentOfMoney: number, executingHost: string): number {
        return calculateHackThreads(this.ns, this.hostname, percentOfMoney, executingHost);
    }

    calculateAdditionalWeakenThreads(growThreads: number): number {
        return calculateAdditionalWeakenThreads(this.ns, this.hostname, growThreads);
    }

    private canNuke(): boolean {
        return this.ns.getServerNumPortsRequired(this.hostname) <= countAvailablePortHackers(this.ns);
    }

    private openPorts(): void {
        openPorts(this.ns, this.hostname);
    }
}
