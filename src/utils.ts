export type OneArgFn<TIn, TOut> = (x: TIn) => TOut;

export function pipe<TIn, TOut, T1, T2, T3>(start: TIn, fn1: OneArgFn<TIn, T1>, fn2: OneArgFn<T1, T2>, fn3: OneArgFn<T2, T3>, fn4: OneArgFn<T3, TOut>): TOut;
export function pipe<TIn, TOut, T1, T2>(start: TIn, fn1: OneArgFn<TIn, T1>, fn2: OneArgFn<T1, T2>, fn3: OneArgFn<T2, TOut>): TOut;
export function pipe<TIn, TOut, T1>(start: TIn, fn1: OneArgFn<TIn, T1>, fn2: OneArgFn<T1, TOut>): TOut;
export function pipe<TIn, TOut>(start: TIn, fn1: OneArgFn<TIn, TOut>): TOut;
export function pipe<TIn>(start: TIn): TIn;
export function pipe<TIn>(start: TIn, ...fns: Function[]) {
	// For better type inference, I included the start value as argument
	return fns.reduce((prevResult, fn) => fn(prevResult), start);
}


export function isDefined(o: undefined, errorMessage?: string): never;
export function isDefined<T>(o: T | undefined): o is T;
export function isDefined<T>(o: T | undefined, errorMessage?: string): o is T {
	if (o === undefined) throw new Error(errorMessage || "Value must be defined.");
	return true;
}

export function assert(o: undefined, errorMessage?: string): never;
export function assert<T>(o: T | null | undefined): T;
export function assert<T>(o: T | null | undefined, errorMessage?: string): T {
	if (o === null || o === undefined) throw new Error(errorMessage || "Value cannot be null or undefined.");
	return o;
}

/** Throttle the function */
export function useThrottling(throttleInMs = 200) {
	return function addThrottling<TFn extends Function>(fn: TFn): TFn {
		let timeoutId: any;
		return function withThrottling(...args: any[]) {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(function throttled() {
				timeoutId = undefined;
				fn(...args);
			}, throttleInMs) ;
		} as any;
	}
}
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

/** Execute max 1 per RAF */
export function useRafThrottle() {
	// TODO: flatten Promise
	return function executeAtNextRaf<TFn extends (...args: any[]) => any>(fn: TFn): (...args: ArgumentTypes<TFn>) => Promise<ReturnType<TFn>> {
		let promise: Promise<ReturnType<TFn>> | undefined;
		return function atNextRaf(...args: any[]) {

			// Don't start execute again, return pending RAF promise
			if (promise) return promise;

			return promise = new Promise(function RafPromise(resolve) {
				requestAnimationFrame(() => {
					promise = undefined;
					resolve(fn(...args));
				});
			});
		} as any;
	};
}

export function addEventListener<K extends keyof GlobalEventHandlersEventMap>(el: Element, type: K, listener: (this: Element, ev: GlobalEventHandlersEventMap[K]) => any, options?: boolean | AddEventListenerOptions): () => void;
export function addEventListener<K extends keyof ElementEventMap>(el: Element, type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): () => void;
export function addEventListener(el: Element, type: string, listener: any, options: any)  {
	el.addEventListener(type, listener, options);
	return () => {
		el.removeEventListener(type, listener, options);
	}
}