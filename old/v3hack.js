/** @param {NS} ns */
export async function main(ns) {
	/*
	args:
	0: name of the target server
	1: percent of max money per loop
	2: percent of max ram used
	*/
	var weakenThreads=0;
	var growThreads=0;
	var hackThreads=0;
	var hackingServerName=ns.getHostname();
	var hackingServer=ns.getServer(hackingServerName);
	var hackedServerName=ns.args[0];
	var hackedServer;
	var moneyPercent=ns.args[1];
	var ramPercent=ns.args[2];
	ns.disableLog('sleep');
	// set server to max money and min security ---------------------------------------------------------------
ns.print('prepare server');
	ns.exec('v3prepareServer.js', hackingServerName, 1, hackedServerName);
	while(ns.isRunning('v3prepareServer.js', hackingServerName,  hackedServerName)) {
		await(ns.sleep(1000));
	}
	// steal x percent of money, to get the correct numbers for grow and weaken -------------------------------
ns.print('steal money');
	hackedServer=ns.getServer(hackedServerName);
	while(hackedServer.moneyAvailable==hackedServer.moneyMax) {
		let hackMPT=ns.hackAnalyze(hackedServerName);
		hackThreads=Math.ceil((moneyPercent/100)/hackMPT);
		let ramAvail=ns.getServerMaxRam(hackingServerName)-ns.getServerUsedRam(hackingServerName);
		if(hackThreads*ns.getScriptRam('hack.js', hackingServerName)<=ramAvail) {
			ns.exec('hack.js', hackingServerName, hackThreads, hackedServerName);
			while(ns.isRunning('hack.js', hackingServerName,  hackedServerName)) {
				await(ns.sleep(1000));
			}
		}
		else {
			ns.tprint('RAM to low, try lower percentage');
		}
		await(ns.sleep(200));
		hackedServer=ns.getServer(hackedServerName);
		ns.print('after hack: '+hackedServer.moneyAvailable+'/'+hackedServer.moneyMax);
	}
	// calculate number of grow threads -----------------------------------------------------------------------
	let money=Math.max(hackedServer.moneyAvailable, 0.01);
	let moneyNeed=hackedServer.moneyMax-money;
	let growthFactorNeeded=moneyNeed/money+1;
	growThreads=Math.ceil(ns.growthAnalyze(hackedServerName, growthFactorNeeded, hackingServer.cpuCores));
	// calculate security increase ----------------------------------------------------------------------------
	let growthSecurityIncrease=ns.growthAnalyzeSecurity(growThreads, hackedServerName, hackingServer.cpuCores);
	// calculate number of weaken threads ---------------------------------------------------------------------
	let securityDifference=hackedServer.hackDifficulty-hackedServer.minDifficulty+growthSecurityIncrease;
	let weakenPerThread=ns.weakenAnalyze(1, hackingServer.cpuCores);
	weakenThreads=Math.ceil(securityDifference/weakenPerThread);
	// reset server to max money and min security -------------------------------------------------------------
ns.print('prepare server');
	ns.exec('v3prepareServer.js', hackingServerName, 1, hackedServerName);
	while(ns.isRunning('v3prepareServer.js', hackingServerName,  hackedServerName)) {
		await(ns.sleep(1000));
	}
	// hackingloop
	growThreads=Math.ceil(growThreads*1.5);     // buffer
	weakenThreads=Math.ceil(weakenThreads*1.3); // buffer
	let memUse=hackThreads*ns.getScriptRam('hack.js', hackingServerName)+growThreads*ns.getScriptRam('grow.js', hackingServerName)+weakenThreads*ns.getScriptRam('weaken.js', hackingServerName)+ns.getScriptRam('v3loop.js', hackingServerName);
	ns.print('ram per loop: '+memUse)
	while(true) {
        let hackedServer=ns.getServer(hackedServerName);
        ns.print(ns.nFormat((hackedServer.moneyAvailable/hackedServer.moneyMax)*100, '0,0.0')+' % Money: '+ns.nFormat(hackedServer.moneyAvailable, '0.000a')+'/'+ns.nFormat(hackedServer.moneyMax, '0.000a'));
		ns.print(ns.nFormat((hackedServer.hackDifficulty/hackedServer.minDifficulty)*100, '0,0.0')+' % Security: '+ns.nFormat(hackedServer.hackDifficulty, '0,0.0')+'/'+ns.nFormat(hackedServer.minDifficulty, '0,0.0'));
        if((ns.getServerMaxRam(hackingServerName)-ns.getServerUsedRam(hackingServerName))>memUse) {
            ns.exec('v3loop.js', hackingServerName, 1, hackedServerName, weakenThreads, growThreads, hackThreads, hackingServerName, ns.getTimeSinceLastAug());
        }
        let memPart=ns.getServerMaxRam(hackingServerName)*(ramPercent/100)-ns.getScriptRam('v3hack.js', hackingServerName);
        let maxTime=Math.max(ns.getGrowTime(hackedServerName), ns.getWeakenTime(hackedServerName), ns.getHackTime(hackedServerName));
        let memPerThread=ns.getScriptRam('v3loop.js', hackingServerName)+(ns.getWeakenTime(hackedServerName)/maxTime)*weakenThreads*ns.getScriptRam('weaken.js', hackingServerName)+(ns.getGrowTime(hackedServerName)/maxTime)*growThreads*ns.getScriptRam('grow.js', hackingServerName)+(ns.getHackTime(hackedServerName)/maxTime)*hackThreads*ns.getScriptRam('hack.js', hackingServerName);
        let maxNumThreads=Math.floor(memPart/memPerThread);
        let waitTime=Math.ceil(Math.max(((maxTime/maxNumThreads)+100), 910));
		waitTime=Math.ceil(waitTime/1000)*1000;
		ns.print('sleep: '+ns.nFormat(waitTime/1000, '00:00:00'));
        await(ns.sleep(waitTime));
    }
}