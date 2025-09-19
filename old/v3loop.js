/** @param {NS} ns */
export async function main(ns) {
	/*
	args:
	0: name of the target server
	1: number of weaken threads
	2: number of grow threads
	3: number of hack threads
	4: name of the hacking server
	5: threadindex (mitiple instances of the same script need different arguments)
	*/
	let hacktarget=ns.args[0];
	let weakenNumThreads=ns.args[1];
    let growthNumThreads=ns.args[2];
    let hackNumThreads=ns.args[3];
	let host=ns.args[4];
	let threadindex=ns.args[5];

	let deltaTime=300;
    let weakeningTime=ns.getWeakenTime(hacktarget);
    let growingTime=ns.getGrowTime(hacktarget);
    let hackingTime=ns.getHackTime(hacktarget);
    let deltaWeakenGrow=Math.ceil(weakeningTime-growingTime)-deltaTime;
    let deltaGrowHack=Math.ceil(growingTime-hackingTime)-deltaTime;

	ns.exec('weaken.js', host, weakenNumThreads, hacktarget, threadindex);
	await(ns.sleep(deltaWeakenGrow));
	ns.exec('grow.js', host, growthNumThreads, hacktarget, threadindex);
	await(ns.sleep(deltaGrowHack));
	ns.exec('hack.js', host, hackNumThreads, hacktarget, threadindex);
}