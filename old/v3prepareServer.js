/** @param {NS} ns */
export async function main(ns) {
    let hackedServerName = ns.args[0];
    let hackingServerName = ns.getHostname();
    let hackingServer = ns.getServer(hackingServerName);
    let hackedServer = ns.getServer(hackedServerName);

    while (hackedServer.moneyAvailable < hackedServer.moneyMax || hackedServer.hackDifficulty > hackedServer.minDifficulty) {
        let weakenPerThread = ns.weakenAnalyze(1, hackingServer.cpuCores);
        let weakenMaxThreads = Math.ceil((100 - hackedServer.minDifficulty) / weakenPerThread);
        let weakenThreadsNeedeBeforeGrow = Math.ceil((hackedServer.hackDifficulty - hackedServer.minDifficulty) / weakenPerThread);
        //ns.tprint('weakenThreadsNeedeBeforeGrow: '+weakenThreadsNeedeBeforeGrow);
        let money = hackedServer.moneyAvailable;
        money = Math.max(money, 0.01);
        let moneyNeed = hackedServer.moneyMax - money;
        let growthFactorNeeded = moneyNeed / money + 1;
        let growthThreadsNeeded = Math.ceil(ns.growthAnalyze(hackedServerName, growthFactorNeeded, hackingServer.cpuCores));
        //ns.tprint('growthThreadsNeeded: '+growthThreadsNeeded);
        let growthSecurityIncrease = ns.growthAnalyzeSecurity(growthThreadsNeeded, hackedServerName, hackingServer.cpuCores);
        let weakenThreadsNeededAfterGrow = Math.min(Math.ceil(growthSecurityIncrease / weakenPerThread), weakenMaxThreads);
        //ns.tprint('weakenThreadsNeededAfterGrow: '+weakenThreadsNeededAfterGrow);

        let ramAvailable = hackingServer.maxRam - hackingServer.ramUsed;
        ramAvailable *= 0.9; // some ram as buffer
        if (weakenThreadsNeedeBeforeGrow) {
            let weakenNumThreadsBefore = Math.min(weakenThreadsNeedeBeforeGrow, Math.floor(ramAvailable / ns.getScriptRam("weaken.js", hackingServerName)));
            //ns.tprint('weakenNumThreadsBefore: '+weakenNumThreadsBefore);
            ramAvailable -= weakenNumThreadsBefore * ns.getScriptRam("weaken.js", hackingServerName);
            if (weakenNumThreadsBefore) {
                ns.exec("weaken.js", hackingServerName, weakenNumThreadsBefore, hackedServerName, "pre");
            }
        }
        if (growthThreadsNeeded) {
            let growthNumThreads = Math.min(growthThreadsNeeded, Math.floor(ramAvailable / ns.getScriptRam("grow.js", hackingServerName)));
            //ns.tprint('growthNumThreads: '+growthNumThreads);
            ramAvailable -= growthNumThreads * ns.getScriptRam("grow.js", hackingServerName);
            if (growthNumThreads) {
                ns.exec("grow.js", hackingServerName, growthNumThreads, hackedServerName);
            }
        }
        if (weakenThreadsNeededAfterGrow) {
            let weakenNumThreadsAfter = Math.min(weakenThreadsNeededAfterGrow, Math.floor(ramAvailable / ns.getScriptRam("weaken.js", hackingServerName)));
            //ns.tprint('weakenNumThreadsAfter: '+weakenNumThreadsAfter);
            ramAvailable -= weakenNumThreadsAfter * ns.getScriptRam("weaken.js", hackingServerName);
            if (weakenNumThreadsAfter) {
                ns.exec("weaken.js", hackingServerName, weakenNumThreadsAfter, hackedServerName, "post");
            }
        }

        let sleepTime = Math.ceil(Math.max(ns.getWeakenTime(hackedServerName), ns.getGrowTime(hackedServerName))) + 200;
        await ns.sleep(sleepTime);
        hackedServer = ns.getServer(hackedServerName);
    }
    //ns.tprint('server '+hackedServerName+' ready');
}
