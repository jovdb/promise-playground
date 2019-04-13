import { addEventListener } from "./utils";

function createLink(code: string | undefined) {
	if (code) {
		let url = window.location.href;
		const index = url.indexOf("?");
		if (index > -1) url = url.substring(index - 1);

		url += `?code=${encodeURIComponent(code)}`;
		return url;
	}
	return "";
}

function copyToClipboard(value: string) {
	const el = document.createElement('textarea');
	el.value = value;
	el.setAttribute('readonly', '');
	el.style.position = 'absolute';
	el.style.left = '-9999px';
	document.body.appendChild(el);

	const selection = document.getSelection()
	const selected = selection && selection.rangeCount > 0
		? selection.getRangeAt(0)
		: false;
	el.select();
	document.execCommand('copy');
	document.body.removeChild(el);
	if (selection && selected) {
		selection.removeAllRanges();
		selection.addRange(selected);
	}
	return !!selection;
}

export function addLinkButton({
	getCode,
	headerEl,
	broadcaster,
}: {
	getCode(): string | undefined;
	headerEl: HTMLElement;
	broadcaster: IBroadcaster;
}) {

	function addHtml() {
		headerEl.insertAdjacentHTML(
			"beforeend",
			`<style>
				#link {
					border: none;
					background-color: transparent;
					padding: 5px;
					cursor: pointer;
				}
				#link:disabled {
					opacity: 0.5;
				}

			</style>
			<button id="link" title="Create a shareable link">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"></path>
					<line x1="8" y1="12" x2="16" y2="12"></line>
				</svg>
			</button>`
		);
		return headerEl.querySelector("#link") as HTMLButtonElement;
	}

	const linkEl = addHtml();

	// Add Click handler
	const unsubscribeClickEvent = addEventListener(linkEl, "click", () => {
		const url = createLink(getCode())

		if (url) console.log(`Sharable link: ${url}`);

		if (url && copyToClipboard(url)) {
			alert("A sharebale link is copied to the clipboard");
		}
	});
	const unsubscribeBroadcaster = broadcaster.subscribeToMessage("CodeChanged", code => {
		linkEl.disabled = !code;
	});

	return {
		getCodeFromUrl() {

			function getParameterByName(name: string, url?: string) {
				if (!url) url = window.location.href;
				name = name.replace(/[\[\]]/g, '\\$&');
				var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
					results = regex.exec(url);
				if (!results) return null;
				if (!results[2]) return '';
				return decodeURIComponent(results[2].replace(/\+/g, ' '));
			}

			return getParameterByName("code") || undefined;
		},

		getShareabeleLink(code = getCode()) {
			return createLink(code);
		},

		dispose() {
			unsubscribeClickEvent();
			unsubscribeBroadcaster();
		}
	}
}
