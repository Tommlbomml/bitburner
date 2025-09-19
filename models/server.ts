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

    async weaken(threads: number): Promise<boolean> {
        const pid = this.ns.exec("batch/weaken.ts", "home", threads, this.hostname);
        if (pid === 0) {
            return false;
        }
        while (this.ns.isRunning(pid, "home")) {
            await this.ns.sleep(100);
        }
        return true;
    }

    async grow(threads: number): Promise<boolean> {
        const pid = this.ns.exec("batch/grow.ts", "home", threads, this.hostname);
        if (pid === 0) {
            return false;
        }
        while (this.ns.isRunning(pid, "home")) {
            await this.ns.sleep(100);
        }
        return true;
    }

    async hack(threads: number): Promise<boolean> {
        const pid = this.ns.exec("batch/hack.ts", "home", threads, this.hostname);
        if (pid === 0) {
            return false;
        }
        while (this.ns.isRunning(pid, "home")) {
            await this.ns.sleep(100);
        }
        return true;
    }

    private canNuke(): boolean {
        return this.ns.getServerNumPortsRequired(this.hostname) <= this.countAvailablePortHackers();
    }

    private openPorts(): void {
        if (this.ns.fileExists("BruteSSH.exe", "home")) {
            this.ns.brutessh(this.hostname);
        }
        if (this.ns.fileExists("FTPCrack.exe", "home")) {
            this.ns.ftpcrack(this.hostname);
        }
        if (this.ns.fileExists("relaySMTP.exe", "home")) {
            this.ns.relaysmtp(this.hostname);
        }
        if (this.ns.fileExists("HTTPWorm.exe", "home")) {
            this.ns.httpworm(this.hostname);
        }
        if (this.ns.fileExists("SQLInject.exe", "home")) {
            this.ns.sqlinject(this.hostname);
        }
    }

    private countAvailablePortHackers(): number {
        let count = 0;
        if (this.ns.fileExists("BruteSSH.exe", "home")) count++;
        if (this.ns.fileExists("FTPCrack.exe", "home")) count++;
        if (this.ns.fileExists("relaySMTP.exe", "home")) count++;
        if (this.ns.fileExists("HTTPWorm.exe", "home")) count++;
        if (this.ns.fileExists("SQLInject.exe", "home")) count++;
        return count;
    }
}
