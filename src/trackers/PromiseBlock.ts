import * as svg from "../svg-utils";
import { assert } from "../utils";


declare global {
	export type IBlockPromise = ReturnType<typeof createPromiseBlock>;
}

function setItemStyle(svgBackground: ReturnType<typeof svg.rectFromEl> | undefined, styleName: string) {
	if (svgBackground) svgBackground.updateFill(styleName === "busy" ? "busy" : "normal");
}

export function createPromiseBlock(itemInfo: Pick<IPromiseItem, "id">, {title = "", style = "normal"} = {}) {

	let svgBackground: ReturnType<typeof svg.rectFromEl> | undefined;
	let svgBorderBox: ReturnType<typeof svg.rectFromEl> | undefined;
	let svgTitle: ReturnType<typeof svg.textFromEl> | undefined;

	const command = {
		name: "CreatePromiseBlock",
		id: itemInfo.id,
		parentId: undefined,

		/** Insert the SVG item before the background and after the border */
		insertSvgItemInside(svgEl: SVGElement) {

			// First Remove
			if (svgEl.parentElement) {
				svgEl.parentElement.removeChild(svgEl);
			}

			// At at the top, below border
			const el = assert(assert(svgBorderBox).svgEl);
			el.insertAdjacentElement("beforebegin", svgEl);

		},

		updateDom(itemHtmlEl: HTMLElement, itemSvgEl: SVGElement) {

			itemHtmlEl.classList.add("promise-item"); // Allow CSS styling

			const titleEl = document.createElement("div");
			titleEl.className = "promise-item__title"; // Allow CSS Styling
			titleEl.textContent = title;
			itemHtmlEl.appendChild(titleEl);

			svgBackground = svg.rectFromEl(itemHtmlEl);
			if (svgBackground.svgEl) {
				svgBackground.svgEl.classList.add("box"); // Allow CSS styling
				itemSvgEl.appendChild(svgBackground.svgEl);
			}

			svgTitle = svg.textFromEl(titleEl);
			if (svgTitle.svgEl) {
				svgTitle.svgEl.classList.add("promise__title"); // Allow CSS styling
				itemSvgEl.appendChild(svgTitle.svgEl);

			}

			svgBorderBox = svg.rectFromEl(itemHtmlEl);
			if (svgBorderBox.svgEl) {
				itemSvgEl.appendChild(svgBorderBox.svgEl);
			}

		},

		canReplacePrevious: true,

		updateLayout(offsetBox: ClientRect) {
			return svg.mergeUpdateLayout([
				svgBackground ? svgBackground.updateLayout(offsetBox) : undefined,
				svgTitle ? svgTitle.updateLayout(offsetBox) : undefined,
				svgBorderBox ? svgBorderBox.updateLayout(offsetBox) : undefined,
			]);
		},

		updateSvg(_itemSvgEl: SVGElement) {
			if (svgTitle) svgTitle.updateColor("normal");
			if (svgBorderBox) svgBorderBox.updateColor("normal");
			setItemStyle(svgBackground, style);
		},

		// Not needed by interface, but added so there command for same ID can use this
		createStyleCommand(styleName: string, _payload?: any) {

			const styleCommand: IRenderCommand = {
				name: "SetPromiseBlockStyle",
				id: itemInfo.id,
				parentId: undefined,
				canReplacePrevious: true,

				updateLayout(_offsetBox: ClientRect) {
					return undefined;
				},

				updateSvg() {
					// Only if no boxIndex?
					setItemStyle(svgBackground, styleName);
					// svgBorderBox.moveBorderToTop();
				},
			};
			return styleCommand;
		}
	};

	return command;
}
