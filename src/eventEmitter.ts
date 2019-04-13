declare global {

	export interface IEventHandler<TPayload = undefined> {
		/** Return truthy value to unsubscribe */
		(payload: TPayload): any;
	}

	export interface ISubscribableEventEmitter<TPayload = undefined> {
		subscribe(handler: IEventHandler<TPayload>): () => void;
	}

	export interface IEventEmitter<TPayload = undefined> extends ISubscribableEventEmitter<TPayload> {
		emit(payload: TPayload): void;
	}
}

export function createEventEmitter<TPayload = undefined>() {

	let handlerId = 0;
	const handlers: { [id: number]: IEventHandler<TPayload>} = {};

	return {
		subscribe(handler: IEventHandler<TPayload>) {
			const subscriptionId = ++handlerId;
			handlers[subscriptionId] = handler;
			return () => {
				delete handlers[subscriptionId];
			}
		},

		emit(payload: TPayload) {
			Object.keys(handlers).forEach(key => {

				// Unsubscribe if truthy result
				if (handlers[key as unknown as number](payload)) {
					delete handlers[key as unknown as number];
				}
			})
		}
	}
}