/*
args:
0: target server name
1: percent of ram to use (optional, default: 0.9)
2: offset between scripts in ms (optional, default: 200)
3: executing server name (optional, default: current server)

plan:
at first do the calculations:
1. find out ram available on executing server
2. calculate weaken threads needed to get to min security
3. calculate grow threads needed to get to max money
4. calculate weaken threads needed to offset grow security increase
5. calculate how many threads of each we can run with available ram

script running order:
1. weaken (if needed)
2. grow (if needed)
3. weaken (to offset grow security increase, if needed)

when the pre weaken threads are not using all available ram, run grow/weaken in parallel, so that is finishes at the same time as the pre weaken (plus some offset)
the grow threads should only use so much ram that the post weaken threads needed to offset the grow security increase from these grow threads can be run with the remaining ram in parallel with the grow threads, the weaken threads should finish at the same time as the grow threads (plus some offset)
so at first we need to calculate the type and number of threads we can run, then the duration of the threads, then the offset to calculate the start time of each script, so they finish in the right order (weaken (pre) -> grow -> weaken (post)) with a small offset between each

after each batch, recalculate the needed threads and start a new batch until the target server is at min security and max money

new plan:
1. calculate needed threads
2. calculate end time (max(weakenTime, growTime) + offset * n - 1 while n is the number of different scripts to run (pre-weaken, grow, post-weaken)
3. start first script
4. wait until it's time to start the next script
5. check if we need to adjust timings (script took longer than expected), if so, adjust the end time and recalculate start times for remaining scripts
...
*/

import { Logger } from "../services/logger";
import { SourceServer } from "../models/sourceServer";
import { TargetServer } from "../models/targetServer";

