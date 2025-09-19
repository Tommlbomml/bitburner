import { Logger } from "./logger";
import { Server } from "../models/server";

export class HackingService {
    private readonly ns: NS;
    private readonly logger: Logger;
    private readonly target: Server;

    constructor(ns: NS, target: string = "n00dles") {
        this.ns = ns;
        this.logger = new Logger(ns, "info", "HackingService");
        this.target = new Server(ns, target);
    }

    public async hackLoop(): Promise<void> {
        if (!this.target.getRootAccess()) {
            this.logger.error("No root access to target");
            return;
        }

        while (true) {
            await this.prepareTarget();
            await this.performHack();
            await this.ns.sleep(1000);
        }
    }

    private async prepareTarget(): Promise<void> {
        const minSec = this.target.getMinSecurity();
        const curSec = this.target.getSecurity();
        const maxMoney = this.target.getMaxMoney();
        const curMoney = this.target.getMoneyAvailable();

        if (curSec > minSec + 5) {
            const threads = Math.max(1, Math.floor(this.getAvailableThreads("weaken")));
            this.logger.info("Weakening %s with %s threads (security: %s)", this.target.hostname, threads, curSec);
            const weakened = await this.target.weaken(threads);
            if (!weakened) {
                this.logger.error("Failed to weaken %s", this.target.hostname);
            }
        } else if (curMoney < maxMoney * 0.75) {
            const threads = Math.max(1, Math.floor(this.getAvailableThreads("grow")));
            this.logger.info("Growing %s with %s threads (money: %s/%s)", this.target.hostname, threads, curMoney, maxMoney);
            const grown = await this.target.grow(threads);
            if (!grown) {
                this.logger.error("Failed to grow %s", this.target.hostname);
            }
        }
    }

    private async performHack(): Promise<void> {
        const threads = Math.max(1, Math.floor(this.getAvailableThreads("hack")));
        this.logger.info("Hacking %s with %s threads", this.target.hostname, threads);
        const hacked = await this.target.hack(threads);
        if (!hacked) {
            this.logger.error("Failed to hack %s", this.target.hostname);
        }
    }

    private getAvailableThreads(fn: "hack" | "grow" | "weaken"): number {
        const ramPerThread = this.ns.getScriptRam(`batch/${fn}.ts`, "home");
        const maxRam = this.ns.getServerMaxRam("home");
        const usedRam = this.ns.getServerUsedRam("home");
        const availableRam = maxRam - usedRam;
        return availableRam > 0 ? Math.floor(availableRam / ramPerThread) : 1;
    }
}
