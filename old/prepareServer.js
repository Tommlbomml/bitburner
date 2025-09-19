/** @param {NS} ns */
export async function main(ns) {
	let hackHostname=ns.args[0];
	let hackServer=ns.getServer(hackHostname);
	while(hackServer.hackDifficulty>hackServer.minDifficulty || hackServer.moneyAvailable<hackServer.moneyMax) {
		ns.print('Money: '+hackServer.moneyAvailable+'/'+hackServer.moneyMax+' ('+100*hackServer.moneyAvailable/hackServer.moneyMax+' %)');
		ns.print('Security: '+hackServer.hackDifficulty+'/'+hackServer.minDifficulty+' ('+100*hackServer.hackDifficulty/hackServer.minDifficulty+' %)');
		if(hackServer.hackDifficulty>hackServer.minDifficulty) {
			await(ns.weaken(hackHostname));
		}
		else {
			await(ns.grow(hackHostname));
		}
		hackServer=ns.getServer(hackHostname);
	}








//ns.alert(hackHostname+' prepared.');
}