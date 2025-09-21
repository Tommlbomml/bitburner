import { BaseServer } from "./baseServer";

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

    get requredHacking(): number {
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
}
