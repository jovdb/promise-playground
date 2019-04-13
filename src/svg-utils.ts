import { assert } from "./utils";

declare global {
	type ColorName = keyof typeof colors;
	type FillColorName = keyof typeof fillColors;

	interface IStyle {
		boxWidth: number;
		lineWidth: number;
		colorName: ColorName;
		arrowRounding: number;
		boxRounding: number;
	}

	interface IBox {
		left: number;
		top: number;
		width: number;
		height: number;
	}
}

export const colors = {
	light: "#ffffff",
	normal: "#000000",
	success: "#0F9D58",
	error: "#DB4437",
	disabled: "#e0e0e0",
}

export const fillColors = {
	normal: "#ffffff",
	busy: "url(#busy-pattern)",
	success: "#0F9D58",
	error: "#DB4437",
}

export const defaultStyle: IStyle = {
	boxWidth: 4,
	lineWidth: 2,
	colorName: "normal",
	arrowRounding: 1/4,
	boxRounding: 6,
}


export function createSvgWithArrowMarkers({
	code,
	link,
}: {
	code?: string;
	link?: string;
}) {
	const div = document.createElement('div');

	function arrowMarker(style: ColorName) {
		const scale = 1 - defaultStyle.lineWidth / 16 ;
		return `<marker id="arrow-${style}" markerWidth="${9 * scale}" markerHeight="${6 * scale}" refX="${9 * scale}" refY="${3 * scale}" orient="auto">
			<path d="M0,0 L0,${6 * scale} L${9 * scale},${3 * scale} z" fill="${colors[style]}" />
		</marker>`;
	}

	// const colorNames = ["normal", "success", "disabled", "error"] as ColorName[];
	const colorNames = [] as ColorName[]; // disabled arrows
	const busyColor = "#f0f0f0";

	div.innerHTML = `<svg
	xmlns="http://www.w3.org/2000/svg"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:cc="http://creativecommons.org/ns#"
	xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
	xmlns:xlink="http://www.w3.org/1999/xlink">

	<desc></desc>
	<metadata>
		<rdf:RDF>
			<cc:Work
				rdf:about="">
				<dc:format>image/svg+xml</dc:format>
				<dc:type
					rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
				<dc:title></dc:title>
				<dc:creator>
					<cc:Agent>
						<dc:title>${link}</dc:title>
					</cc:Agent>
				</dc:creator>
				<dc:contributor>
					<cc:Agent>
						<dc:title>Van den Berghe Jo</dc:title>
					</cc:Agent>
				</dc:contributor>
			</cc:Work>
		</rdf:RDF>
	</metadata>
	<defs>
		${colorNames.map(color => arrowMarker(color)).join("\n")}
		<pattern xmlns="http://www.w3.org/2000/svg" id="busy-pattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
			<path d="M 50 0 L 0 50 L 25 50 L 75 0 Z" transform="translate(-88.6241 0)" fill="${busyColor}">
				<animateTransform attributeName="transform" type="translate" values="-100 0;-50 0" keyTimes="0;1" dur="0.8s" repeatCount="indefinite"/>
			</path>
			<path d="M 50 0 L 0 50 L 25 50 L 75 0 Z" transform="translate(-38.6241 0)" fill="${busyColor}">
				<animateTransform attributeName="transform" type="translate" values="-50 0;0 0" keyTimes="0;1" dur="0.8s" repeatCount="indefinite"/>
			</path>
			<path d="M 50 0 L 0 50 L 25 50 L 75 0 Z" transform="translate(11.3759 0)" fill="${busyColor}">
				<animateTransform attributeName="transform" type="translate" values="0 0;50 0" keyTimes="0;1" dur="0.8s" repeatCount="indefinite"/>
			</path>
		</pattern>
	</defs>
	<g class="root">
	</g>
</svg>`;
	const svgEl = div.firstChild as SVGElement;

	if (code) {
		const descEl = svgEl.querySelector("desc");
		if (descEl) descEl.textContent = code;
	}

	return svgEl;
}

export function createSvgElement(name: string) {
	return document.createElementNS("http://www.w3.org/2000/svg", name);
}

export function setSvgAttribute(el: SVGElement, name: string, value?: string, namespace = "") {
	if (value !== undefined) {
		el.setAttributeNS(namespace, name, value);
	} else {
		removeSvgAttribute(el, name);
	}
}
export function removeSvgAttribute(el: SVGElement, name: string, namespace = "") {
	el.removeAttributeNS(namespace, name);
}

