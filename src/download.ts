import { addEventListener } from "./utils";
function download(svgEl: SVGElement | undefined) {
	if (!svgEl) return

	const el = document.createElement('a');
	el.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgEl.outerHTML));
	el.setAttribute('download', "promise_tree.svg");
	el.style.display = 'none';
	document.body.appendChild(el);
	el.click();
	document.body.removeChild(el);
}

export function addDownloadButton({
	getSvg,
	headerEl,
	broadcaster,
}: {
	getSvg(): SVGElement | undefined;
	headerEl: HTMLElement;
	broadcaster: IBroadcaster;
}) {

	function addHtml() {
		headerEl.insertAdjacentHTML(
			"beforeend",
			`<style>
				#download {
					border: none;
					background-color: transparent;
					padding: 5px;
					cursor: pointer;
				}
				#download:disabled {
					opacity: 0.5;
				}
			</style>
			<button id="download" title="Download as SVG">
				<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 433.5 433.5">
					<path fill="#FFFFFF" d="M395.25,153h-102V0h-153v153h-102l178.5,178.5L395.25,153z M38.25,382.5v51h357v-51H38.25z"/>
				</svg>
			</button>`
		);
		return headerEl.querySelector("#download") as HTMLButtonElement;
	}


	const downloadEl = addHtml();

	// Watch if SVG available
	const unsubscribeBroadcaster = broadcaster.subscribeToMessage("Rendered", () => {
		downloadEl.disabled = !getSvg();
	});

	// Add Click handler
	const unsubscribeClickHandler = addEventListener(downloadEl, "click", () => download(getSvg()));

	return {
		dispose() {
			unsubscribeClickHandler();
			unsubscribeBroadcaster();
		}
	}
}
