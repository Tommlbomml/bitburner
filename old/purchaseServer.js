/** @param {NS} ns */
export async function main(ns) {
	/*
	args:
	0: size
	1: number

    args[0]  |  serversize   |  cost per 1  |  cost per 25
	0:       |  8 GB         |  0.44 m      |  11 m
	1:       |  16 GB        |  0.88 m      |  22 m
	2:       |  32 GB        |  1.76 m      |  44 m
	3:       |  64 GB        |  3.52 m      |  88 m
	4:       |  128 GB       |  7.04 m      |  176 m
	5:       |  256 GB       |  14.08 m     |  352 m
	6:       |  512 GB       |  28.16 m     |  704 m
	7:       |  1.024 TB     |  56.32 m     |  1.408 b
	8:       |  2.048 TB     |  112.64 m    |  2.816 b
	9:       |  4.096 TB     |  225.28 m    |  5.632 b
	10:      |  8.192 TB     |  450.56 m    |  11.264 b
	11:      |  16.384 TB    |  901.12 m    |  22.528 b
	12:      |  32.768 TB    |  1.80224 b   |  45.056 b
	13:      |  65.536 TB    |  3.60448 b   |  90.112 b
	14:      |  131.072 TB   |  7.208.96 b  |  180.224 b
	15:      |  262.144 TB   |  14.41792 b  |  360.448 b
	16:      |  524.288 TB   |  28.83584 b  |  720.896 b
	17:      |  1.048576 PB  |  57.67168 b  |  1.441792 t
	*/
	let ram=ns.getPurchasedServerMaxRam();
    let number=ns.getPurchasedServerLimit()-ns.getPurchasedServers().length;
	if(ns.args.length) {
		ram=8*Math.pow(2, ns.args[0]);
		number=Math.min(ns.args[1], (ns.getPurchasedServerLimit()-ns.getPurchasedServers().length));
	}
	let numServers=ns.getPurchasedServers().length;
	for(let i=1;i<=number;i++) {
		let serverName='Tommlbomml-'+(i+numServers);
		if(ns.getServerMoneyAvailable('home')>=ns.getPurchasedServerCost(ram)) {
			ns.purchaseServer(serverName, ram);
			await(ns.scp(['v3hack.js', 'v3loop.js', 'v3prepareServer.js', 'hack.js', 'grow.js', 'weaken.js'], serverName));
		}
	}
}