export function round(dx1: number, dy1: number, dx2: number, dy2: number, rounding: number) {

	return rounding
	? `l${dx1 * (1 - rounding)} ${dy1 * (1 - rounding)}
q${dx1 * rounding} ${dy1 * rounding} ${dx1 * rounding + dx2 * rounding} ${dy1 * rounding + dy2 * rounding}
l${dx2 * (1 - rounding)} ${dy2 * (1 - rounding)}`
	: `l${dx1} ${dy1}
l${dx2} ${dy2}`;
}

export function moveToBottom(bottomEl: SVGElement) {
	if (!bottomEl) return;
	const parentEl = assert(bottomEl.parentElement);
	parentEl.removeChild(bottomEl);
	parentEl.insertAdjacentElement("afterbegin", bottomEl);
}

export function moveToTop(topEl: SVGElement | null | undefined) {
	if (!topEl) return;
	const parentEl = assert(topEl.parentElement);
	parentEl.removeChild(topEl);
	parentEl.appendChild(topEl);
}

export function moveToLast(moveEl: SVGElement | null | undefined, els: ReadonlyArray<SVGElement | null | undefined>) {

	if (!moveEl || !els) return;
	const parentEl = assert(moveEl.parentElement!);
	const children = Array.from(parentEl.children);

	const sortedEls = els.slice().sort((el1, el2) => {
		if (!el1 || el1.parentElement !== parentEl) return 0;
		if (!el2 || el2.parentElement !== parentEl) return 0;
		const el1Index = children.indexOf(el1);
		const el2Index = children.indexOf(el2);
		return el2Index - el1Index;
	})

	const lastEl = sortedEls[sortedEls.length - 1];

	if (lastEl) {
		parentEl.removeChild(moveEl);
		lastEl.insertAdjacentElement("afterend", moveEl);
	}

}
/*
export function moveBefore(moveBeforeEl: SVGElement | null | undefined) {
	if (!el || !moveBeforeEl) return;
	parentEl.removeChild(el);
	moveBeforeEl.insertAdjacentElement("beforebegin", el);
}*/

export function moveAfter(el: SVGElement | null | undefined, moveAfterEl: SVGElement | null | undefined) {
	if (!el || !moveAfterEl) return;
	const parentEl = assert(el.parentElement);
	parentEl.removeChild(el);
	moveAfterEl.insertAdjacentElement("afterend", el);
}

export function getBox(el: HTMLElement, offsetBox?: IBox) {
		const box = el.getBoundingClientRect();
		return {
			left: box.left - (offsetBox ? offsetBox.left : 0),
			top: box.top - (offsetBox ? offsetBox.top : 0),
			width: box.width,
			height: box.height,
		}
	}

export function rectFromEl(el: HTMLElement | null | undefined) {

	let svgEl: SVGElement | undefined;

	if (el) {
		svgEl = createSvgElement("rect");
		setSvgAttribute(svgEl, "fill", "none");
		setSvgAttribute(svgEl, "stroke-width", defaultStyle.boxWidth.toString());
		setSvgAttribute(svgEl, "rx", defaultStyle.boxRounding.toString());
		setSvgAttribute(svgEl, "ry", defaultStyle.boxRounding.toString());
	}

	return {
		svgEl,

		updateLayout(offsetBox: IBox) {

			if (!el) return;
			const size = getBox(el, offsetBox);

			return () => {
				if (!svgEl) return;
				setSvgAttribute(svgEl, "x", size.left.toString());
				setSvgAttribute(svgEl, "y", size.top.toString());
				setSvgAttribute(svgEl, "width", size.width.toString());
				setSvgAttribute(svgEl, "height", size.height.toString());
			};
		},

		updateColor(colorName: ColorName = defaultStyle.colorName) {
			if (!svgEl) return;
			setSvgAttribute(svgEl, "stroke", colors[colorName]);
		},

		updateFill(fillColorName: FillColorName) {
			if (!svgEl) return;
			setSvgAttribute(svgEl, "fill", fillColors[fillColorName]);
		},

		updateVisibility(show: boolean) {
			if (!svgEl) return;
			if (show) {
				svgEl.removeAttributeNS(null, "visibility");
			} else {
				setSvgAttribute(svgEl, "visibility", "hidden");
			}
		},

		moveBorderToTop() {
			if (!svgEl) return;
			moveToTop(svgEl);
		},
	};
}

