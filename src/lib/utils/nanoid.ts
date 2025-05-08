// nanoid code
const urlAlphabet =
	'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict'
export const nanoid = (size = 21) => {
	let id = ''
	let bytes = crypto.getRandomValues(new Uint8Array((size |= 0)))
	while (size--) {
		// Using the bitwise AND operator to "cap" the value of
		// the random byte from 255 to 63, in that way we can make sure
		// that the value will be a valid index for the "chars" string.
		// minus 63 to 61 because - and _ is removed
		id += urlAlphabet[bytes[size] & 61]
	}
	return id
}
