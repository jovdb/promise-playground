
export function addStepper({
	requestRender,
	broadcaster,
	headerEl,
}: {
	requestRender: IRenderer["requestRender"],
	broadcaster: IBroadcaster;
	headerEl: HTMLElement;
}) {

	function addHtml() {
		headerEl.insertAdjacentHTML(
			"beforeend",
			`<style>
				#step_step,
				#step {
					border: none;
					background-color: transparent;
					padding: 5px;
					cursor: pointer;
				}
				#step {
					border: 2px solid transparent;
				}

				#step.active {
					border: 2px solid #ffffff;
				}

				#step_step {
					animation: flash 0.5s infinite alternate ease-in-out;
				}

				@keyframes flash {
					0% {
						opacity: 1;
					}
					80% {
						opacity: 1;
					}
					100% {
						opacity: 0.3;
					}
				}

				#step_step:disabled {
					opacity: 0.5;
					animation: none;
				}
			</style>
			<span>
				<button id="step" title="Enable/disable stepping">
					<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 353.562 353.562">
						<g fill="#FFFFFF">
							<path d="M41.064,353.562h109.014V0H41.064V353.562z"/>
							<path d="M213.482,0v353.562h109.017V0H203.482z"/>
						</g>
					</svg>
				</button>

				<button id="step_step" disabled title="Step">
					<svg class="play" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 306 306" width="24px" height="24px">
						<g fill="#FFFFFF">
							<path d="M0,306l216.75-153L0,0V306z M255,0v306h51V0H255z"/>
						</g>
					</svg>
				</button>
			</span>`
		);
		return [
			headerEl.querySelector("#step") as HTMLButtonElement,
			headerEl.querySelector("#step_step") as HTMLButtonElement
		];
	}

	let lastCommand: IRenderCommand | undefined;
	let lastRendered: IRenderCommand | undefined;
	let isStepMode = false;

	const unsubscribeBroadcaster = broadcaster.subscribe(message => {

		if (message.name === "RenderCommandAdded" || message.name === "RenderCommandsCleared") {

			const command = message.payload;

			// Auto Render?
			if (!isStepMode) {
				requestRender().then(() => {
					// Remember last rendered command
					lastRendered = command;
				});

			// Steps
			} else {

				// Do the first rendering automatically, so no empty page
				if (lastCommand === undefined) {
					step();
				}
			}

			// Remember last command
			lastCommand = command;

			// Update buttons (maybe new step is available)
			updateButtons();
		}
	});

	function updateButtons() {
		stepStepEl.disabled = !isStepMode || lastCommand === lastRendered;
	}

	function toggleStep() {

		isStepMode = !isStepMode;

		if (!isStepMode) {

			// Render to end
			requestRender(c => {
				lastRendered = c; // Remember last rendered command
				return true;
			}).then(() => {

				// Update buttons (end of commands reached)
				updateButtons();
			});
		}

		stepEl.classList.toggle("active", isStepMode);
	}

	function step() {
		let count = 0;
		let lastStepId: number | undefined = 0;

		requestRender(c => {

			const stop = (lastStepId !== c.stepId) && count > 0;
			lastStepId = c.stepId;

			count++;
			if (!stop) {
				lastRendered = c;
			}
			return !stop ;
		}).then(() => {
			updateButtons(); // Update buttons here because this function is async
		});
	}

	const [stepEl, stepStepEl] = addHtml();

	updateButtons();

	stepStepEl.addEventListener("click", step);
	stepEl.addEventListener("click", toggleStep);

	return () => {
		unsubscribeBroadcaster();
		stepStepEl.removeEventListener("click", step);
		stepEl.removeEventListener("click", toggleStep);
	}

}
