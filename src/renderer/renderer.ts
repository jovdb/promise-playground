/*
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ createRenderer(el: HTMLElement) ┃ This function returns an object to add items in the tree or clear the entire tree
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ domEl,                          ┃ Root of DOM
┃ addDomItem,                     ┃ Create an element in the tree and return it so it can be populated
┃ addDomChildItem,                ┃ TODO: make same but without paarent ref?
┃                                 ┃
┃ svgEl,                          ┃
┃ addSvgItem,                     ┃
┃ addSvgChildItem,                ┃
┃                                 ┃
┃ clear(),                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
*/

// import { createPromiseGraph } from './promiseGraph';
import * as svg from "../svg-utils";

import "./renderer.css";
import { createCommandManager } from "./commands/Command";
import { assert, pipe, useRafThrottle } from "../utils";

declare global {

	interface IRenderItem {
		// TODO, refactor out (currently needed for graph)
		promise: Promise<any>;
	}

	interface IRenderer extends ReturnType<typeof createRenderer> {
	}

	interface IBroadcastMap {
		"Rendered": IMessage<"Rendered">;
	}
}

interface IItemMap {
	/** Item itself */
	htmlItemEl: HTMLElement;
	svgItemEl: SVGElement;
	command: IRenderCommand;
	children: string[];
}

function addHorizontalStack(parentEl: HTMLElement) {
	// Has Connector
	let tableEl = parentEl.querySelector(".children") as HTMLElement;
	if (tableEl)  {
		if (tableEl.tagName !== "TABLE") throw new Error("Unexpected sibling");
	} else {
		tableEl = document.createElement("table");
		tableEl.classList.add("children");
		tableEl.style.borderCollapse = "collapse";
		tableEl.style.borderSpacing = "0";
		tableEl.style.margin = "0 auto"; // Center if table is in a larger container
		parentEl.appendChild(tableEl);
	}

	let trEl = tableEl.firstChild as HTMLElement;
	if (trEl)  {
		if (trEl.tagName !== "TR") throw new Error("Unexpected sibling");
	} else {
		trEl = document.createElement("tr");
		tableEl.appendChild(trEl);
	}

	return trEl;
}

function addToHorizontalStack(trEl: HTMLElement, itemEl: HTMLElement) {
	const tdEl = document.createElement("td");

	tdEl.style.padding = "0";
	tdEl.style.verticalAlign = "top";
	trEl.appendChild(tdEl);

	tdEl.appendChild(itemEl);

}

function createItemEl() {

	const containerEl = document.createElement("div");
	containerEl.style.display = "inline-block";

	const itemEl = document.createElement("div");
	itemEl.style.display = "inline-block";
	containerEl.appendChild(itemEl);

	return { containerEl, itemEl };
}

