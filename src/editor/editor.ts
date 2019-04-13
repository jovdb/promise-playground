import { makeEditor } from "./monaco";
import { useThrottling, pipe, assert } from "../utils";



declare global {
	interface IBroadcastMap {
		"CodeChanged": IMessage<"CodeChanged", string>;
	}
}

const codeEl = assert(document.getElementById("code") as HTMLTextAreaElement);
const errorMessageEl = assert(document.getElementById("error-message"));

export function createEditor({
	broadcaster,
} : {
	broadcaster: IBroadcaster;
}) {

	function broadcastCodeChange(code: string) {
		broadcaster.emit({
			name: "CodeChanged",
			payload: code,
		});
	}

	const throttledBroadcastCodeChange = pipe(
		broadcastCodeChange,
		useThrottling(500),
	);

	let skipNextUpdate = false;

	const { setCode, getCode, updateLayout } = makeEditor(codeEl, {
		onCodeChange(code) {
			if (skipNextUpdate) {
				skipNextUpdate = false;
				return;
			}

			throttledBroadcastCodeChange(code);
		},
	});

	return {
		setErrorMessage(error: any) {

			let message = "";
			if (error && error.message) message += error.message;
			// if (error && error.stack) message += `\n\n${error.stack}`;
			if (!message) message = `${error}`;

			errorMessageEl.textContent = message;
			errorMessageEl.classList.toggle("show", !!message);
		},

		setCode(code: string) {
			setCode(code);

			// Immedialty update
			broadcastCodeChange(code);
			skipNextUpdate = true;
		},

		getCode() {
			return getCode();
		},

		setWidth(widthInPx: number) {
			updateLayout(widthInPx, codeEl.getBoundingClientRect().height);
		}

	}
}