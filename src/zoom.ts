
interface ISize {
	width: number;
	height: number;
}

export function addFitButton({
	getSvg,
	getDom,
	broadcaster,
	headerEl,
	previewEl,
}: {
	getSvg(): SVGElement | undefined;
	getDom(): HTMLElement | undefined;
	broadcaster: IBroadcaster;
	headerEl: HTMLElement;
	previewEl: HTMLElement;
}) {

	function addHtml() {
		headerEl.insertAdjacentHTML(
			"beforeend",
			`<style>
				#fit {
					background-color: transparent;
					padding: 5px;
					border: 2px solid transparent;
					cursor: pointer;
				}

				#fit.active {
					border: 2px solid #ffffff;
				}
			</style>
			<button id="fit" title="Fit to screen">
				<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 28.361 28.361" width="24px" height="24px">
					<g fill="#FFFFFF">
						<path d="M28.36,19.595c0-0.868-0.665-1.57-1.491-1.57c-0.819,0.002-1.492,0.702-1.492,1.57v3.25l-6.018-6.021 c-0.582-0.583-1.524-0.583-2.106,0c-0.582,0.582-0.582,1.527,0,2.109l5.989,5.987h-3.235c-0.881,0.002-1.591,0.669-1.591,1.491 c0,0.824,0.71,1.49,1.591,1.49h6.761c0.881,0,1.59-0.665,1.593-1.49c-0.003-0.022-0.006-0.039-0.009-0.061 c0.003-0.028,0.009-0.058,0.009-0.087v-6.668H28.36z"/>
						<path d="M9,16.824l-6.015,6.021v-3.25c0-0.868-0.672-1.568-1.493-1.57c-0.824,0-1.49,0.702-1.49,1.57L0,26.264 c0,0.029,0.008,0.059,0.01,0.087c-0.002,0.021-0.006,0.038-0.008,0.061c0.002,0.825,0.712,1.49,1.592,1.49h6.762 c0.879,0,1.59-0.666,1.59-1.49c0-0.822-0.711-1.489-1.59-1.491H5.121l5.989-5.987c0.58-0.582,0.58-1.527,0-2.109 C10.527,16.241,9.584,16.241,9,16.824z"/>
						<path d="M19.359,11.535l6.018-6.017v3.25c0,0.865,0.673,1.565,1.492,1.568c0.826,0,1.491-0.703,1.491-1.568V2.097 c0-0.029-0.006-0.059-0.009-0.085c0.003-0.021,0.006-0.041,0.009-0.062c-0.003-0.826-0.712-1.491-1.592-1.491h-6.761 c-0.881,0-1.591,0.665-1.591,1.491c0,0.821,0.71,1.49,1.591,1.492h3.235l-5.989,5.987c-0.582,0.581-0.582,1.524,0,2.105 C17.835,12.12,18.777,12.12,19.359,11.535z"/>
						<path d="M5.121,3.442h3.234c0.879-0.002,1.59-0.671,1.59-1.492c0-0.826-0.711-1.491-1.59-1.491H1.594 c-0.88,0-1.59,0.665-1.592,1.491C0.004,1.971,0.008,1.991,0.01,2.012C0.008,2.038,0,2.067,0,2.097l0.002,6.672 c0,0.865,0.666,1.568,1.49,1.568c0.821-0.003,1.493-0.703,1.493-1.568v-3.25L9,11.535c0.584,0.585,1.527,0.585,2.11,0 c0.58-0.581,0.58-1.524,0-2.105L5.121,3.442z"/>
					</g>
				</svg>
			</button>`
		);
		return headerEl.querySelector("#fit") as HTMLButtonElement;
	}

	function onFitButtonClicked() {
		const isActive = !fitEl.classList.contains("active");
		const domEl = getDom();
		const svgEl = getSvg();
		if (domEl && svgEl) toggleZoom(domEl, svgEl, isActive);
		fitEl.classList.toggle("active", isActive);

		// Store in localStorage
		if (localStorage) {
			localStorage.setItem("zoom-fit", isActive ? "1" : "0");
		}
	}

	function onResize() {
		if (fitEl.classList.contains("active")) {
			const domEl = getDom();
			const svgEl = getSvg();
			if (domEl && svgEl) fitToScreen(domEl, svgEl);
		}
	}

	function toggleZoom(domEl: HTMLElement, svgEl: SVGElement, isActive: boolean) {
		fitEl.classList.toggle("active", isActive);
		previewEl.classList.toggle("fit", isActive);

		if (isActive) {
			fitToScreen(domEl, svgEl);
		} else {
			svgEl.style.width = null;
			svgEl.style.height = null;
		}
	}


	function contain(itemSize: ISize, fitInSize: ISize): ISize {

		const sourceRatio = itemSize.width / itemSize.height;
		const targetRatio = fitInSize.width / fitInSize.height;

		return (sourceRatio > targetRatio)
			? {
				width: fitInSize.width,
				height: fitInSize.width / sourceRatio
			}
			: {
				width: fitInSize.height * targetRatio,
				height: fitInSize.height
			};
	}

	function fitToScreen(domEl: HTMLElement, svgEl: SVGElement) {

		const domSize = domEl.getBoundingClientRect();
		const previewSize = window.getComputedStyle(previewEl, null);

		const svgSize = contain(domSize, {
			width: parseInt(previewSize.width || "", 10),
			height: parseInt(previewSize.height || "", 10) - 10, // subtract for margin;
		});
		svgEl.style.width = `${Math.ceil(svgSize.width)}px`;
		svgEl.style.height = `${Math.ceil(svgSize.height)}px`;

	}

	const fitEl = addHtml();

	fitEl.addEventListener("click", onFitButtonClicked);
	window.addEventListener("resize", onResize);

	const onRenderUnsubscribe = broadcaster.subscribe(message => {
		if (message.name === "Rendered" || message.name === "DividerChanged") {
			onResize();
		}
	});

	// Size at creation
	onResize();

	// Store in localStorage
	if (localStorage) {
		const zoomFit = localStorage.getItem("zoom-fit");

		const domEl = getDom();
		const svgEl = getSvg();
		if (domEl && svgEl) toggleZoom(domEl, svgEl, zoomFit === "1");
	}

	return {
		updateRenderSize: onResize,
		dispose() {
			fitEl.removeEventListener("click", onFitButtonClicked);
			window.removeEventListener("resize", onResize);
			onRenderUnsubscribe();
		}
	}
}

