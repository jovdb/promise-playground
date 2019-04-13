import { createRenderer } from "./renderer/renderer";
import { addToRenderer as addPromiseToRenderer } from "./trackers/Promise";
import { addToRenderer as addFetchToRenderer } from "./trackers/Fetch";

import { createEditor } from "./editor/editor";
import { addSamples } from "./samples";
import { addDownloadButton } from "./download";
import { createDivider } from "./divider";
import { addFitButton } from "./zoom";
import { addStepper } from "./stepper";
import { autoSave, getLastSavedVersion } from "./autosave";

import { pipe } from "./utils";
import { createBroadcaster } from "./broadcaster";
import { addLinkButton } from "./link";

declare global {
	type Executer = (locals: object) => () => any;
}

function createApp() {

	// Preview Panel
	// -------------
	const previewEl = document.querySelector(".preview") as HTMLTextAreaElement;
	const headerEl = document.querySelector(".header__right") as HTMLSpanElement;

	const broadcaster = createBroadcaster();

	// Editor panel
	// -------------
	const { setErrorMessage, getCode, setCode, setWidth: setEditorWidth } = createEditor({
		broadcaster,
	});

	let renderer: IRenderer | undefined;

	// Divider
	createDivider(broadcaster);

	broadcaster.subscribeToMessage("DividerChanged", widthInPx => {
		setEditorWidth(widthInPx);
	});

	// broadcaster.subscribe(message => console.log(message));



	// Header panel
	// -------------
	headerEl.innerHTML = ""; // Done for HMR
	const lastAutoSavedCode = getLastSavedVersion();

	// Add Samples
	addSamples({
		onChange(sample) {
			setCode(sample.code);
		},
		headerEl,
		loadDefaultSample: !lastAutoSavedCode,
	});

	// Add Download Button
	addDownloadButton({
		getSvg: () => renderer ? renderer.svgEl : undefined,
		broadcaster,
		headerEl,
	});

	// Add Link Button
	const { getCodeFromUrl, getShareabeleLink } = addLinkButton({
		getCode,
		headerEl,
		broadcaster,
	});

	// Add Fit To Screen
	addFitButton({
		getSvg: () => renderer ? renderer.svgEl : undefined,
		getDom: () => renderer ? renderer.domEl : undefined,
		broadcaster,
		headerEl,
		previewEl,
	});

	// Add Stepper
	addStepper({
		requestRender: fn => renderer
			? renderer.requestRender(fn)
			: Promise.resolve(),
		broadcaster,
		headerEl,
	});

	// Show default Code
	let defaultCode = getCodeFromUrl();
	if (!defaultCode) defaultCode = lastAutoSavedCode;
	if (defaultCode) setCode(defaultCode);

	let unsubscribeWatchers: () => void;

	broadcaster.subscribeToMessage("CodeChanged", code => {
		analyze(code);
	});

	/** Start analyzing the code and start rendering */
	function analyze(code: string) {

		if (code) autoSave(code);

		// Stop previous running trackers
		if (unsubscribeWatchers) unsubscribeWatchers();

		// Clear previous renderer
		// Start a new renderer, so old delayed promises are not shown
		if (renderer) renderer.dispose();
		renderer = createRenderer({
			el: previewEl,
			broadcaster,
			getCode: () => code,
			getLink: () => getShareabeleLink(code)
		});

		setErrorMessage("");

		try {

			const execCode: Executer = (locals: object) => {
				// Run function defined outside use-strict mode
				(window as any).evalCode(locals, code);
				return () => undefined; // Cleanup code
			};

			const exec = pipe(

				execCode,

				// Capture fetch
				addFetchToRenderer(renderer),

				// Capture Promises
				addPromiseToRenderer(renderer)
			);

			// Start Trackers
			unsubscribeWatchers = exec({});

		} catch(e) {
			setErrorMessage(e);
		}

	};

	return {
		renderer,
	}
}

createApp();
