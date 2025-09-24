/*
args:
0: target server name
1: dedicated server name (optional, default: current server)
2: percent of ram to use (optional, default: 90, all on dedicated servers)
3: offset between script ends in a batch in ms (optional, default: 100)

plan:
at first do the calculations:
1. find out ram available on executing server (full ram on dedicated servers, percentage of available ram on current server)
2. calculate weaken threads needed to get to min security
3. calculate grow threads needed to get to max money
4. calculate weaken threads needed to offset grow security increase
5. calculate how many threads of each we can run with available ram

script running order:
1. weaken (if needed)
2. grow (if needed and if ram available)
3. weaken (to offset grow security increase, if grow was run)

when the pre weaken threads are not using all available ram, run grow/weaken in parallel, so that is finishes at the same time as the pre weaken (plus some offset)
the grow threads should only use so much ram that the post weaken threads needed to offset the grow security increase from these grow threads can be run with the remaining ram in parallel with the grow threads, the weaken threads should finish at the same time as the grow threads (plus some offset)
so at first we need to calculate the type and number of threads we can run, then the duration of the threads, then the offset to calculate the start time of each script, so they finish in the right order (weaken (pre) -> grow -> weaken (post)) with a small offset between each

after each batch, recalculate the needed threads and start a new batch until the target server is at min security and max money
...
*/

import { Logger } from "../services/logger";
import { SourceServer } from "../models/sourceServer";
import { TargetServer } from "../models/targetServer";

type Status = {
    targetServer: TargetServer;
    preWeakenThreads: number;
    preWeakenThreadsNeeded: number;
    growThreads: number;
    growThreadsNeeded: number;
    postWeakenThreads: number;
    finishTime: number;
    finishType: "Batch" | "Preparing" | "Waiting";
    running: boolean;
};

