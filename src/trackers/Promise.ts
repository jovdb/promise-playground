/*
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ EXPORTED                             ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ addToRenderer(renderer): IDisposable ┃ Tracks Promise and will add items to the render tree
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
*/

import {promiseTracker, isPromise, getUntrackedPromise } from "../promiseTracker";
import * as svg from "../svg-utils";
import "./promise.css";
import { getOid } from "../oid";

import { createPromiseBlock } from "./PromiseBlock";
import { useInnerBlocks as withInnerBlocks, IInnerBlock } from "./PromiseInnerBlocks";
import { pipe, assert } from "../utils";
import { useConnector as withConnector } from "../connector";

declare global {
	interface IPromiseItem {
		type: string;
		id: string;
		parentId?: string,
		isStatic: boolean,
		promise: Promise<any>;
		parentPromise?: Promise<any>;
		args: any[] | undefined;
	}
}

export function getFunctionName(fn: any) {
	if (typeof fn === "function") {
		return fn.name || "";
	}
	return "";
}

let stepId = 0;
const getStepId = () => stepId;
const nextStepId = () => ++stepId;

function withStepId(stepId: number) {
	return function addStepId(command: IRenderCommand) {
		command.stepId = stepId;
		return command;
	}
}

function withDescription(description: string) {
	return function addDescription(command: IRenderCommand) {
		command.description = `#${command.id}: ${description} (Render group: ${command.stepId})`;
		return command;
	}
}



export function getBoxTitle(o?: any) {
	let title = "";
	const maxLength = 22;

	// Hacked together something
	// TODO: improve

	if (isPromise(o)) {
		title = "<Promise>"
	}

	if (!title && o instanceof Error) {
		title = `${o.name}: ${o.message}`;
		if (!title || title.length > maxLength) title = `${title.slice(0, maxLength - 3)}...`;
	}

	// Try stringify
	if (!title) {
		try {
			if ((typeof o === "object") && o.constructor && o.constructor.name && o.constructor.name !== "Object") {
				title = o.constructor.name + ": ";
			} else {
				title = "";
			}

			title += JSON.stringify(o);
			if (!title || title.length > maxLength) title = `${title.slice(0, maxLength - 3)}...`;
		} catch(e) {
		}
	}

	// Show constructor name
	if (!title && o && o.constructor && o.constructor.name) {
		title = `${o.constructor.name}`;
		if (!title || title.length > maxLength) title = `${title.slice(0, maxLength - 3)}...`;
	}

	if (!title) {
		title = `${o}`;
		if (!title || title.length > maxLength) title = `${title.slice(0, maxLength - 3)}...`;
	}

	return title;

}

export function getTooltip(o?: any) {
	let title = "";
	const maxLength = 400;

	// Hacked together something
	// TODO: improve

	if (isPromise(o)) {
		title = "<Promise>"
	}

	if (typeof o === "function") {
		title = o.toString();
		if (!title || title.length > maxLength) title = `${title.slice(0, maxLength - 3)}...`;
	}

	if (!title && o instanceof Error) {
		title = `${o.name}: ${o.message}`;
		if (!title || title.length > maxLength) title = `${title.slice(0, maxLength - 3)}...`;
	}

	// Try stringify
	if (!title) {
		try {
			if ((typeof o === "object") && o.constructor && o.constructor.name && o.constructor.name !== "Object") {
				title = o.constructor.name + ": ";
			} else {
				title = "";
			}

			title += JSON.stringify(o, undefined, "  ");
			if (!title || title.length > maxLength) title = `${title.slice(0, maxLength - 3)}...`;
		} catch(e) {
		}
	}

	// Show constructor name
	if (!title && o && o.constructor && o.constructor.name) {
		title = `${o.constructor.name}`;
		if (!title || title.length > maxLength) title = `${title.slice(0, maxLength - 3)}...`;
	}

	if (!title) {
		title = `${o}`;
		if (!title || title.length > maxLength) title = `${title.slice(0, maxLength - 3)}...`;
	}

	return title;

}

export const successFactor = 0.25;
export const errorFactor = 0.75;


function createTitle(title: string) {
	const titleEl = document.createElement("div");
	titleEl.className = "promise-item__title";
	titleEl.textContent = title;
	return { titleEl };
}

