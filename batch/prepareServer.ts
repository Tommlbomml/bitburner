export async function main(ns: NS): Promise<void> {
    const targetServerName = ns.args[0].toString();
    const executingServerName = ns.getHostname();
    let executingServer = ns.getServer(executingServerName);
    let targetServer = ns.getServer(targetServerName);
    const maxMoney = targetServer.moneyMax ?? 0;
    const minSecurity = targetServer.minDifficulty ?? 0;
    let currentMoney = targetServer.moneyAvailable ?? 0;
    let currentSecurity = targetServer.hackDifficulty ?? 0;

    while (currentMoney < maxMoney || currentSecurity > minSecurity) {
        const weakenPerThread = ns.weakenAnalyze(1, executingServer.cpuCores);
        const weakenMaxThreads = Math.ceil((100 - minSecurity) / weakenPerThread);
        const weakenThreadsNeedeBeforeGrow = Math.ceil((currentSecurity - minSecurity) / weakenPerThread);
        //ns.tprint('weakenThreadsNeedeBeforeGrow: '+weakenThreadsNeedeBeforeGrow);
        let money = currentMoney;
        money = Math.max(money, 1);
        const moneyNeed = maxMoney - money;
        const growthFactorNeeded = moneyNeed / money + 1;
        const growthThreadsNeeded = Math.ceil(ns.growthAnalyze(targetServerName, growthFactorNeeded, executingServer.cpuCores));
        //ns.tprint('growthThreadsNeeded: '+growthThreadsNeeded);
        const growthSecurityIncrease = ns.growthAnalyzeSecurity(growthThreadsNeeded, targetServerName, executingServer.cpuCores);
        const weakenThreadsNeededAfterGrow = Math.min(Math.ceil(growthSecurityIncrease / weakenPerThread), weakenMaxThreads);
        //ns.tprint('weakenThreadsNeededAfterGrow: '+weakenThreadsNeededAfterGrow);

        executingServer = ns.getServer(executingServerName); // update ram info
        let ramAvailable = executingServer.maxRam - executingServer.ramUsed;
        ramAvailable *= 0.9; // some ram as buffer
        if (weakenThreadsNeedeBeforeGrow) {
            const weakenNumThreadsBefore = Math.min(weakenThreadsNeedeBeforeGrow, Math.floor(ramAvailable / ns.getScriptRam("batch/weaken.ts", executingServerName)));
            //ns.tprint('weakenNumThreadsBefore: '+weakenNumThreadsBefore);
            ramAvailable -= weakenNumThreadsBefore * ns.getScriptRam("batch/weaken.ts", executingServerName);
            if (weakenNumThreadsBefore) {
                ns.exec("batch/weaken.ts", executingServerName, weakenNumThreadsBefore, targetServerName, "pre");
            }
        }
        if (growthThreadsNeeded) {
            const growthNumThreads = Math.min(growthThreadsNeeded, Math.floor(ramAvailable / ns.getScriptRam("batch/grow.ts", executingServerName)));
            //ns.tprint('growthNumThreads: '+growthNumThreads);
            ramAvailable -= growthNumThreads * ns.getScriptRam("batch/grow.ts", executingServerName);
            if (growthNumThreads) {
                ns.exec("batch/grow.ts", executingServerName, growthNumThreads, targetServerName);
            }
        }
        if (weakenThreadsNeededAfterGrow) {
            const weakenNumThreadsAfter = Math.min(weakenThreadsNeededAfterGrow, Math.floor(ramAvailable / ns.getScriptRam("batch/weaken.ts", executingServerName)));
            //ns.tprint('weakenNumThreadsAfter: '+weakenNumThreadsAfter);
            ramAvailable -= weakenNumThreadsAfter * ns.getScriptRam("batch/weaken.ts", executingServerName);
            if (weakenNumThreadsAfter) {
                ns.exec("batch/weaken.ts", executingServerName, weakenNumThreadsAfter, targetServerName, "post");
            }
        }

        const sleepTime = Math.ceil(Math.max(ns.getWeakenTime(targetServerName), ns.getGrowTime(targetServerName))) + 200;
        await ns.sleep(sleepTime);
        targetServer = ns.getServer(targetServerName);
        currentMoney = targetServer.moneyAvailable ?? 0;
        currentSecurity = targetServer.hackDifficulty ?? 0;
    }
    //ns.tprint('server '+targetServerName+' ready');
}
