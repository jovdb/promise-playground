let oid = 0;

export function getOid() {
	return (++oid).toString(16);
}