/** Box with background, border and title */
export function createItem(itemEl: HTMLElement, svgEl: SVGElement, { title = ""} = {}) {

	const { titleEl } = createTitle(title);
	itemEl.classList.add("promise-item"); // Allow CSS styling
	itemEl.appendChild(titleEl);

	// SVG Items
	const updateLayouts: {
		updateLayout(offsetBox: ClientRect): undefined | (() => void);
	}[] = [];

	const svgBackground = svg.rectFromEl(itemEl);
	if (svgBackground.svgEl) {
		svgBackground.svgEl.classList.add("box"); // Allow CSS styling
		svgEl.appendChild(svgBackground.svgEl);
		svgBackground.updateColor("normal");
		updateLayouts.push(svgBackground);
	}

	const svgTitle = svg.textFromEl(titleEl);
	if (svgTitle.svgEl) {
		svgTitle.svgEl.classList.add("promise__title"); // Allow CSS styling
		svgEl.appendChild(svgTitle.svgEl);
		svgTitle.updateColor("normal");
		updateLayouts.push(svgTitle);
	}

	const svgBorderBox = svg.rectFromEl(itemEl);
	if (svgBorderBox.svgEl) {
		svgEl.appendChild(svgBorderBox.svgEl);
		svgBorderBox.updateColor("normal");
		updateLayouts.push(svgBorderBox);
	}

	function styleSvgItem(newState: string) {
		svgBackground.updateFill(newState === "busy" ? "busy" : "normal")
		svgBorderBox.moveBorderToTop();
	}

	return {
		svgBox: svgBorderBox,

		updateLayout(offsetBox: ClientRect) {

			const updateSvgs = updateLayouts.map(item => item.updateLayout(offsetBox));
			return () => {
				updateSvgs.forEach(updateSvg => {
					if (updateSvg) updateSvg()
				});
			}
		},

		styleSvgItem,
	};
}


