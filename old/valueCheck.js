/** @param {NS} ns */
export async function main(ns) {
	var hostNames=[];

	let serversToScan=ns.scan('home');
	while(serversToScan.length) {
		let server=serversToScan.shift();
		if(!hostNames.includes(server)) {
			hostNames.push(server);
			serversToScan=serversToScan.concat(ns.scan(server));
		}
	}
	for (let hostName of hostNames) {
		let player=ns.getPlayer();
		let server=ns.getServer(hostName);
		if(server.requiredHackingSkill<=player.skills.hacking && server.hasAdminRights) {
			ns.tprint('max money: '+ns.nFormat(server.moneyMax, '0.000a')+'   max money per sec: '+ns.nFormat(server.moneyMax/(ns.getWeakenTime()/1000), '0.000a')+'   '+hostName);
		}
	}

}