export async function main(ns: NS): Promise<void> {
    ns.ui.openTail();
    ns.ui.resizeTail(500, 180);
    const logger = new Logger(ns, "info", "prepareServer");
    const targetServerName = ns.args[0]?.toString() || "n00dles";
    const ramUsagePercent = parseFloat(ns.args[1]?.toString() || "90");
    const offsetMs = parseInt(ns.args[2]?.toString() || "100");
    const sourceServerName = ns.args[3]?.toString() || ns.getHostname();
    const sourceServer = new SourceServer(ns, sourceServerName);
    const targetServer = new TargetServer(ns, targetServerName);

    const weakenThreadSize = ns.getScriptRam("batch/weaken.ts", sourceServer.name);
    const growThreadSize = ns.getScriptRam("batch/grow.ts", sourceServer.name);

    while (targetServer.currentMoney < targetServer.maxMoney || targetServer.currentSecurity > targetServer.minSecurity) {
        let preWeakenThreadsNeeded = targetServer.calculateWeakenThreads(sourceServer);
        let growThreadsNeeded = targetServer.calculateGrowThreads(sourceServer);
        logger.debug("preWeakenThreadsNeeded: %s, growThreadsNeeded: %s", preWeakenThreadsNeeded, growThreadsNeeded);

        // calculate threads to run this batch
        let ramAvailable = sourceServer.availableRam * (ramUsagePercent / 100);
        if (ramAvailable < Math.max(weakenThreadSize, growThreadSize)) {
            ns.sleep(10000);
            continue;
        }
        let preWeakenThreads = 0;
        let growThreads = 0;
        let postWeakenThreads = 0;
        if (preWeakenThreadsNeeded > 0) {
            // calculate max threads we can run with available ram
            const maxWeakenThreads = Math.floor(ramAvailable / weakenThreadSize);
            preWeakenThreads = Math.min(preWeakenThreadsNeeded, maxWeakenThreads);
            logger.debug("preWeakenThreads: %s", preWeakenThreads);
            ramAvailable -= preWeakenThreads * weakenThreadSize;
        }
        if (growThreadsNeeded > 0 && ramAvailable > growThreadSize + weakenThreadSize) {
            // calculate max threads we can run with available ram
            const maxGrowThreads = Math.floor(ramAvailable / growThreadSize);
            growThreads = Math.min(growThreadsNeeded, maxGrowThreads);
            postWeakenThreads = targetServer.calculateAdditionalWeakenThreads(growThreads, sourceServer);
            while (postWeakenThreads * weakenThreadSize > ramAvailable - growThreads * growThreadSize && growThreads > 0) {
                // not enough ram to run the needed additional weaken threads, decrease grow threads
                growThreads--;
                postWeakenThreads = targetServer.calculateAdditionalWeakenThreads(growThreads, sourceServer);
            }
            logger.debug("growThreads: %s, postWeakenThreads: %s", growThreads, postWeakenThreads);
        }

        // calculate timings
        const weakenTime = ns.getWeakenTime(targetServer.name);
        const growTime = ns.getGrowTime(targetServer.name);
        let offsetCount = -1;
        if (preWeakenThreads > 0) offsetCount++;
        if (growThreads > 0) offsetCount++;
        if (postWeakenThreads > 0) offsetCount++;
        const batchDuration = Math.max(weakenTime, growTime) + offsetMs * offsetCount;
        const batchEndTime = Date.now() + batchDuration;
        logger.debug("Timings - weakenTime: %s, growTime: %s, batchDuration: %s", weakenTime, growTime, batchDuration);

        // calculate end times
        const preWeakenEnd = batchEndTime - weakenTime - offsetMs * 2;
        const growEnd = batchEndTime - growTime - offsetMs;
        const postWeakenEnd = batchEndTime - weakenTime;

        // log status
        logReport(logger, targetServer, preWeakenThreads, preWeakenThreadsNeeded, growThreads, growThreadsNeeded, postWeakenThreads);

        logger.debug(
            "Server total ram: %s, used: %s, available: %s (using %s% = %s), script ram: weaken=%s, grow=%s, total=%s",
            logger.formatNumber(sourceServer.maxRam),
            logger.formatNumber(sourceServer.usedRam),
            logger.formatNumber(sourceServer.availableRam),
            ramUsagePercent,
            logger.formatNumber((ramUsagePercent / 100) * sourceServer.availableRam),
            logger.formatNumber(weakenThreadSize * preWeakenThreads + weakenThreadSize * postWeakenThreads),
            logger.formatNumber(growThreadSize * growThreads),
            logger.formatNumber(weakenThreadSize * preWeakenThreads + weakenThreadSize * postWeakenThreads + growThreadSize * growThreads)
        );

        // run scripts
        // first find out which script to start first
        // maybe create an array of {script, startTime, threads} and sort by startTime
        const tasks: { script: string; start: number; end: number; threads: number }[] = [];
        if (preWeakenThreads > 0) tasks.push({ script: "weaken", start: preWeakenEnd - weakenTime, end: preWeakenEnd, threads: preWeakenThreads });
        if (growThreads > 0) tasks.push({ script: "grow", start: growEnd - growTime, end: growEnd, threads: growThreads });
        if (postWeakenThreads > 0) tasks.push({ script: "weaken", start: postWeakenEnd - weakenTime, end: postWeakenEnd, threads: postWeakenThreads });

        tasks.sort((a, b) => a.start - b.start);

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            let actualTaskTime = task.script === "weaken" ? ns.getWeakenTime(targetServer.name) : ns.getGrowTime(targetServer.name);
            let timeDiff = task.end - (Date.now() + actualTaskTime);
            while (timeDiff > 0) {
                logger.debug("Sleeping %s ms to sync timings", logger.formatTime(timeDiff));
                await ns.sleep(timeDiff);
                actualTaskTime = task.script === "weaken" ? ns.getWeakenTime(targetServer.name) : ns.getGrowTime(targetServer.name);
                timeDiff = task.end - (Date.now() + actualTaskTime);
            }

            // check if threads > 0 and available ram
            if (task.threads <= 0) {
                logger.warn("Skipping %s: threads <= 0", task.script);
                continue;
            }
            const ramNeeded = (task.script === "weaken" ? weakenThreadSize : growThreadSize) * task.threads;
            if (ramNeeded > sourceServer.maxRam - sourceServer.usedRam) {
                logger.warn("Skipping %s: not enough RAM (%s needed, %s available)", task.script, ramNeeded, sourceServer.maxRam - sourceServer.usedRam);
                logger.terminalLog("Not enough RAM to run %s with %s threads on %s", task.script, task.threads, sourceServer.name);
                continue;
            }
            logger.debug("Running %s with %s threads", task.script, task.threads);
            ns.exec(`batch/${task.script}.ts`, sourceServer.name, task.threads, targetServer.name);
            if (i < tasks.length - 1) {
                const nextTask = tasks[i + 1];
                const totalSleepTime = nextTask.start - Date.now();
                const next = "next task";
                logReport(logger, targetServer, preWeakenThreads, preWeakenThreadsNeeded, growThreads, growThreadsNeeded, postWeakenThreads, next, totalSleepTime);
                let remainingSleep = totalSleepTime;
                while (remainingSleep > 0) {
                    await ns.sleep(Math.max(Math.min(remainingSleep, 1000), 1));
                    remainingSleep = nextTask.start - Date.now();
                    logReport(logger, targetServer, preWeakenThreads, preWeakenThreadsNeeded, growThreads, growThreadsNeeded, postWeakenThreads, next, remainingSleep);
                }
            } else {
                // last task, wait for it to finish
                const totalSleepTime = task.end - Date.now();
                let next = "finished";
                if (preWeakenThreadsNeeded > preWeakenThreads || growThreadsNeeded > growThreads) {
                    next = "next batch";
                }
                logReport(logger, targetServer, preWeakenThreads, preWeakenThreadsNeeded, growThreads, growThreadsNeeded, postWeakenThreads, next, totalSleepTime);
                let remainingSleep = totalSleepTime;
                while (remainingSleep > 0) {
                    await ns.sleep(Math.max(Math.min(remainingSleep, 1000), 1));
                    remainingSleep = task.end - Date.now();
                    logReport(logger, targetServer, preWeakenThreads, preWeakenThreadsNeeded, growThreads, growThreadsNeeded, postWeakenThreads, next, remainingSleep);
                }
            }
        }
        logger.info(
            "Batch complete for %s. Current money: %s/%s, security: %s/%s",
            targetServer.name,
            logger.formatNumber(targetServer.currentMoney),
            logger.formatNumber(targetServer.maxMoney),
            logger.formatNumber(targetServer.currentSecurity),
            logger.formatNumber(targetServer.minSecurity)
        );
    }
    logger.info("%s is fully prepared!", targetServer.name);
    logger.terminalLog("%s is fully prepared!", targetServer.name);
    logger.terminalLog(`Hack: run hack.ts ${targetServer.name}`);
}

