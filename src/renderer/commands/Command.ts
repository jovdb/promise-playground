
declare global {

	interface IRenderCommand {

		/** Used for canReplacePrevious: group same types */
		name: string;

		id: string;
		parentId?: string;

		/** Can we skip previous (example: setColorTo("blue") can override setColorTo('red') */
		canReplacePrevious?: boolean;

		/** Add or update DOM elements */
		updateDom?(itemHtmlEl: HTMLElement, itemSvgEl: SVGElement, parentCommand: IRenderCommand | undefined, siblingCommands: IRenderCommand[]): void;

		/**
		 * If updateDom is available, this function will be called
		 * This function must measure Size and Position of DOM items and
		 * return a function that updates the SVG (which will be batched)
		 * Normally always needed because SVG is added on a position
		 */
		updateLayout(offsetBox: ClientRect): undefined | (() => void);

		updateSvg?(itemSvgEl: SVGElement): void;

		/** Adjust the style of this item */
		createStyleCommand?(styleName: string, payload?: any): IRenderCommand;

		stepId?: number;

		description?: string;

	}


	interface IBroadcastMap {
		"RenderCommandAdded": IMessage<"RenderCommandAdded", IRenderCommand>;
		"RenderCommandsCleared": IMessage<"RenderCommandsCleared">;
	}
}

export const commands: IRenderCommand[] = [];
(window as any).commands = commands;

export function createCommandManager(broadcaster: IBroadcaster) {

	const maxItems = 200; // TODO: get from querystring
	let isMaxReachedWarningShown = false;
	let isDisposed = false;

	return {

		commands: commands as ReadonlyArray<IRenderCommand>,

		add(command: IRenderCommand) {

			if (isDisposed) return;

			// Safety Check
			if (commands.length >= maxItems) {
				if (!isMaxReachedWarningShown) {
					alert(`Maximum of ${maxItems} commands is reached.`);
					isMaxReachedWarningShown = true;
				}
				return;
			}

			// console.log(`Command Added: ${command.name}, ID: ${command.id}, PID: ${command.parentId}`);
			commands.push(command);

			// Notify
			broadcaster.emit({
				name: "RenderCommandAdded",
				payload: command,
			});
		},

		clear() {

			if (isDisposed) return;

			commands.splice(0);

			broadcaster.emit({
				name: "RenderCommandsCleared",
				payload: undefined,
			});

			isMaxReachedWarningShown = false;
		},

		dispose() {
			isDisposed = true;
			commands.splice(0);
		},

	}
}