export interface Anchor {
	el: HTMLElement | null | undefined;
	xFactor: number;
	yFactor: number;
}
export function createLine(from: Anchor, to: Anchor) {

	let svgEl: SVGElement | undefined;
	if (from.el && to.el) {
		svgEl = createSvgElement("line") as SVGElement
		setSvgAttribute(svgEl, "stroke-width", defaultStyle.lineWidth.toString());
	}

	return {
		svgEl,

		updateLayout(offsetBox: IBox) {

			if (!from.el || !to.el) return;
			const {left: x1, top: y1} = getPoint(from.el, offsetBox, from.xFactor, from.yFactor);
			const {left: x2, top: y2} = getPoint(to.el, offsetBox, to.xFactor, to.yFactor);

			return () => {
				if (!svgEl) return;
				setSvgAttribute(svgEl, "x1", x1.toString());
				setSvgAttribute(svgEl, "y1", y1.toString());
				setSvgAttribute(svgEl, "x2", x2.toString());
				setSvgAttribute(svgEl, "y2", y2.toString());
			};
		},

		updateColor(colorName: ColorName = defaultStyle.colorName) {
			if (!svgEl) return;
			setSvgAttribute(svgEl, "stroke", colors[colorName]);
		},
	};
}

export function createArrow(from: Anchor, to: Anchor, topCurveDistance = 10, bottomCurveDistance = 10) {

	let svgEl: SVGElement | undefined;
	if (from.el && to.el) {
		svgEl = createSvgElement("path") as SVGElement
		setSvgAttribute(svgEl, "stroke-width", defaultStyle.lineWidth.toString());
		setSvgAttribute(svgEl, "fill", "none");
		setSvgAttribute(svgEl, "marker-end", `url(#arrow-${"normal"})`)
	}

	const result = {
		svgEl,

		updateLayout(offsetBox: IBox) {
			if (!from.el || !to.el) return;
			const {left: x1, top: y1} = getPoint(from.el, offsetBox, from.xFactor, from.yFactor);
			const {left: x2, top: y2} = getPoint(to.el, offsetBox, to.xFactor, to.yFactor);

			return () => result.updatePosition(x1, y1, x2, y2);
		},

		updatePosition(x1: number, y1: number, x2: number, y2: number) {
			if (!svgEl) return;

			const arrowHeight = 6;
			const offsetY = y2 - y1 - bottomCurveDistance - topCurveDistance - arrowHeight;
			const offsetX = x2 - x1;
			const roundingFactor = 0.75;

			setSvgAttribute(svgEl, "d", `M${x1} ${y1}
${round(0, topCurveDistance, offsetX/2, offsetY/2, roundingFactor)}
${round(offsetX/2, offsetY/2, 0, bottomCurveDistance, roundingFactor)}
L ${x2} ${y2}`);
		},

		updateColor(colorName: ColorName = defaultStyle.colorName) {
			if (!svgEl) return;
			setSvgAttribute(svgEl, "stroke", colors[colorName]);
			setSvgAttribute(svgEl, "marker-end", `url(#arrow-${colorName})`)
		},
	};
	return result;
}

export function textFromEl(el: HTMLElement | null | undefined) {

	let svgEl: SVGElement | undefined;
	if (el) {
		svgEl = createSvgElement("text");
		setSvgAttribute(svgEl, "text-anchor", "middle");
		svgEl.textContent = " "; // Make a Node
	}

	const result = {
		svgEl,

		updateLayout(offsetBox: IBox) {

			if (!el) return;
			const style = window.getComputedStyle(el);
			const size = getBox(el, offsetBox);

			return () => {
				if (!svgEl) return;
				setSvgAttribute(svgEl, "x", (size.left + size.width / 2).toString());
				setSvgAttribute(svgEl, "y", (size.top + parseFloat(style.paddingTop || "0") + parseFloat(style.fontSize || "0") - 1).toString()); // HACK for Edge
				// setSvgAttribute(svgEl, "dominant-baseline", "middle");
				setSvgAttribute(svgEl, "font-family", style.fontFamily || undefined); // Use from el, because layouted with this font
				setSvgAttribute(svgEl, "font-weight", style.fontWeight || undefined);
				setSvgAttribute(svgEl, "font-size", style.fontSize || undefined);
				result.updateText();
			}
		},

		updateColor(colorName: ColorName = defaultStyle.colorName) {
			if (!svgEl) return;
			setSvgAttribute(svgEl, "fill", colors[colorName]);
		},

		updateText() {
			if (!svgEl || !el) return;
			const childNodes = svgEl.childNodes;
			if (childNodes.length > 1) {
				// Assume first childnode is the text
				childNodes[0].nodeValue = el.textContent; // Don't replace children
			} else {
				svgEl.textContent = el.textContent;
			}
		},
	};

	return result;
}

export function mergeUpdateLayout(updateSvgs: undefined | (undefined | (() => void))[]) {
	return () => {
		if (updateSvgs) {
			updateSvgs.forEach(function execUpdateLayoutResult(updateSvg) {
				if (updateSvg) updateSvg();
			});
		}
	}

}

export function getPoint(el: HTMLElement, offsetBox: IBox, xFactor: number, yFactor: number) {
	const size = getBox(el, offsetBox);
	return {
		left: size.left + size.width * xFactor,
		top: size.top + size.height * yFactor,
	}
}
