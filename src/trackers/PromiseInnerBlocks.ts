import * as svg from "../svg-utils"
import { successFactor, errorFactor } from "./Promise";
import { assert } from "../utils";


function addInnerBlock(
	/** root item El */
	htmlItemEl: HTMLElement,
	_svgItemEl: SVGElement,
	innerBlock: IInnerBlock,

	/** Item to the elements to */
	containerEl: HTMLElement,

	/** Append arrow after background and before border */
	insertSvgItemInside: (svgEl: SVGElement) => void
) {

	const { title = "", tooltip = "", fromSuccess = false, fromError = false } = innerBlock || {};

	const boxEl = title ? document.createElement("div") : null;
	if (boxEl) {
		boxEl.classList.add("promise-item__inner-box");
		containerEl.appendChild(boxEl);
	}

	const titleEl = title ? document.createElement("div") : null;
	if (boxEl && titleEl) {
		titleEl.textContent = title;
		boxEl.appendChild(titleEl);
	}

	const inRatio = fromSuccess ? successFactor
		: fromError ? errorFactor
		: 0;

	const inArrow1 = !title
		? svg.createArrow({el: htmlItemEl, xFactor: inRatio, yFactor: 0}, {el: htmlItemEl, xFactor: inRatio, yFactor: 1}, 5 , 5) // No title, go through
		: inRatio
			? svg.createArrow({el: htmlItemEl, xFactor: inRatio, yFactor: 0}, {el: boxEl, xFactor: fromSuccess && fromError ? successFactor : 0.5, yFactor: 0}, 5 , 5)
			: undefined;

	if (inArrow1 && inArrow1.svgEl) {
		insertSvgItemInside(inArrow1.svgEl);
	}

	const inArrow2 = title && fromSuccess && fromError
		? svg.createArrow({el: htmlItemEl, xFactor: errorFactor, yFactor: 0}, {el: boxEl, xFactor: errorFactor, yFactor: 0}, 5 , 5)
		: undefined;

	if (inArrow2 && inArrow2.svgEl) {
		insertSvgItemInside(inArrow2.svgEl);
	}

	// SVG Items
	const successOutArrow = svg.createArrow({el: titleEl && boxEl, xFactor: successFactor, yFactor: 1}, {el: htmlItemEl, xFactor: successFactor, yFactor: 1}, 5 , 10);
	if (successOutArrow.svgEl) {
		insertSvgItemInside(successOutArrow.svgEl);
	}

	const errorOutArrow = svg.createArrow({el: titleEl && boxEl, xFactor: errorFactor, yFactor: 1}, {el: htmlItemEl, xFactor: errorFactor, yFactor: 1}, 15 , 10);
	if (errorOutArrow.svgEl) {
		insertSvgItemInside(errorOutArrow.svgEl);
	}

	// Box above arrows
	const svgBox = svg.rectFromEl(titleEl && boxEl);
	if (svgBox.svgEl) {
		svg.setSvgAttribute(svgBox.svgEl, "fill", "#ffffff"); // Hide underlaying line if large text box
		insertSvgItemInside(svgBox.svgEl);
	}

	const svgTitle = svg.textFromEl(titleEl);
	if (svgTitle.svgEl) {

		if (tooltip) {
			const svgTooltip = svg.createSvgElement("title");
			svgTooltip.textContent = tooltip;
			svgTitle.svgEl.appendChild(svgTooltip);
		}

		insertSvgItemInside(svgTitle.svgEl);
	}

	return {
		svgBox,
		svgTitle,
		inArrow1,
		inArrow2,
		successOutArrow,
		errorOutArrow,
	};
}

export interface IInnerBlock {
	title: string;
	tooltip?: string,
	/** Initial style */
	style: string;
	fromSuccess?: boolean;
	fromError?: boolean;
}


export function getPromiseStyle(styleName: string) {

	return {

		isSuccessIn: () => styleName === "success-in",
		hasSuccessIn: () => styleName.startsWith("success-in") || styleName === "success",
		hasSuccessOut: () => styleName.endsWith("success-out") || styleName === "success",

		isErrorIn: () => styleName === "error-in",
		hasErrorIn: () => styleName.startsWith("error-in") || styleName === "error",
		hasErrorOut: () => styleName.endsWith("error-out") || styleName === "error",

	}
}

