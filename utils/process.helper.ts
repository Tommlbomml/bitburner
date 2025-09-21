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
