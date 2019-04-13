import { createEventEmitter } from "./eventEmitter";

declare global {

	interface IBroadcaster extends ReturnType<typeof createBroadcaster> {}

	interface IMessage<TName extends string = string, TPayload extends any = undefined> {
		name: TName;
		payload: TPayload;
	}

	/**  Extend this interface */
	interface IBroadcastMap {
	}

	type IAnyMessage = IBroadcastMap[keyof IBroadcastMap];


}

export function createBroadcaster() {

	const broadcaster = createEventEmitter<IAnyMessage>();

	return {
		...broadcaster,

		/** Subscribe to a single message */
		subscribeToMessage<TName extends keyof IBroadcastMap>(messageName: TName, handler: IEventHandler<IBroadcastMap[TName]["payload"]>) {
			return broadcaster.subscribe(message =>
				messageName === message.name
					? handler(message.payload)
					: false

			);
		}
	};
}