import { BaseServer } from "./baseServer";
import { SourceServer } from "./sourceServer";

export enum PortType {
    SSH,
    FTP,
    HTTP,
    SMTP,
    SQL,
}

export class TargetServer extends BaseServer {
    declare readonly name: string;
    readonly minSecurity: number;
    readonly maxMoney: number;

    constructor(private ns: NS, hostname: string) {
        super(hostname);
        this.minSecurity = ns.getServer(this.name).minDifficulty ?? 0;
        this.maxMoney = ns.getServer(this.name).moneyMax ?? 0;
    }

    get currentMoney(): number {
        return this.ns.getServer(this.name).moneyAvailable ?? 0;
    }

    get currentSecurity(): number {
        return this.ns.getServer(this.name).hackDifficulty ?? 0;
    }

    get openPorts(): number {
        return this.ns.getServer(this.name).openPortCount ?? 0;
    }

    get isBackdoorInstalled(): boolean {
        return this.ns.getServer(this.name).backdoorInstalled ?? false;
    }

    get reqiredPorts(): number {
        return this.ns.getServer(this.name).numOpenPortsRequired ?? 0;
    }

    get requiredHacking(): number {
        return this.ns.getServer(this.name).requiredHackingSkill ?? 0;
    }

    get canNuke(): boolean {
        return this.openPorts >= this.reqiredPorts;
    }

    get sshPortOpen(): boolean {
        return this.ns.getServer(this.name).sshPortOpen;
    }

    get ftpPortOpen(): boolean {
        return this.ns.getServer(this.name).ftpPortOpen;
    }

    get httpPortOpen(): boolean {
        return this.ns.getServer(this.name).httpPortOpen;
    }

    get smtpPortOpen(): boolean {
        return this.ns.getServer(this.name).smtpPortOpen;
    }

    get sqlPortOpen(): boolean {
        return this.ns.getServer(this.name).sqlPortOpen;
    }

    get isRooted(): boolean {
        return this.ns.getServer(this.name).hasAdminRights;
    }

    isPortOpen(type: PortType): boolean {
        switch (type) {
            case PortType.SSH:
                return this.sshPortOpen;
            case PortType.FTP:
                return this.ftpPortOpen;
            case PortType.HTTP:
                return this.httpPortOpen;
            case PortType.SMTP:
                return this.smtpPortOpen;
            case PortType.SQL:
                return this.sqlPortOpen;
        }
    }

    calculateWeakenThreads(sourceServer: SourceServer): number {
        if (this.currentSecurity <= this.minSecurity) {
            return 0;
        }
        const securityToReduce = this.currentSecurity - this.minSecurity;
        return Math.ceil(securityToReduce / this.getWeakenPerThread(sourceServer));
    }

    getWeakenPerThread(sourceServer: SourceServer): number {
        return this.ns.weakenAnalyze(1, sourceServer.cores);
    }

    calculateGrowThreads(sourceServer: SourceServer): number {
        const stepExp = 3; // Using powers of 3 for step sizes

        if (this.currentMoney >= this.maxMoney) {
            return 0;
        }
        let moneyRatio = this.maxMoney / (this.currentMoney + 1); // each thread grows additively + 1 before applying growth factor
        let threads = Math.ceil(this.ns.growthAnalyze(this.name, moneyRatio, sourceServer.cores));
        let step = Math.pow(stepExp, Math.floor(Math.log(threads) / Math.log(stepExp))); // calculate largest power of stepExp <= threads
        while (step > 0) {
            moneyRatio = this.maxMoney / (this.currentMoney + threads);
            let requiredThreads = Math.ceil(this.ns.growthAnalyze(this.name, moneyRatio, sourceServer.cores));
            if (threads === requiredThreads) {
                // exit early if we hit the target
                return threads;
            }
            if (threads > requiredThreads) {
                // too many threads, decrease
                threads -= step;
            } else {
                // overshot, one step back
                threads += step;
                step = Math.floor(step / 3);
            }
        }
        return threads;
    }

    calculateAdditionalWeakenThreads(growThreads: number, sourceServer: SourceServer): number {
        const securityIncrease = this.calculateSecurityIncreaseFromGrowth(growThreads, sourceServer);
        return Math.ceil(securityIncrease / this.getWeakenPerThread(sourceServer));
    }

    calculateSecurityIncreaseFromGrowth(growthThreads: number, sourceServer: SourceServer): number {
        return this.ns.growthAnalyzeSecurity(growthThreads, this.name, sourceServer.cores);
    }
}
