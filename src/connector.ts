import * as svg from "./svg-utils"
import { successFactor, errorFactor, getBoxTitle, getTooltip } from "./trackers/Promise";
import { getPromiseStyle } from "./trackers/PromiseInnerBlocks";

function createOutputCommand(itemInfo: Pick<IPromiseItem, "id" | "parentId">) {

	let itemEl: HTMLElement | undefined;
	let inputEl: HTMLDivElement | undefined;
	let outputEl: HTMLDivElement | undefined;
	let valueEl: HTMLDivElement | undefined;
	let successInputArrow: ReturnType<typeof svg.createArrow> | undefined;
	let errorInputArrow: ReturnType<typeof svg.createArrow> | undefined;
	let successOutputArrow: ReturnType<typeof svg.createArrow> | undefined;
	let errorOutputArrow: ReturnType<typeof svg.createArrow> | undefined;
	let svgBox: ReturnType<typeof svg.rectFromEl> | undefined;
	let svgTitle: ReturnType<typeof svg.textFromEl> | undefined;
	let svgTooltip: SVGTitleElement;
	let parentCommand: IRenderCommand | undefined ;

	const command = {

		name: "CreateOutput",
		id: itemInfo.id,
		parentId: itemInfo.parentId,

		updateDom(itemHtmlEl: HTMLElement, itemSvgEl: SVGElement, parentCmd: IRenderCommand) {

			itemEl = itemHtmlEl;
			parentCommand = parentCmd;

			// link to parent
			if (parentCommand) {
				inputEl = document.createElement("div");
				inputEl.classList.add("promise-input");
				itemHtmlEl.insertAdjacentElement("beforebegin", inputEl);

				// SVG Items
				successInputArrow = svg.createArrow({el: itemHtmlEl, xFactor: successFactor, yFactor: 0}, {el: inputEl, xFactor: successFactor, yFactor: 0}, 10 , 20);
				if (successInputArrow.svgEl) {
					itemSvgEl.insertAdjacentElement("afterbegin", successInputArrow.svgEl);
				}

				errorInputArrow = svg.createArrow({el: itemHtmlEl, xFactor: errorFactor, yFactor: 0}, {el: inputEl, xFactor: errorFactor, yFactor: 0}, 20 , 10);
				if (errorInputArrow.svgEl) {
					itemSvgEl.insertAdjacentElement("afterbegin", errorInputArrow.svgEl);
				}

			}

			// ouput value
			outputEl = document.createElement("div");
			outputEl.classList.add("promise-output");
			itemHtmlEl.insertAdjacentElement("beforeend", outputEl);

			valueEl = document.createElement("div");
			valueEl.classList.add("promise-output__value");

			outputEl.appendChild(valueEl);

			successOutputArrow = svg.createArrow({el: itemHtmlEl, xFactor: successFactor, yFactor: 1}, {el: outputEl, xFactor: 0.5, yFactor: 1}, 10, 10);
			if (successOutputArrow.svgEl) {
				itemSvgEl.insertAdjacentElement("afterbegin", successOutputArrow.svgEl);
			}

			errorOutputArrow = svg.createArrow({el: itemHtmlEl, xFactor: errorFactor, yFactor: 1}, {el: outputEl, xFactor: 0.5, yFactor: 1}, 10 , 10);
			if (errorOutputArrow.svgEl) {
				itemSvgEl.insertAdjacentElement("afterbegin", errorOutputArrow.svgEl);
			}

			svgBox = svg.rectFromEl(valueEl);
			if (svgBox.svgEl) {
				svg.setSvgAttribute(svgBox.svgEl, "fill", "#ffffff"); // Hide underlaying line if large text box
				itemSvgEl.appendChild(svgBox.svgEl);
			}

			svgTitle = svg.textFromEl(valueEl);
			if (svgTitle.svgEl) {
				itemSvgEl.appendChild(svgTitle.svgEl);
			}

		},

		updateLayout(offsetBox: ClientRect) {
			if (!errorOutputArrow || !successOutputArrow || !svgTitle || !svgBox || !outputEl) return;

			const updateSvgs = []
			if (successInputArrow) updateSvgs.push(successInputArrow.updateLayout(offsetBox));
			if (errorInputArrow) updateSvgs.push(errorInputArrow.updateLayout(offsetBox));

			if (valueEl && itemEl) {

				const itemSize = svg.getBox(itemEl, offsetBox);

				const successPosition = command.getOutputPosition("success", offsetBox);
				if (successPosition) {
					updateSvgs.push(() => {
						if (successOutputArrow) {
							successOutputArrow.updatePosition(
								successPosition.left,
								itemSize.top + itemSize.height,
								successPosition.left, // use same x, value can be on error
								successPosition.top
							)
						}
					});
				}


				const errorPosition = command.getOutputPosition("error", offsetBox);
				if (errorPosition) {
					updateSvgs.push(() => {
						if (errorOutputArrow) {
							errorOutputArrow.updatePosition(
								errorPosition.left,
								itemSize.top + itemSize.height,
								errorPosition.left, // use same x, value can be on error
								errorPosition.top
							);
						}
					});
				}

				if (parentCommand) {

					const successPosition = parentCommand && (parentCommand as any).getOutputPosition ? (parentCommand as any).getOutputPosition("success", offsetBox) : undefined;
					if (successPosition) {
						updateSvgs.push(() => {
							if (successInputArrow) {
								successInputArrow.updatePosition(
									successPosition.left,
									successPosition.top,
									itemSize.left + itemSize.width * successFactor, // use same x, value can be on error
									itemSize.top
								);
							}
						});
					}

					const errorPosition = parentCommand && (parentCommand as any).getOutputPosition ? (parentCommand as any).getOutputPosition("error", offsetBox) : undefined;
					if (errorPosition) {
						updateSvgs.push(() => {
							if (errorInputArrow) {
								errorInputArrow.updatePosition(
									errorPosition.left,
									errorPosition.top,
									itemSize.left + itemSize.width * errorFactor, // use same x, value can be on error
									itemSize.top
								);
							}
						});
					}
				}
			}

			updateSvgs.push(svgBox.updateLayout(offsetBox));
			updateSvgs.push(svgTitle.updateLayout(offsetBox));
			return svg.mergeUpdateLayout(updateSvgs);
		},

		updateSvg() {
			if (!errorOutputArrow || !successOutputArrow || !svgTitle || !svgBox) return;
			if (successInputArrow) successInputArrow.updateColor("disabled");
			if (errorInputArrow) errorInputArrow.updateColor("disabled");
			successOutputArrow.updateColor("disabled");
			errorOutputArrow.updateColor("disabled");
			svgBox.updateVisibility(false);
			svgTitle.updateColor("light");
		},

		createStyleCommand(style: string, payload: { value?: string; dontShowOutput?: boolean } = {}) {

			const promiseStyle = getPromiseStyle(style);

			const styleCommand = {
				name: "UpdateOutputStyle",
				id: itemInfo.id,
				parentId: itemInfo.parentId,

				canReplacePrevious: true,

				updateDom(_itemHtmlEl: HTMLElement, _itemSvgEl: SVGElement) {},
				updateLayout(offsetBox: ClientRect) {
					return svg.mergeUpdateLayout([
						svgBox ? svgBox.updateLayout(offsetBox) : undefined,
						svgTitle ? svgTitle.updateLayout(offsetBox) : undefined,
						command.updateLayout(offsetBox),
					]);
				},
				updateSvg() {},
			};

			if ("value" in payload) {
				styleCommand.updateDom = (_itemHtmlEl: HTMLElement, _itemSvgEl: SVGElement) => {
					if (valueEl) {;
						valueEl.textContent = getBoxTitle(payload.value); // Update Text
					}

					if (outputEl) {
						if (promiseStyle.hasSuccessOut()) outputEl.style.left = "25%";
						else if (promiseStyle.hasErrorOut()) outputEl.style.left = "75%";
					}
				};
			}

			styleCommand.updateSvg = () => {

				if (successInputArrow) successInputArrow.updateColor(promiseStyle.hasSuccessIn() ? "success" : "disabled");
				if (errorInputArrow) errorInputArrow.updateColor(promiseStyle.hasErrorIn() ? "error" : "disabled");

				if ("value" in payload) {
					if (!errorOutputArrow || !successOutputArrow || !svgTitle || !svgBox) return;

					svgTitle.updateText();

					if (svgTitle && svgTitle.svgEl) {
						if (!svgTooltip) {
							svgTooltip = svg.createSvgElement("title");
							svgTitle.svgEl.appendChild(svgTooltip);
						}
						svgTooltip.textContent = getTooltip(payload.value);
					}

					if (promiseStyle.hasSuccessOut()) {
						svgBox.updateFill("success");
						svgBox.updateVisibility(true);
						successOutputArrow.updateColor("success");
						errorOutputArrow.updateColor("disabled");
					} else if (promiseStyle.hasErrorOut()) {
						svgBox.updateFill("error");
						svgBox.updateVisibility(true);
						successOutputArrow.updateColor("disabled");
						errorOutputArrow.updateColor("error");
					} else {
						svgBox.updateVisibility(false);
						successOutputArrow.updateColor("disabled");
						errorOutputArrow.updateColor("disabled");
					}
				}
			};

			return styleCommand;
		},

		/** The child command will call this on the parent command to know its connector position */
		getOutputPosition(what: "success" | "error", offsetBox: ClientRect) {
			if (!valueEl || !itemEl) return undefined;

			const itemSize = svg.getBox(itemEl, offsetBox);
			const valueSize = svg.getBox(valueEl, offsetBox);
			if (what === "success") {
				return {
					left: itemSize.left + successFactor * itemSize.width,
					top: valueSize.top + valueSize.height,
				};
			} else if (what === "error") {
				return {
					left: itemSize.left + errorFactor * itemSize.width,
					top: valueSize.top + valueSize.height,
				};
			}
			else {
				return undefined;
			}
		}
	}

	return command;
}

