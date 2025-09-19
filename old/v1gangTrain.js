/** @param {NS} ns */
export async function main(ns) {
	if(ns.gang.inGang()) {
		while(true) {
			let gangInfo=ns.gang.getGangInformation();
			let gangMembers=ns.gang.getMemberNames();
			while(ns.gang.canRecruitMember()) {
				ns.gang.recruitMember('Member_'+(gangMembers.length+1));
				await(ns.sleep(100));
				gangMembers=ns.gang.getMemberNames();
			}

			for (let memberName of gangMembers) {
				if(memberName=='Member_1' || memberName=='Member_2') { // members excluded from training
//					continue;
				}
				let memberInfo=ns.gang.getMemberInformation(memberName);
				let taskName='Train Combat';
				let skill=memberInfo.str_asc_mult;
				if(gangInfo.isHacking) {
					taskName='Train Hacking';
					skill=memberInfo.hack_asc_mult;
				}
				if(memberInfo.cha_asc_mult<skill) {
					taskName='Train Charisma';
				}
				if(memberInfo.task!=taskName) {
					ns.gang.setMemberTask(memberName, taskName);
				}

				let memberAscInfo=ns.gang.getAscensionResult(memberName);
				let multi=1;
				if(memberAscInfo!=undefined) {
					multi=memberAscInfo.str;
					if(gangInfo.isHacking) {
						multi=memberAscInfo.hack;
					}
					if(memberInfo.cha_asc_mult<skill) {
						multi=memberAscInfo.cha;
					}
				}
				if(multi>=1.5) {
					ns.gang.ascendMember(memberName);
				}
			}

			await(ns.sleep(10000));
		}
	}
}