function updateInnerBlockStyle(innerBlock: ReturnType<typeof addInnerBlock>, styleName: string, dontShowOutput = false, insertSvgItemInside?: (svgEl: SVGElement) => void) {


	const promiseStyle = getPromiseStyle(styleName);

	// Success
	const boxColor =
		styleName === "busy" || styleName === "normal" || promiseStyle.isSuccessIn() || promiseStyle.isErrorIn() ? "normal" :
		promiseStyle.hasErrorOut() ? "error" :
		promiseStyle.hasSuccessOut() ? "success" :
		"disabled";


	if (innerBlock.svgBox) {
		innerBlock.svgBox.updateFill(styleName === "busy" || promiseStyle.isSuccessIn() || promiseStyle.isErrorIn() ? "busy" : "normal");
		innerBlock.svgBox.updateColor(boxColor);
	}

	if (innerBlock.svgTitle) innerBlock.svgTitle.updateColor(boxColor);

	if (innerBlock.inArrow1) {
		const color = promiseStyle.hasSuccessIn() ? "success"
			: promiseStyle.hasErrorIn() && !innerBlock.inArrow2 ? "error"
			: "disabled"
		innerBlock.inArrow1.updateColor(color);
		if (promiseStyle.hasSuccessIn() && insertSvgItemInside && innerBlock.inArrow1.svgEl) insertSvgItemInside(innerBlock.inArrow1.svgEl);
	}

	if (innerBlock.inArrow2) {
		const color = promiseStyle.hasErrorIn() ? "error"
			: "disabled"
		innerBlock.inArrow2.updateColor(color);
		if (promiseStyle.hasErrorIn() && insertSvgItemInside && innerBlock.inArrow2.svgEl) insertSvgItemInside(innerBlock.inArrow2.svgEl);
	}

	// TODO: Innerblock must be above new raised in arrow


	if (innerBlock.successOutArrow) {
		innerBlock.successOutArrow.updateColor(!dontShowOutput && promiseStyle.hasSuccessOut() ? "success" : "disabled");
		if (!dontShowOutput && promiseStyle.hasSuccessOut() && insertSvgItemInside && innerBlock.successOutArrow.svgEl) insertSvgItemInside(innerBlock.successOutArrow.svgEl);
	}

	if (innerBlock.errorOutArrow) {
		innerBlock.errorOutArrow.updateColor(!dontShowOutput && promiseStyle.hasErrorOut() ? "error" : "disabled");
		if (!dontShowOutput && promiseStyle.hasErrorOut() && insertSvgItemInside && innerBlock.errorOutArrow.svgEl) insertSvgItemInside(innerBlock.errorOutArrow.svgEl);
	}

}


export function useInnerBlocks(innerBlocks: ReadonlyArray<IInnerBlock>) {

	return function addInnerBlocks(command: IBlockPromise) {

		// return command;

		const { updateDom, updateLayout, updateSvg, createStyleCommand } = command;
		let innerBlockResults: (ReturnType<typeof addInnerBlock>)[] | undefined;

		command.updateDom = function useInnerBlocks_updateDom(htmlItemEl: HTMLElement, svgItemEl: SVGElement): void {

			if (updateDom) updateDom(htmlItemEl, svgItemEl);

			// A table works best for evenly scale left and right side
			const tableEl = document.createElement("table");
			tableEl.style.width = "100%";
			htmlItemEl.appendChild(tableEl);

			// Add to Table row
			const trEl = document.createElement("tr");
			tableEl.appendChild(trEl);

			innerBlockResults = innerBlocks.map(innerBlock => {

				// Add to Table cell
				const tdEl = document.createElement("td");
				trEl.appendChild(tdEl);
				const { insertSvgItemInside } = command;
				return addInnerBlock(htmlItemEl, svgItemEl, innerBlock, tdEl, insertSvgItemInside);
			});


		};

		command.updateLayout = function useInnerBoxes_updateLayout(offsetBox: ClientRect) {
			if (!innerBlockResults) return () => undefined;

			return svg.mergeUpdateLayout([
				updateLayout(offsetBox),
				...innerBlockResults.map(innerBlock => innerBlock && innerBlock.inArrow1 ? innerBlock.inArrow1.updateLayout(offsetBox) : undefined),
				...innerBlockResults.map(innerBlock => innerBlock && innerBlock.inArrow2 ? innerBlock.inArrow2.updateLayout(offsetBox) : undefined),
				...innerBlockResults.map(innerBlock => innerBlock && innerBlock.successOutArrow ? innerBlock.successOutArrow.updateLayout(offsetBox) : undefined),
				...innerBlockResults.map(innerBlock => innerBlock && innerBlock.errorOutArrow ? innerBlock.errorOutArrow.updateLayout(offsetBox) : undefined),
				...innerBlockResults.map(innerBlock => innerBlock && innerBlock.svgBox ? innerBlock.svgBox.updateLayout(offsetBox) : undefined),
				...innerBlockResults.map(innerBlock => innerBlock && innerBlock.svgTitle ? innerBlock.svgTitle.updateLayout(offsetBox) : undefined),
			]);
		};

		command.updateSvg = function useInnerBoxes_updateSvg(svgItemEl: SVGElement) {
			if (!innerBlockResults) return;

			if (updateSvg) updateSvg(svgItemEl);
			innerBlockResults.forEach((innerBlock, currentBoxIndex) => {
				if (!innerBlock) return;
				const innerBlockInput = innerBlocks[currentBoxIndex];
				const initialStyle = innerBlockInput ? innerBlockInput.style || "" : "";
				updateInnerBlockStyle(innerBlock, initialStyle, false);
			});
		};

		// If multiple innerboxes, they are targeted one by one
		if (command.canReplacePrevious && innerBlocks.length > 1) {
			command.canReplacePrevious = false;
		}

		command.createStyleCommand = function useInnerBoxes_createStyleCommand(styleName: string, payload?: any) {

			const styleCommand = assert(createStyleCommand)(styleName, payload);

			const { boxIndex, dontShowOutput } = payload;
			const { updateSvg } = styleCommand;

			styleCommand.updateSvg = function useInnerBoxes_createStyleCommand_updateSvg(svgItemEl: SVGElement) {

				// Call original Code
				if (updateSvg) updateSvg(svgItemEl);

				if (!innerBlockResults) return;
				const moveToTop = innerBlockResults.length > 1;

				innerBlockResults.forEach((innerBlock, currentBoxIndex) => {

					if (innerBlock) {
						if (boxIndex === -1 || currentBoxIndex === boxIndex)
						updateInnerBlockStyle(innerBlock, styleName, dontShowOutput, moveToTop ? command.insertSvgItemInside : undefined);
					}

				});

			}

			return styleCommand;
		}

		return command;
	};
}
