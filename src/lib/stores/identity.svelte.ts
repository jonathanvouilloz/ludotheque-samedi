const STORAGE_KEY_ID = 'ludotools_member_id';
const STORAGE_KEY_NAME = 'ludotools_member_name';

let memberId = $state<string | null>(null);
let memberName = $state<string | null>(null);
let initialized = $state(false);

function init(): void {
	if (typeof window === 'undefined') return;
	memberId = localStorage.getItem(STORAGE_KEY_ID);
	memberName = localStorage.getItem(STORAGE_KEY_NAME);
	initialized = true;
}

function setIdentity(id: string, name: string): void {
	memberId = id;
	memberName = name;
	if (typeof window !== 'undefined') {
		localStorage.setItem(STORAGE_KEY_ID, id);
		localStorage.setItem(STORAGE_KEY_NAME, name);
	}
}

function clear(): void {
	memberId = null;
	memberName = null;
	if (typeof window !== 'undefined') {
		localStorage.removeItem(STORAGE_KEY_ID);
		localStorage.removeItem(STORAGE_KEY_NAME);
	}
}

export const identity = {
	get memberId() {
		return memberId;
	},
	get memberName() {
		return memberName;
	},
	get initialized() {
		return initialized;
	},
	init,
	setIdentity,
	clear
};