export function addToRenderer(renderer: IRenderer) {

	const itemMap = new WeakMap<Promise<any>, IPromiseItem> ();

	return promiseTracker({

		lazyPromiseArgument() {
			// If one of the arguments of function (then, catch, ...) returns a promise
			// we want a step brek
			nextStepId();
		},
		result(_functionName, promise, args) {

			const item: IPromiseItem = {
				type: "out",
				id: getOid(),
				isStatic: false,
				promise,
				args,
			};

			// Create Command
			const title = `${_functionName}(${args[0]})`;
			const command = pipe(
				createPromiseBlock(item, { title, style: "busy"}),
				withStepId(getStepId()),
				withConnector(item),
				withDescription(`Function that returns a Promise: added`)
			);
			renderer.addCommand(command);

			// Handle result
			promise = getUntrackedPromise(item.promise).then(
				(value: any) => {
					renderer.addCommand(
						pipe(
							command.createStyleCommand!("success", { value }),
							withStepId(getStepId()),
							withDescription(`Function that returns a Promise: succeeded`),
						)
					);
					nextStepId();
					return value;
				},
				(value: any) => {
					renderer.addCommand(
						pipe(
							command.createStyleCommand!("error", { value }),
							withStepId(getStepId()),
							withDescription(`Function that returns a Promise: failed`),
						)
					);
					nextStepId();
					throw value;
				},
			);

			itemMap.set(promise, item);

			return promise;
		},

		ctor(promise, args) {

			const item: IPromiseItem = {
				type: "new",
				id: getOid(),
				isStatic: true,
				promise,
				args,
			};

			itemMap.set(promise, item);

			// Create Command
			const innerBlocks: IInnerBlock[] = [];
			if (args && args[0]) {
				const executerArgLength = args[0].length;
				if (executerArgLength > 0) innerBlocks.push({ title: "resolve", style: "disabled", tooltip: "" });
				if (executerArgLength > 1) innerBlocks.push({ title: "reject", style: "disabled", tooltip: "" });
			}
			const title = `new Promise(${getFunctionName(args[0])})`;
			const command = pipe(
				createPromiseBlock(item, { title, style: "busy"}),
				withInnerBlocks(innerBlocks),
				withStepId(getStepId()),
				withConnector(item),
				withDescription(`new Promise(): added`),
			);
			renderer.addCommand(command);

			promise = getUntrackedPromise(item.promise).then(
				(value: any) => {
					nextStepId(); // Add render step before resolve function is called
					renderer.addCommand(
						pipe(
							command.createStyleCommand!("success", { value, boxIndex: 0 }),
							withStepId(getStepId()),
							withDescription(`new Promise(): succeeded`),
						)
					);
					nextStepId(); // Add render step at resolve
					return value;
				},
				(value: any) => {
					nextStepId(); // Add render step before resolve function is called
					renderer.addCommand(
						innerBlocks.length < 2
						? pipe(
							command.createStyleCommand!("error", { value, boxIndex: 0 }),
							withStepId(getStepId()),
							withDescription(`new Promise(): failed`),
						)
						: pipe(
							command.createStyleCommand!("error", { value, boxIndex: 1 }),
							withStepId(getStepId()),
							withDescription(`new Promise(): failed`),
						)
					);
					nextStepId(); // Add render step at resolve
					throw value;
				},
			);

			itemMap.set(promise, item);

			return promise;

		},

		methods(functionName, outPromise, args, inPromise) {

			const parentItem = inPromise ? itemMap.get(inPromise) : undefined;

			const item: IPromiseItem = {
				type: functionName,
				id: getOid(),
				parentId: parentItem ? parentItem.id : undefined,
				isStatic: false,
				promise: outPromise,
				parentPromise: inPromise,
				args,
			};

			switch(functionName) {
				case "then": {

					// Create Command
					const innerBlocks: (IInnerBlock)[] = [];
					innerBlocks.push({ title: args && args[0] ? getFunctionName(args[0]) || "success" : "", style: "disabled", fromSuccess: true });
					innerBlocks.push({ title: args && args[1] ? getFunctionName(args[1]) || "error" : "", style: "disabled", fromError: true });

					const title = `.then()`;
					const command = pipe(
						createPromiseBlock(item, { title, style: "normal"}),
						withInnerBlocks(innerBlocks),
						withConnector(item),
						withStepId(getStepId()),
						withDescription(`.then(): added`),
					);
					renderer.addCommand(command);

					// Handle result
					let isSuccesIn = true;
					getUntrackedPromise(assert(item.parentPromise)).then(
						() => {
							if (args && args[0]) {
								renderer.addCommand(
									pipe(
										command.createStyleCommand!("success-in", { boxIndex: 0 }),
										withStepId(getStepId()),
										withDescription(`.then(): from success`),
									)
								);
							}
						},
						() => {
							if (args && args[1]) {
								renderer.addCommand(
									pipe(
										command.createStyleCommand!("error-in", { boxIndex: 1 }),
										withStepId(getStepId()),
										withDescription(`.then(): from error`),
									)
								);
							};
							isSuccesIn = false;
						});

					outPromise = getUntrackedPromise(item.promise).then(
						(value: any) => {
							renderer.addCommand(
								pipe(
									command.createStyleCommand!(`${isSuccesIn ? "success" : "error"}-in_success-out`, { value, boxIndex: isSuccesIn ? 0 : 1}),
									withStepId(getStepId()),
									withDescription(`.then(): to success`),
								)
							);
							nextStepId();
							return value;
						},
						(value: any) => {
							renderer.addCommand(
								pipe(
									command.createStyleCommand!(`${isSuccesIn ? "success" : "error"}-in_error-out`, { value, boxIndex: isSuccesIn ? 0 : 1 }),
									withStepId(getStepId()),
									withDescription(`.then(): to error`),
								)
							);
							nextStepId();
							throw value;
						},
					);

					itemMap.set(outPromise, item);

					return outPromise;
				}

				case "catch": {

					// Create Command
					const innerBlocks: (IInnerBlock)[] = [];
					innerBlocks.push({ title: "", style: "disabled", fromSuccess: true, tooltip: "" });
					innerBlocks.push({ title: args && args[0] ? getFunctionName(args[0]) || "error" : "", style: "disabled", fromError: true });

					const title = `.catch()`;
					const command = pipe(
						createPromiseBlock(item, { title, style: "normal"}),
						withInnerBlocks(innerBlocks),
						withConnector(item),
						withStepId(getStepId()),
						withDescription(`.catch(): added`),
					);
					renderer.addCommand(command);

					// Handle result
					let isSuccesIn = true;
					getUntrackedPromise(assert(item.parentPromise)).catch(() => {
						if (args && args[0]) {
							renderer.addCommand(
								pipe(
									command.createStyleCommand!("error-in", { boxIndex: 1 }),
									withStepId(getStepId()),
									withDescription(`.then(): from error`),
								)
							);
						}
						isSuccesIn = false;
					});

					outPromise = getUntrackedPromise(item.promise).then(
						(value: any) => {
							renderer.addCommand(
								pipe(
									command.createStyleCommand!(`${isSuccesIn ? "success" : "error"}-in_success-out`, { value, boxIndex: isSuccesIn ? 0 : 1}),
									withStepId(getStepId()),
									withDescription(`.then(): to success`),
								)
							);
							nextStepId();
							return value;
						},
						(value: any) => {
							renderer.addCommand(
								pipe(
									command.createStyleCommand!(`${isSuccesIn ? "success" : "error"}-in_error-out`, { value, boxIndex: isSuccesIn ? 0 : 1 }),
									withStepId(getStepId()),
									withDescription(`.then(): to error`),
								)
							);
							nextStepId();
							throw value;
						},
					);

					itemMap.set(outPromise, item);

					return outPromise;
				}
				case "finally": {

					// Create Command
					const innerBlocks: (IInnerBlock)[] = [];
					if (args && args[0]) innerBlocks.push({ title: getFunctionName(args && args[0]) || "finally", style: "disabled", fromSuccess: true, fromError: true });

					const title = `.finally()`;
					const command = pipe(
						createPromiseBlock(item, { title, style: "normal"}),
						withInnerBlocks(innerBlocks),
						withConnector(item),
						withStepId(getStepId()),
						withDescription(`.finally(): added`),
					);
					renderer.addCommand(command);

					// Handle result
					let isSuccesIn = true;
					getUntrackedPromise(assert(item.parentPromise)).then(
						() => {
							if (args && args[0]) {
								renderer.addCommand(
									pipe(
										command.createStyleCommand!("success-in", { boxIndex: 0 }),
										withStepId(getStepId()),
										withDescription(`.finally(): from success`),
									)
								)
							}
						},
						() => {
							if (args && args[1]) {
								renderer.addCommand(
									pipe(
										command.createStyleCommand!("error-in", { boxIndex: 0 }),
										withStepId(getStepId()),
										withDescription(`.finally(): from error`),
									)
								);
							}
							isSuccesIn = false;
						}
					);

					outPromise = getUntrackedPromise(item.promise).then(
						(value: any) => {
							renderer.addCommand(
								pipe(
									command.createStyleCommand!(`${isSuccesIn ? "success" : "error"}-in_success-out`, { value, boxIndex: 0 }),
									withStepId(getStepId()),
									withDescription(`.finally(): to success`),
								)
							);
							nextStepId();
							return value;
						},
						(value: any) => {
							renderer.addCommand(
								pipe(
									command.createStyleCommand!(`${isSuccesIn ? "success" : "error"}-in_error-out`, { value, boxIndex: 0 }),
									withStepId(getStepId()),
									withDescription(`.finally(): to error`),
								)
							);
							nextStepId();
							throw value;
						},
					);

					itemMap.set(outPromise, item);

					return outPromise;
				}
			}

			return outPromise;

		},

		statics(functionName, promise, args) {


			const item: IPromiseItem = {
				type: functionName,
				id: getOid(),
				isStatic: true,
				promise,
				args,
			};

			switch (functionName) {
				case "resolve": {

					// Create Command
					const value = getBoxTitle(args ? args[0] : undefined);
					const title = `Promise.resolve()`;
					const command = pipe(
						createPromiseBlock(item, { title }),
						withInnerBlocks([{ title: value, style: "busy", tooltip: ""}]),
						withConnector(item),
						withStepId(getStepId()),
						withDescription(`Promise.resolve(): added`),
					);
					renderer.addCommand(command);


					// Handle result
					promise = getUntrackedPromise(promise).then(
						(value: any) => {
							nextStepId();
							renderer.addCommand(
								pipe(
									command.createStyleCommand!("success", { value, boxIndex: -1 }),
									withStepId(getStepId()),
									withDescription(`Promise.resolve(): succeeded`),
								)
							);
							nextStepId();
							return value;
						},
						(value: any) => {
							nextStepId();
							renderer.addCommand(
								pipe(
									command.createStyleCommand!("error", { value, boxIndex: -1 }),
									withStepId(getStepId()),
									withDescription(`Promise.resolve(): failed`),
								)
							);
							nextStepId();
							throw value;
						},
					);

					itemMap.set(promise, item);

					return promise;

				}
				case "reject": {

					const value = getBoxTitle(args ? args[0] : undefined);
					const title = `Promise.reject()`;
					const command = pipe(
						createPromiseBlock(item, { title }),
						withInnerBlocks([{ title: value, style: "busy", tooltip: ""}]),
						withConnector(item),
						withStepId(getStepId()),
						withDescription(`Promise.reject(): added`),
					);
					renderer.addCommand(command);

					// Handle result
					promise = getUntrackedPromise(item.promise).then(
						(value: any) => {
							nextStepId();
							renderer.addCommand(
								pipe(
									command.createStyleCommand!("success", { value, boxIndex: -1 }),
									withStepId(getStepId()),
									withDescription(`Promise.reject(): succeeded`),
								)
							);
							nextStepId();
							return value;
						},
						(value: any) => {
							nextStepId();
							renderer.addCommand(
								pipe(
									command.createStyleCommand!("error", { value, boxIndex: -1 }),
									withStepId(getStepId()),
									withDescription(`Promise.reject(): failed`),
								)
							);
							nextStepId();
							throw value;
						},
					);

					itemMap.set(promise, item);

					return promise;
				}
				case "all": {
					const promiseArgs = args && args[0] ? args[0].filter(isPromise) as Promise<any>[] : [];
					const title = `Promise.all([])`;
					const command = pipe(
						createPromiseBlock(item, { title }),
						withInnerBlocks(promiseArgs.map(() => ({
							title: "promise",
							style: "busy",
							tooltip: "",
						}))),
						withConnector(item),
						withStepId(getStepId()),
						withDescription(`Promise.all(): added`),
					);
					renderer.addCommand(command);

					// Handle result
					let resultCount = 0;
					let hasError = false;
					promiseArgs.forEach((promise, index) => {

						getUntrackedPromise(promise).then(
							() => {
								resultCount++;
								if (hasError || resultCount !== promiseArgs.length) {
									renderer.addCommand(
										pipe(
											command.createStyleCommand!("success", {
												boxIndex: index,
												dontShowOutput: true
											}),
											withStepId(getStepId()),
											withDescription(`Promise.all(): promise ${index + 1}/${promiseArgs.length} succeeded`),
										)
									);
								}
							},
							(value: any) => {
								renderer.addCommand(
									pipe(
										command.createStyleCommand!("error", {
											boxIndex: index,
											dontShowOutput: hasError,
											value,
										}),
										withStepId(getStepId()),
										withDescription(`Promise.all(): promise ${index + 1}/${promiseArgs.length} failed`),
									)
								);
								hasError = true;
							}
						);
					});

					promise = getUntrackedPromise(item.promise).then((value: any) => {
						renderer.addCommand(
							pipe(
								command.createStyleCommand!("success", {
									boxIndex: -1,
									value,
								}),
								withStepId(getStepId()),
								withDescription(`Promise.all(): all succeeded`),
							)
						);
						nextStepId();
						return value;
					});

					itemMap.set(promise, item);

					return promise;
				}

				case "race": {
					const promiseArgs = args && args[0] ? args[0].filter(isPromise) as Promise<any>[] : [];
					const title = `Promise.race([])`;
					const command = pipe(
						createPromiseBlock(item, { title }),
						withInnerBlocks(promiseArgs.map(() => ({
							title: "promise",
							style: "busy",
							tooltip: "",
						}))),
						withConnector(item),
						withStepId(getStepId()),
						withDescription(`Promise.race(): added`),
					);
					renderer.addCommand(command);

					// Handle result
					let hasResult = false;
					let successBoxIndex = -1;
					promiseArgs.forEach((promise, index) => {

						getUntrackedPromise(promise).then(
							() => {
								if (hasResult) {
									renderer.addCommand(
										pipe(
											command.createStyleCommand!("success", { boxIndex: index, dontShowOutput: hasResult }),
											withStepId(getStepId()),
											withDescription(`Promise.race(): promise ${index + 1}/${promiseArgs.length} succeeded`),
										)
									);
								} else {
									successBoxIndex = index;
									hasResult = true;
								}
							},
							() => {
								renderer.addCommand(
									pipe(
										command.createStyleCommand!("error", { boxIndex: index, dontShowOutput: hasResult }),
										withStepId(getStepId()),
										withDescription(`Promise.race(): promise ${index + 1}/${promiseArgs.length} failed`),
									)
								);
								hasResult = true;
							},
						);
					});

					promise = getUntrackedPromise(item.promise).then(
						(value: any) => {
							renderer.addCommand(
								pipe(
									command.createStyleCommand!("success", { value, boxIndex: successBoxIndex}),
									withStepId(getStepId()),
									withDescription(`Promise.race(): succeeded with promise ${successBoxIndex + 1}/${promiseArgs.length}`),
								)
							);
							nextStepId();
							return value;

						},
						(value: any) => {
							renderer.addCommand(
								pipe(
									command.createStyleCommand!("error", { value }),
									withStepId(getStepId()),
									withDescription(`Promise.race(): failed`),
								)
							);
							nextStepId();
							throw value;
						},
					);

					itemMap.set(promise, item);

					return promise;
				}

				default:
					console.error(`Unknown static item to render: ${item.type}`);
					return promise;

			}

		},
	});
}