export async function main(ns: NS): Promise<void> {
    ns.ui.openTail();
    ns.ui.resizeTail(500, 205);
    const logger = new Logger(ns);

    const targetServerName = ns.args[0]?.toString() || "n00dles";
    const targetServer = new TargetServer(ns, targetServerName);

    const sourceServerName = ns.args[1]?.toString() || ns.getHostname();
    const sourceServer = new SourceServer(ns, sourceServerName);
    const isDedicatedServer = sourceServerName !== ns.getHostname() && sourceServer.maxRam === sourceServer.availableRam;

    const ramUsagePercent = isDedicatedServer ? 100 : parseFloat(ns.args[2]?.toString() || "90");

    const offsetMs = parseInt(ns.args[3]?.toString() || "100");

    if (!ns.fileExists("batch/weaken.ts", sourceServer.name) || !ns.fileExists("batch/grow.ts", sourceServer.name)) {
        await ns.scp(["batch/weaken.ts", "batch/grow.ts"], sourceServer.name);
    }

    const weakenThreadSize = ns.getScriptRam("batch/weaken.ts", sourceServer.name);
    const growThreadSize = ns.getScriptRam("batch/grow.ts", sourceServer.name);

    const status: Status = {
        targetServer: targetServer,
        preWeakenThreads: 0,
        preWeakenThreadsNeeded: 0,
        growThreads: 0,
        growThreadsNeeded: 0,
        postWeakenThreads: 0,
        finishTime: 0,
        finishType: "Batch",
        running: true,
    };
    log(logger, status);

    while (targetServer.currentMoney < targetServer.maxMoney || targetServer.currentSecurity > targetServer.minSecurity) {
        status.preWeakenThreadsNeeded = targetServer.calculateWeakenThreads(sourceServer);
        status.growThreadsNeeded = targetServer.calculateGrowThreads(sourceServer);

        // calculate threads to run this batch
        let ramAvailable = sourceServer.availableRam * (ramUsagePercent / 100);
        if (ramAvailable < Math.max(weakenThreadSize, growThreadSize)) {
            logger.warn("Not enough RAM available for scripts");
            if (isDedicatedServer) {
                logger.error("Dedicated server has not enough RAM, cannot continue", "both");
                return;
            }
            if (sourceServer.maxRam * (ramUsagePercent / 100) < Math.max(weakenThreadSize, growThreadSize)) {
                logger.error("Not enough RAM available on current server with the given percentage, cannot continue", "both");
                return;
            }
            status.finishTime = Date.now() + 10000;
            status.finishType = "Waiting";
            for (let i = 0; i < 10; i++) {
                await ns.sleep(1000);
                log(logger, status);
            }
            continue;
        }
        let preWeakenThreads = 0;
        let growThreads = 0;
        let postWeakenThreads = 0;
        if (status.preWeakenThreadsNeeded > 0) {
            // calculate max threads we can run with available ram
            const maxWeakenThreads = Math.floor(ramAvailable / weakenThreadSize);
            preWeakenThreads = Math.min(status.preWeakenThreadsNeeded, maxWeakenThreads);
            ramAvailable -= preWeakenThreads * weakenThreadSize;
        }
        if (status.growThreadsNeeded > 0 && ramAvailable > growThreadSize + weakenThreadSize) {
            // calculate max threads we can run with available ram
            const maxGrowThreads = Math.floor(ramAvailable / growThreadSize);
            growThreads = Math.min(status.growThreadsNeeded, maxGrowThreads);
            postWeakenThreads = targetServer.calculateAdditionalWeakenThreads(growThreads, sourceServer);
            while (postWeakenThreads * weakenThreadSize > ramAvailable - growThreads * growThreadSize && growThreads > 0) {
                // not enough ram to run the needed additional weaken threads, decrease grow threads
                growThreads--;
                postWeakenThreads = targetServer.calculateAdditionalWeakenThreads(growThreads, sourceServer);
            }
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
        status.finishTime = batchEndTime;
        status.finishType = growThreads === status.growThreadsNeeded && preWeakenThreads === status.preWeakenThreadsNeeded ? "Preparing" : "Batch";

        // calculate end times
        const preWeakenEnd = batchEndTime - weakenTime - offsetMs * 2;
        const growEnd = batchEndTime - growTime - offsetMs;
        const postWeakenEnd = batchEndTime - weakenTime;

        // run scripts
        // first find out which script to start first
        // create an array of {type, script, startTime, endTime, threads} and sort by startTime
        const tasks: { type: string; script: string; start: number; end: number; threads: number }[] = [];
        if (preWeakenThreads > 0) tasks.push({ type: "preweaken", script: "weaken", start: preWeakenEnd - weakenTime, end: preWeakenEnd, threads: preWeakenThreads });
        if (growThreads > 0) tasks.push({ type: "grow", script: "grow", start: growEnd - growTime, end: growEnd, threads: growThreads });
        if (postWeakenThreads > 0) tasks.push({ type: "postweaken", script: "weaken", start: postWeakenEnd - weakenTime, end: postWeakenEnd, threads: postWeakenThreads });

        tasks.sort((a, b) => a.start - b.start);

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            let actualTaskTime = task.script === "weaken" ? ns.getWeakenTime(targetServer.name) : ns.getGrowTime(targetServer.name);
            let timeDiff = task.end - (Date.now() + actualTaskTime);
            // if there is a time difference (due to hacking skill increase), sleep until the script should be started
            while (timeDiff > 10) {
                await ns.sleep(timeDiff);
                log(logger, status);
                actualTaskTime = task.script === "weaken" ? ns.getWeakenTime(targetServer.name) : ns.getGrowTime(targetServer.name);
                timeDiff = task.end - (Date.now() + actualTaskTime);
            }

            // check if threads > 0 and available ram
            if (task.threads <= 0) {
                logger.warn(`Skipping ${task.script}: threads <= 0`);
                continue;
            }
            const ramNeeded = (task.script === "weaken" ? weakenThreadSize : growThreadSize) * task.threads;
            if (ramNeeded > sourceServer.maxRam - sourceServer.usedRam) {
                logger.warn(`Skipping ${task.script}: not enough RAM (${ramNeeded} needed, ${sourceServer.maxRam - sourceServer.usedRam} available)`, "both");
                continue;
            }
            logger.debug(`Running ${task.script} with ${task.threads} threads`);
            if (task.type === "preweaken") {
                status.preWeakenThreads = task.threads;
            } else if (task.type === "grow") {
                status.growThreads = task.threads;
            } else if (task.type === "postweaken") {
                status.postWeakenThreads = task.threads;
            }
            ns.exec(`batch/${task.script}.ts`, sourceServer.name, task.threads, targetServer.name);
            if (i < tasks.length - 1) {
                const nextTask = tasks[i + 1];
                const totalSleepTime = nextTask.start - Date.now();
                const next = "next task";
                let remainingSleep = totalSleepTime;
                while (remainingSleep > 10) {
                    await ns.sleep(Math.max(Math.min(remainingSleep, 200), 1));
                    log(logger, status);
                    remainingSleep = nextTask.start - Date.now();
                }
            } else {
                // last task, wait for it to finish
                const totalSleepTime = batchEndTime - Date.now();
                let next = "finished";
                if (status.preWeakenThreadsNeeded > preWeakenThreads || status.growThreadsNeeded > growThreads) {
                    next = "next batch";
                }
                let remainingSleep = totalSleepTime;
                while (remainingSleep > 10) {
                    await ns.sleep(Math.max(Math.min(remainingSleep, 200), 1));
                    log(logger, status);
                    remainingSleep = batchEndTime - Date.now();
                }
            }
        }
        status.preWeakenThreads = 0;
        status.growThreads = 0;
        status.postWeakenThreads = 0;
        await ns.sleep(10);
    }
    status.running = false;
    logger.success(`${targetServer.name} is fully prepared!`, "both");
    logger.logInstructions(`run hack.ts ${targetServer.name}`, "terminal");
}

