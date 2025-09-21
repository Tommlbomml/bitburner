export function calculateGrowThreads(ns: NS, hostname: string, startingMoney: number = ns.getServerMoneyAvailable(hostname), executingHost: string = "home"): number {
    const maxMoney = ns.getServerMaxMoney(hostname);
    if (startingMoney >= maxMoney) {
        return 0;
    }

    const hackingServer = ns.getServer(ns.getHostname());
    const stepExp = 3; // Using powers of 3 for step sizes

    let moneyRatio = maxMoney / (startingMoney + 1); // each thread grows additively + 1 before applying growth factor
    let threads = Math.ceil(ns.growthAnalyze(hostname, moneyRatio, hackingServer.cpuCores));
    let added = threads;
    let step = Math.pow(stepExp, Math.floor(Math.log(threads) / Math.log(stepExp))); // calculate largest power of stepExp <= threads
    while (step > 0) {
        let moneyRatio = maxMoney / (startingMoney + added);
        let requiredThreads = Math.ceil(ns.growthAnalyze(hostname, moneyRatio, hackingServer.cpuCores));
        if (added === requiredThreads) {
            // exit early if we hit the target
            return added;
        }

        if (added > requiredThreads) {
            // too many threads, decrease
            added -= step;
        } else {
            // overshot, one step back
            added += step;
            step = Math.floor(step / 3);
        }
    }
    return added;
}

export function calculateWeakenThreads(ns: NS, hostname: string, startingSecurity: number = ns.getServerSecurityLevel(hostname), executingHost: string = "home"): number {
    const minSecurity = ns.getServerMinSecurityLevel(hostname);
    if (startingSecurity <= minSecurity) {
        return 0;
    }
    const securityToReduce = startingSecurity - minSecurity;
    return Math.ceil(securityToReduce / getWeakenPerThread(ns, executingHost));
}

function getWeakenPerThread(ns: NS, executingHost: string = "home"): number {
    const hackingServer = ns.getServer(executingHost);
    return ns.weakenAnalyze(1, hackingServer.cpuCores);
}

export function calculateHackThreads(ns: NS, hostname: string, percentOfMoney: number, executingHost: string = "home"): number {
    if (percentOfMoney <= 0 || percentOfMoney > 100) {
        throw new Error("Percent of money must be between 0 and 100");
    }

    const maxMoney = ns.getServerMaxMoney(hostname);
    const moneyToHack = (percentOfMoney / 100) * maxMoney;

    return Math.ceil(ns.hackAnalyzeThreads(hostname, moneyToHack));
}

function calculateSecurityIncreaseFromGrowth(ns: NS, hostname: string, growthThreads: number, executingHost: string = "home"): number {
    const hackingServer = ns.getServer(executingHost);
    return ns.growthAnalyzeSecurity(growthThreads, hostname, hackingServer.cpuCores);
}

export function calculateAdditionalWeakenThreads(ns: NS, hostname: string, growThreads: number, executingHost: string = "home"): number {
    const securityIncrease = calculateSecurityIncreaseFromGrowth(ns, hostname, growThreads, executingHost);
    return Math.ceil(securityIncrease / getWeakenPerThread(ns, executingHost));
}

export function getAvailableThreads(ns: NS, fn: "hack" | "grow" | "weaken", executingHost = ns.getHostname()): number {
    const ramPerThread = ns.getScriptRam(`batch/${fn}.ts`, executingHost);
    const maxRam = ns.getServerMaxRam(executingHost);
    const usedRam = ns.getServerUsedRam(executingHost);
    const availableRam = maxRam - usedRam;
    return availableRam > 0 ? Math.floor(availableRam / ramPerThread) : 1;
}

export function getGrowTime(ns: NS, hostname: string): number {
    const growTime = ns.getGrowTime(hostname);
    return growTime;
}

export function getWeakenTime(ns: NS, hostname: string): number {
    const weakenTime = ns.getWeakenTime(hostname);
    return weakenTime;
}

export function getHackTime(ns: NS, hostname: string): number {
    const hackTime = ns.getHackTime(hostname);
    return hackTime;
}