function logReport(
    logger: Logger,
    targetServer: TargetServer,
    preWeakenThreads: number,
    preWeakenThreadsNeeded: number,
    growThreads: number,
    growThreadsNeeded: number,
    postWeakenThreads: number,
    next?: string,
    sleep?: number
): void {
    logger.clearLog();
    logger.info("Preparing %s", targetServer.name);
    logger.info(
        "Money: %s/%s, Security: %s/%s",
        logger.formatNumber(targetServer.currentMoney),
        logger.formatNumber(targetServer.maxMoney),
        logger.formatNumber(targetServer.currentSecurity),
        logger.formatNumber(targetServer.minSecurity)
    );
    if (preWeakenThreadsNeeded === 0) {
        logger.info("Weakening done");
    } else {
        logger.info("Weaken Threads: %s of %s", preWeakenThreads, preWeakenThreadsNeeded);
    }
    if (growThreadsNeeded === 0) {
        logger.info("Growing done");
    } else {
        logger.info("Grow Threads:   %s of %s", growThreads, growThreadsNeeded);
    }
    if (postWeakenThreads !== 0) {
        logger.info("Post-Weaken Threads: %s", postWeakenThreads);
    } else {
        logger.info("No Post-Weakening!");
    }
    if (sleep !== undefined && next !== undefined) {
        logger.info("Sleeping %s until %s", logger.formatTime(sleep), next);
    } else {
        logger.info("Preparing...");
    }
}