/** Creates a hierachical tree of item */
export function createRenderer({
	el,
	broadcaster,
	getCode,
	getLink,
} : {
	el: HTMLElement,
	broadcaster: IBroadcaster;
	getCode?(): string;
	getLink?(): string;
}) {

	/** A number indicating the  */
	let isDisposed = false;
	const commandManager = createCommandManager(broadcaster);
	let lastRenderedIndex = -1;

	const itemMap = new Map<string, IItemMap>();

	function addDomItem(_itemId: string, parentItemId?: string) {

		const {itemEl, containerEl } = createItemEl();

		// Get Parent element
		let parentEl = rootTrEl;
		if (parentItemId) {
			const parentInfo = itemMap.get(parentItemId);
			if (!parentInfo) {
				console.error(`Unrendered item used as parent: ${parentItemId}`);
			} else {
				const parentItemEl = assert(parentInfo.htmlItemEl.parentElement);
				parentEl = addHorizontalStack(parentItemEl);
			}
		}

		addToHorizontalStack(parentEl, containerEl);

		return itemEl;
	}

	function addSvgItem(_itemId: string, _parentItemId?: string) {

		const gEl = svg.createSvgElement("g");
		svgRoot.appendChild(gEl);

		return gEl;
	}


	function addCommand(command: IRenderCommand) {
		commandManager.add(command);
	}

	const requestRender = pipe(
		render,
		useRafThrottle(),
	);

	function render(shouldRender?: (command: IRenderCommand) => boolean) {

		if (isDisposed) return;

		// Render the commands on an optimal way:
		// A list of commands is available and a pointer which item is last rendered
		// - Create and add all new items
		// - Update layout of all items
		// - Update to the last applied style name

		const lastCommandIndex = commandManager.commands.length - 1;
		let renderToIndex = lastCommandIndex;

		// determ what to render
		if (shouldRender) {
			for (let commandIndex = lastRenderedIndex + 1; commandIndex <= lastCommandIndex; commandIndex++) {
				const command = commandManager.commands[commandIndex];
				if (!shouldRender(command)) break;
				console.log(command.description || command.name);
				renderToIndex = commandIndex;
			}
		} else {
			for (let commandIndex = lastRenderedIndex + 1; commandIndex <= lastCommandIndex; commandIndex++) {
				const command = commandManager.commands[commandIndex];
				console.log(command.description || command.name);
			}
		}

		function getCommandsForDom() {

			const canReplaceCommands: { [commandId: string] : { [commandName: string] : IRenderCommand } } = {};
			const commands: IRenderCommand[] = [];

			for (let commandIndex = lastRenderedIndex + 1; commandIndex <= renderToIndex; commandIndex++) {
				const command = commandManager.commands[commandIndex];

				// Only commands that update DOM
				if (!command.updateDom) continue;

				if (command.canReplacePrevious) {
					if (!canReplaceCommands[command.id]) canReplaceCommands[command.id] = {};
					canReplaceCommands[command.id][command.name] = command;
					continue;
				}

				commands.push(command);
			}

			// Add canReplacePrevious Commands
			Object.keys(canReplaceCommands).forEach(commandId => {
				const commandsForId = canReplaceCommands[commandId];
				Object.keys(commandsForId).forEach(commandName => {
					commands.push(commandsForId[commandName]);
				});
			});

			return commands as unknown as (IRenderCommand & Required<Pick<IRenderCommand, "updateDom">>)[];
		}

		function getCommandsForSvg() {

			const canReplaceCommands: { [commandId: string] : { [commandName: string] : IRenderCommand } } = {};
			const commands: IRenderCommand[] = [];

			for (let commandIndex = lastRenderedIndex + 1; commandIndex <= renderToIndex; commandIndex++) {
				const command = commandManager.commands[commandIndex];

				// Only commands that update DOM
				if (!command.updateSvg) continue;

				if (command.canReplacePrevious) {
					if (!canReplaceCommands[command.id]) canReplaceCommands[command.id] = {};
					canReplaceCommands[command.id][command.name] = command;
					continue;
				}

				commands.push(command);
			}

			// Add canReplacePrevious Commands
			Object.keys(canReplaceCommands).forEach(commandId => {
				const commandsForId = canReplaceCommands[commandId];
				Object.keys(commandsForId).forEach(commandName => {
					commands.push(commandsForId[commandName]);
				});
			});

			return commands as unknown as (IRenderCommand & Required<Pick<IRenderCommand, "updateSvg">>)[];
		}

		if (lastRenderedIndex < lastCommandIndex) {

			// Update Dom
			const domCommands = getCommandsForDom();

			domCommands.forEach(command => {

				const itemInfo = itemMap.get(command.id);
				const htmlItemEl = itemInfo ? itemInfo.htmlItemEl : addDomItem(command.id, command.parentId);
				const svgItemEl = itemInfo ? itemInfo.svgItemEl : addSvgItem(command.id, command.parentId);

				let parentCommand: IRenderCommand | undefined = undefined;
				let siblingCommands: IRenderCommand[] = [];

				// Remember link for later UI updates
				if (!itemInfo) {
					itemMap.set(command.id, {
						htmlItemEl,
						svgItemEl,
						command,
						children: [],
					});
				}

				if (command.parentId) {
					const parentItem = itemMap.get(command.parentId);
					if (!parentItem) {
						console.error(`Unrendered item used as parent: ${command.parentId}`);
					} else {

						// Update children list of the parent
						if (!parentItem.children.includes(command.id)) {
							parentItem.children.push(command.id);
						}
						parentCommand = parentItem.command;
						siblingCommands = parentItem.children.map(id => assert(itemMap.get(id)).command);
					}
				}

				command.updateDom(htmlItemEl, svgItemEl, parentCommand, siblingCommands);
			});

			// Relayout all items
			let layoutSvgs: ((() => void) | undefined)[] | undefined;
			if (domCommands.length > 0) {
				const offsetBox = rootEl.getBoundingClientRect();
				layoutSvgs = domCommands.map(command => {
					// First measure DOM elements
					return command.updateLayout
						? command.updateLayout(offsetBox)
						: undefined;
				});
			}

			// Update DVG layout
			if (layoutSvgs) {
				layoutSvgs.forEach(layoutSvg => {
					if (layoutSvg) layoutSvg();
				});
			}


			// Apply the last styling
			const svgCommands = getCommandsForSvg();
			svgCommands.forEach(command => {
				const itemInfo = itemMap.get(command.id);
				if (!itemInfo) throw new Error(`Error executing command '${command.name}': RenderItem not found: ${command.id}`);
				command.updateSvg(itemInfo.svgItemEl);
			});

			// update svgSize
			const size = rootEl.getBoundingClientRect();
			svg.setSvgAttribute(svgEl, "viewBox", `0 0 ${size.width} ${size.height}`);
			svg.setSvgAttribute(svgEl, "width", `${size.width}px`);
			svg.setSvgAttribute(svgEl, "height", `${size.height}px`);

			// TODO: Update Metadata

			// Update render pointer
			lastRenderedIndex = renderToIndex;

			broadcaster.emit({
				name: "Rendered",
				payload: undefined,
			});

		} else if (lastCommandIndex === lastRenderedIndex) {
			// Up to date
		} else {
			// Something when wrong;
		}
	}


	// Create Root tot limit the full width
	const rootEl = document.createElement("div");
	rootEl.classList.add("rendering");
	rootEl.style.display = "inline-block";
	document.body.appendChild(rootEl);

	// Create a Horizontal stack for all root Promises
	const rootTrEl = addHorizontalStack(rootEl);
	const svgEl = svg.createSvgWithArrowMarkers({
		code: getCode ? getCode() : "",
		link: getLink ? getLink() : "",
	});
	const svgRoot = assert(svgEl.querySelector(".root"));

	el.appendChild(svgEl);

	return {

		addCommand,

		svgEl,
		domEl: rootEl,

		clear() {
			commandManager.clear();
			lastRenderedIndex = -1;
			while (svgRoot.firstChild) {svgRoot.removeChild(svgRoot.firstChild);}
			while (rootTrEl.firstChild) {rootTrEl.removeChild(rootTrEl.firstChild);}
		},

		commandManager,

		requestRender,

		dispose() {
			isDisposed = true;
			commandManager.dispose();
			lastRenderedIndex = -1;
			svgEl.remove();
			rootEl.remove();
		}
	};

}