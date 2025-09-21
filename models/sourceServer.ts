import { BaseServer } from "./baseServer";

export class SourceServer extends BaseServer {
    readonly cores: number;
    readonly maxRam: number;

    constructor(private ns: NS, hostname: string) {
        super(hostname);
        this.cores = ns.getServer(this.name).cpuCores;
        this.maxRam = ns.getServer(this.name).maxRam;
    }

    get usedRam(): number {
        return this.ns.getServer(this.name).ramUsed;
    }

    get availableRam(): number {
        return this.maxRam - this.usedRam;
    }
}
