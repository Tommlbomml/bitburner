export function executeScript(ns: NS, script: string, host: string = "home", threads: number = 1, ...args: any[]): number {
    if (!ns.fileExists(script, host)) {
        ns.tprint(`Script ${script} does not exist on host ${host}.`);
        return 0;
    }
    if (ns.getServer(host).maxRam < ns.getScriptRam(script) * threads) {
        ns.tprint(`Not enough RAM on host ${host} to run ${threads} threads of ${script}.`);
        return 0;
    }
    if (threads < 1) {
        ns.tprint(`Threads must be at least 1 to run ${script} on ${host}. Given: ${threads}`);
        return 0;
    }
    return ns.exec(script, host, threads, ...args);
}

export async function executeAndWait(ns: NS, script: string, host: string = "home", threads: number = 1, checkInterval: number = 100, ...args: any[]): Promise<boolean> {
    const pid = executeScript(ns, script, host, threads, ...args);
    if (pid === 0) {
        return false;
    }
    while (ns.isRunning(pid, host)) {
        await ns.sleep(checkInterval);
    }
    return true;
}

export function isServerGettingPrepared(ns: NS, serverName: string): boolean {
    return isScriptRunningWithArgOnAnyHost(ns, "batch/prepareServer.ts", serverName);
}

export function isServerGettingHacked(ns: NS, serverName: string): boolean {
    return isScriptRunningWithArgOnAnyHost(ns, "hack.ts", serverName);
}

export function isScriptRunningWithArg(ns: NS, scriptName: string, host: string, arg: string): boolean {
    const processes = ns.ps(host);
    return processes.some((proc) => proc.filename === scriptName && proc.args.includes(arg));
}

export function isScriptRunningWithArgOnAnyHost(ns: NS, scriptName: string, arg: string): boolean {
    const allHosts = scanAllServers(ns);
    return allHosts.some((host) => isScriptRunningWithArg(ns, scriptName, host, arg));
}

// Helper to recursively scan all servers
export function scanAllServers(ns: NS, start: string = "home", visited: Set<string> = new Set()): string[] {
    if (visited.has(start)) return [];
    visited.add(start);
    const neighbors = ns.scan(start);
    return [start, ...neighbors.flatMap((n) => scanAllServers(ns, n, visited))];
}
