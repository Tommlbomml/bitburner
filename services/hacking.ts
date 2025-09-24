import { Logger } from "./logger";
import { Server } from "../models/server";
import { getAvailableThreads } from "../utils/thread.helper";

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
        let weakenThreads = this.target.calculateWeakenThreads(this.ns.getHostname());
        let growThreads = this.target.calculateGrowThreads(this.ns.getHostname());
        let additionalWeakenThreads = this.target.calculateAdditionalWeakenThreads(growThreads);

        while (weakenThreads > 0) {
            this.logger.debug(
                "Security: %s (min: %s) (%s%)",
                this.logger.formatNumber(this.target.getSecurity()),
                this.logger.formatNumber(this.target.getMinSecurity()),
                this.logger.formatNumber((this.target.getSecurity() / this.target.getMinSecurity()) * 100)
            );
            const maxWeakenThreads = getAvailableThreads(this.ns, "weaken");
            if (maxWeakenThreads <= 0) {
                await this.ns.sleep(10000);
                this.logger.warn("No available RAM to weaken, waiting...");
                continue;
            }
            const threads = Math.min(weakenThreads, maxWeakenThreads);
            this.logger.info("Weakening %s with %s threads", this.target.hostname, threads);
            const weakened = await this.target.weaken(threads);
            if (!weakened) {
                this.logger.error("Failed to weaken %s", this.target.hostname);
            }
            weakenThreads = this.target.calculateWeakenThreads(this.ns.getHostname());
            this.logger.debug(
                "Security: %s (min: %s) (%s%)",
                this.logger.formatNumber(this.target.getSecurity()),
                this.logger.formatNumber(this.target.getMinSecurity()),
                this.logger.formatNumber((this.target.getSecurity() / this.target.getMinSecurity()) * 100)
            );
        }
        while (growThreads > 0) {
            this.logger.debug(
                "Money: %s (max: %s) (%s%)",
                this.logger.formatNumber(this.target.getMoneyAvailable()),
                this.logger.formatNumber(this.target.getMaxMoney()),
                this.logger.formatNumber((this.target.getMoneyAvailable() / this.target.getMaxMoney()) * 100)
            );
            const maxGrowThreads = getAvailableThreads(this.ns, "grow");
            if (maxGrowThreads <= 0) {
                await this.ns.sleep(10000);
                this.logger.warn("No available RAM to grow, waiting...");
                continue;
            }
            const threads = Math.min(growThreads, maxGrowThreads);
            this.logger.info("Growing %s with %s threads", this.target.hostname, threads);
            const grown = await this.target.grow(threads);
            if (!grown) {
                this.logger.error("Failed to grow %s", this.target.hostname);
            }
            growThreads = this.target.calculateGrowThreads(this.ns.getHostname());
            this.logger.debug(
                "Money: %s (max: %s) (%s%)",
                this.logger.formatNumber(this.target.getMoneyAvailable()),
                this.logger.formatNumber(this.target.getMaxMoney()),
                this.logger.formatNumber((this.target.getMoneyAvailable() / this.target.getMaxMoney()) * 100)
            );
        }
        while (additionalWeakenThreads > 0) {
            this.logger.debug(
                "Security: %s (min: %s) (%s%)",
                this.logger.formatNumber(this.target.getSecurity()),
                this.logger.formatNumber(this.target.getMinSecurity()),
                this.logger.formatNumber((this.target.getSecurity() / this.target.getMinSecurity()) * 100)
            );
            const maxWeakenThreads = getAvailableThreads(this.ns, "weaken");
            if (maxWeakenThreads <= 0) {
                await this.ns.sleep(10000);
                this.logger.warn("No available RAM to weaken, waiting...");
                continue;
            }
            const threads = Math.min(additionalWeakenThreads, maxWeakenThreads);
            this.logger.info("Weakening %s with %s additional threads", this.target.hostname, threads);
            const weakened = await this.target.weaken(threads);
            if (!weakened) {
                this.logger.error("Failed to weaken %s", this.target.hostname);
            }
            additionalWeakenThreads = this.target.calculateAdditionalWeakenThreads(growThreads);
            this.logger.debug(
                "Security: %s (min: %s) (%s%)",
                this.logger.formatNumber(this.target.getSecurity()),
                this.logger.formatNumber(this.target.getMinSecurity()),
                this.logger.formatNumber((this.target.getSecurity() / this.target.getMinSecurity()) * 100)
            );
        }
    }

    private async performHack(): Promise<void> {
        this.logger.debug(
            "Money: %s (max: %s) (%s%)",
            this.logger.formatNumber(this.target.getMoneyAvailable()),
            this.logger.formatNumber(this.target.getMaxMoney()),
            this.logger.formatNumber((this.target.getMoneyAvailable() / this.target.getMaxMoney()) * 100)
        );
        let hackThreads = this.target.calculateHackThreads(10, this.ns.getHostname());
        while (hackThreads > 0) {
            const maxHackThreads = getAvailableThreads(this.ns, "hack");
            if (maxHackThreads <= 0) {
                await this.ns.sleep(10000);
                this.logger.warn("No available RAM to hack, waiting...");
                continue;
            }
            const threads = Math.min(hackThreads, maxHackThreads);
            this.logger.info("Hacking %s with %s threads", this.target.hostname, threads);
            const hacked = await this.target.hack(threads);
            if (!hacked) {
                this.logger.error("Failed to hack %s", this.target.hostname);
            }
            hackThreads -= threads;
        }
        this.logger.debug(
            "Money: %s (max: %s) (%s%)",
            this.logger.formatNumber(this.target.getMoneyAvailable()),
            this.logger.formatNumber(this.target.getMaxMoney()),
            this.logger.formatNumber((this.target.getMoneyAvailable() / this.target.getMaxMoney()) * 100)
        );
    }
}
