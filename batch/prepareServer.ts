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
*/

import { Logger } from "../services/logger";
import { SourceServer } from "../models/sourceServer";
import { TargetServer } from "../models/targetServer";

export async function main(ns: NS): Promise<void> {
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
        let preWeakenThreads = 0;
        let growThreads = 0;
        let postWeakenThreads = 0;
        if (preWeakenThreadsNeeded > 0) {
            // calculate max threads we can run with available ram
            const maxWeakenThreads = Math.floor(ramAvailable / weakenThreadSize);
            preWeakenThreads = Math.min(preWeakenThreadsNeeded, maxWeakenThreads);
            logger.debug("preWeakenThreads: %s", preWeakenThreads);
            preWeakenThreadsNeeded -= preWeakenThreads;
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
        const endTime = Math.max(weakenTime, growTime) + offsetMs * 2;
        logger.debug("Timings - weakenTime: %s, growTime: %s, endTime: %s", weakenTime, growTime, endTime);

        // calculate start times
        let preWeakenStart = endTime - weakenTime - offsetMs * 2;
        let growStart = endTime - growTime - offsetMs;
        let postWeakenStart = endTime - weakenTime;
        if (preWeakenThreads === 0) {
            // no pre weaken, move grow and post weaken earlier
            growStart -= offsetMs;
            postWeakenStart -= offsetMs;
        }
        logger.debug("Start times - preWeakenStart: %s, growStart: %s, postWeakenStart: %s", preWeakenStart, growStart, postWeakenStart);

        // log what we are going to do
        logger.info(
            "Preparing %s: preWeakenThreads=%s, growThreads=%s, postWeakenThreads=%s (needed: preWeaken=%s, grow=%s)",
            targetServer.name,
            preWeakenThreads,
            growThreads,
            postWeakenThreads,
            preWeakenThreadsNeeded + preWeakenThreads,
            growThreadsNeeded
        );
        logger.info(
            "Server total ram: %s, used: %s, available: %s (using %s% = %s), script ram: weaken=%s, grow=%s, total=%s",
            logger.humanReadableNumber(sourceServer.maxRam),
            logger.humanReadableNumber(sourceServer.usedRam),
            logger.humanReadableNumber(sourceServer.availableRam),
            ramUsagePercent,
            logger.humanReadableNumber((ramUsagePercent / 100) * sourceServer.availableRam),
            logger.humanReadableNumber(weakenThreadSize * preWeakenThreads + weakenThreadSize * postWeakenThreads),
            logger.humanReadableNumber(growThreadSize * growThreads),
            logger.humanReadableNumber(weakenThreadSize * preWeakenThreads + weakenThreadSize * postWeakenThreads + growThreadSize * growThreads)
        );

        // run scripts
        // first find out which script to start first
        // maybe create an array of {script, startTime, threads} and sort by startTime
        const tasks: { script: string; start: number; threads: number }[] = [
            { script: "weaken", start: preWeakenStart, threads: preWeakenThreads },
            { script: "grow", start: growStart, threads: growThreads },
            { script: "weaken", start: postWeakenStart, threads: postWeakenThreads },
        ];

        tasks.sort((a, b) => a.start - b.start);

        let extraSleptMs = 0;
        for (let i = 0; i < tasks.length; i++) {
            // TODO: we need to recalculate the times because if our hacking skill has increased while sleeping, the times will change
            // or if the target server security/money has changed, the needed threads will change
            // for now we just assume they are the same during the batch
            let actualTaskTime = tasks[i].script === "weaken" ? ns.getWeakenTime(targetServer.name) : ns.getGrowTime(targetServer.name);
            let expectedTaskTime = tasks[i].script === "weaken" ? weakenTime : growTime;
            while (expectedTaskTime > actualTaskTime) {
                const sleepTime = expectedTaskTime - actualTaskTime - extraSleptMs;
                expectedTaskTime = actualTaskTime;
                logger.debug("Sleeping %s ms to sync timings", logger.humanReadableTime(sleepTime));
                await ns.sleep(sleepTime);
                extraSleptMs += sleepTime;
                actualTaskTime = tasks[i].script === "weaken" ? ns.getWeakenTime(targetServer.name) : ns.getGrowTime(targetServer.name);
            }

            const task = tasks[i];
            // check if threads > 0 and available ram
            if (task.threads <= 0) {
                logger.debug("Skipping %s: threads <= 0", task.script);
                continue;
            }
            const ramNeeded = (task.script === "weaken" ? weakenThreadSize : growThreadSize) * task.threads;
            if (ramNeeded > sourceServer.maxRam - sourceServer.usedRam) {
                logger.debug("Skipping %s: not enough RAM (%s needed, %s available)", task.script, ramNeeded, sourceServer.maxRam - sourceServer.usedRam);
                logger.warn("Not enough RAM to run %s with %s threads on %s", task.script, task.threads, sourceServer.name);
                continue;
            }
            logger.info("Running %s with %s threads at %s ms", task.script, task.threads, task.start);

            ns.exec(`batch/${task.script}.ts`, sourceServer.name, task.threads, targetServer.name);
            if (i < tasks.length - 1) {
                const nextTask = tasks[i + 1];
                const sleepTime = nextTask.start - task.start;
                logger.info("Sleeping %s ms until next task", logger.humanReadableTime(sleepTime));
                await ns.sleep(sleepTime);
            } else {
                // last task, wait for it to finish
                const sleepTime = endTime - task.start;
                logger.info("Sleeping %s ms until end of batch", logger.humanReadableTime(sleepTime));
                await ns.sleep(sleepTime);
            }
        }
        logger.info(
            "Batch complete for %s. Current money: %s/%s, security: %s/%s",
            targetServer.name,
            logger.humanReadableNumber(targetServer.currentMoney),
            logger.humanReadableNumber(targetServer.maxMoney),
            logger.humanReadableNumber(targetServer.currentSecurity),
            logger.humanReadableNumber(targetServer.minSecurity)
        );
    }
    logger.info("%s is fully prepared!", targetServer.name);
    logger.terminalLog("%s is fully prepared!", targetServer.name);
    logger.terminalLog(`Hack: run hack.ts ${targetServer.name}`);
}