export function mergeCommands(command1: IRenderCommand | undefined, command2: IRenderCommand | undefined): IRenderCommand {

	if (!command1 && !command2) throw new Error("Cannot merge 2 empty commands.");
	if (!command1) return command2!;
	if (!command2) return command1;

	// TODO: Check same id and parentId?
	const command: IRenderCommand = {
		name: `${command1.name} & ${command2.name}`,
		id: command1.id || command2.id,
		parentId: command1.parentId || command2.parentId,
		canReplacePrevious: !!(command1.canReplacePrevious && command2.canReplacePrevious),
		updateLayout(_offsetBox: ClientRect) {
			return undefined;
		},
	};

	if (command1.updateDom || command2.updateDom) {
		command.updateDom = function updateDom(...args: any[]) {
			if (command1.updateDom) (command1.updateDom as any)(...args);
			if (command2.updateDom) (command2.updateDom as any)(...args);
		}
	}

	if (command1.updateSvg || command2.updateSvg) {
		command.updateSvg = function updateSvg(...args: any[]) {
			if (command1.updateSvg) (command1.updateSvg as any)(...args);
			if (command2.updateSvg) (command2.updateSvg as any)(...args);
		}
	}

	if (command1.updateLayout || command2.updateLayout) {
		command.updateLayout = function updateLayout(...args: any[]) {
			return svg.mergeUpdateLayout([
				command1.updateLayout ? (command1.updateLayout as any)(...args) : undefined,
				command2.updateLayout ? (command2.updateLayout as any)(...args) : undefined,
			]);
		}
	}

	if (command1.createStyleCommand || command2.createStyleCommand) {
		command.createStyleCommand = function createStyleCommand(...args: any[]) {
			const styleCommand1 = command1.createStyleCommand ? (command1.createStyleCommand as any)(...args) : undefined;
			const styleCommand2 = command2.createStyleCommand ? (command2.createStyleCommand as any)(...args) : undefined;
			return mergeCommands(styleCommand1, styleCommand2)!;
		}
	}

	const skipKeys = ["name", "id", "parentId", "canReplacePrevious", "updateLayout", "updateDom", "updateSvg", "createStyleCommand"];

	// Move over other items, no duplicates allowed
	Object.keys(command1).forEach(key => {
		if (skipKeys.includes(key)) return;
		if (key in command2) throw new Error(`Cannot merge '${key}' of commands`);
		(command as any)[key] = (command1 as any)[key];
	});

	Object.keys(command2).forEach(key => {
		if (skipKeys.includes(key)) return;
		if (key in command1) throw new Error(`Cannot merge '${key}' of commands`);
		(command as any)[key] = (command2 as any)[key];
	});

	return command;

}

export function useConnector(itemInfo: Pick<IPromiseItem, "id" | "parentId">) {
	return function addConnector(command: IRenderCommand) {
		return mergeCommands(
			command,
			createOutputCommand(itemInfo)
		);
	};
}