function log(logger: Logger, status: Status) {
    logger.clearLog();
    logger.info(`Preparing ${status.targetServer.name}`);
    logger.info(
        `Money:               - ${logger.padString(logger.formatNumber(status.targetServer.currentMoney), "start", 7)} / ${logger.padString(
            logger.formatNumber(status.targetServer.maxMoney),
            "end",
            7
        )} -`
    );
    logger.info(
        `Security:            - ${logger.padString(logger.formatNumber(status.targetServer.currentSecurity), "start", 7)} / ${logger.padString(
            logger.formatNumber(status.targetServer.minSecurity),
            "end",
            7
        )} -`
    );
    if (status.preWeakenThreadsNeeded === 0) {
        logger.info("Weakening:           -        done       -");
    } else {
        logger.info(`Weaken Threads:      - ${logger.padNumber(status.preWeakenThreads, "start", 7)} / ${logger.padNumber(status.preWeakenThreadsNeeded, "end", 7)} -`);
    }

    if (status.growThreadsNeeded === 0) {
        logger.info("Growing:             -        done       -");
    } else {
        logger.info(`Grow Threads:        - ${logger.padNumber(status.growThreads, "start", 7)} / ${logger.padNumber(status.growThreadsNeeded, "end", 7)} -`);
    }
    if (status.postWeakenThreads !== 0) {
        logger.info(`Post-Weaken Threads: - ${logger.padNumber(status.postWeakenThreads, "start", 7)} / ${logger.padNumber(status.postWeakenThreads, "end", 7)} -`);
    } else {
        logger.info("No Post-Weakening!");
    }
    const remaining = status.finishTime - Date.now();
    if (remaining > 0) {
        logger.info(`${status.finishType} finished in: ${logger.formatTime(remaining)}`);
    } else {
        logger.info(`${status.finishType} finished: Ready!`);
    }
}
