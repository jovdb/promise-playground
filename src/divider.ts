
const dividerEl = document.querySelector(".divider") as HTMLDivElement;
const editorEl = document.querySelector(".editor") as HTMLDivElement;

declare global {
	interface IBroadcastMap {
		"DividerChanged": IMessage<"DividerChanged", number>;
	}
}

export function createDivider(broadcaster: IBroadcaster) {

	function onMouseMove(e: MouseEvent) {

		let  width = e.pageX - 9;
		if (width < 5) width = 5;
		if (width > window.innerWidth - 20) width = window.innerWidth - 20;
		editorEl.style.flexBasis = `${width}px`;

		broadcaster.emit({
			name: "DividerChanged",
			payload: width,
		});
	}

	function onMouseUp() {
		window.removeEventListener('mousemove', onMouseMove);
		window.removeEventListener('mouseup', onMouseUp)

		// Store in localStorage
		if (localStorage) {
			let percent = Math.round(parseFloat(editorEl.style.flexBasis || `${window.innerWidth * 0.4}px`) * 100 / window.innerWidth); // Not completly right, but good enough
			if (percent < 5) percent = 5;
			if (percent > 90) percent = 90;
			editorEl.style.flexBasis && localStorage.setItem("divider-ratio", `${percent}%`);
		}
	}

	function onMouseDown(e: MouseEvent) {
		e.preventDefault();
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp)
	}


	dividerEl.addEventListener('mousedown', onMouseDown);

	// Store in localStorage
	if (localStorage) {
		const dividerRatio = localStorage.getItem("divider-ratio");
		if (dividerRatio) editorEl.style.flexBasis = `${window.innerWidth * parseFloat(dividerRatio) / 100}px`;
	}

	return {

		dispose() {
			dividerEl.removeEventListener('mousedown', onMouseDown);
		}
	}
}
