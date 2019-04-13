
declare global {
	interface IPromiseMonitorHandlers {

		/** A fucntion that returns a Promise */
		result?(functionName: string, outPromise: Promise<any>, args: any[]): any;

		ctor?(promise: Promise<any>, args: any[]): any;

		/** args will be undefined if it is a static variable, an array for a function */
		statics?(functionName: string, promise: Promise<any>, args?: any[]): any;

		/** args will be undefined if it is a member variable, an array for a function */
		methods?(functionName: string, promise: Promise<any>, args?: any[], parent?: Promise<any>): any;

		/** Notify than a promise is passed as an argument */
		lazyPromiseArgument?(promise: Promise<any>, argIndex: number, argPromise: Promise<any>): void;

	}
}

export const isPromise = (o: any): o is Promise<any> => {
	return !!o && !!o.then && !!o.catch;
};

export function getUntrackedPromise(promise: Promise<any>) {
	return (promise as any)["__untrackedPromise"] || promise as Promise<any>;
}
export function promiseTracker(handlers: IPromiseMonitorHandlers = {}) {

	const { ctor, result } = handlers;
	const track = (promise: Promise<any>) => new Proxy(promise, promiseHandler);

	const isFunction = (o: any): o is Function => typeof o === "function";

	const notify = (promise: Promise<any>, parent: any, propName: any, args?: any[]) => {
		if (isPromise(parent)) {
			if (handlers.methods) promise = handlers.methods(propName.toString(), promise, args, parent) || promise;
		} else {
			if (handlers.statics) promise = handlers.statics(propName.toString(), promise, args) || promise;
		}
		return promise;
	}

	function watchArguments(args: any[], onPromise: (argPromise: Promise<any>, argIndex: number ) => void) {
		return args.map((arg, argIndex) => {

			// Is arg a promise?
			if (isPromise(arg)) onPromise(arg, argIndex);

			// Is a callback ? check if result is a Promise
			if (isFunction(arg)) {
				return (...args: any) => {
					const result = arg(...args); // Binding needed?
					if (isPromise(result)) onPromise(result, argIndex);
					return result;
				}
			}

			return arg;
		});
	}

	const getPropHandler = (target: any, propName: string) => {

		// Get the property (can be a function)
		let value = target[propName];

		if (propName === "__untrackedPromise") {
			return target;
		}

		if (isPromise(value)) {
			// Promise property

			value = notify(value, target, propName, undefined);

			return track(value);
		}

		// Is this a member/static function: PromiseConstructor.resolve, Promise.then
		if (isFunction(value)) {

			// Check the function returns a promise
			return (...args: any[]) => {

				// Check Arguments have Promise as input
				if (handlers.lazyPromiseArgument) {
					args = watchArguments(args, (argPromise, argIndex) => {
						// Add a delay so we notify argument after container is created
						((window as any).PromiseHidden || (window as any).Promise).resolve(0).then(() => {
							handlers.lazyPromiseArgument!(result, argIndex, argPromise);
						})
					});
				}

				let result = value.apply(target, args);

				if (!shouldTrack()) return result;

				if (isPromise(result)) {

					result = notify(result, target, propName, args);
					return track(result);
				} else {
					return result;
				}

			};
		}

		return value;
	}


	// Handler Members
	const promiseHandler: ProxyHandler<Promise<any>> = {
		get: getPropHandler,
	}

	// Handler Constructor and statics
	const promiseConstructorHandler: ProxyHandler<PromiseConstructor> = {

		// HOOK: new Promise();
		construct(target, args) {

			let promise = new (target as any)(...args);

			if (!shouldTrack()) return promise;

			// Notify
			if (ctor) promise = ctor(promise, args) || promise;

			// Track
			return track(promise);
		},

		get: getPropHandler,
	}

	function shouldTrack() {
		const stack = new Error().stack || ""; // Very slow!

		// skip attached then's from inisde a promise (race, all)
		if (stack.split('\n').length <= 3) return false;

		// if (stack && stack.indexOf("WorkerManager.getLanguageServiceWorker") >= 0) return false;
		// if (stack && stack.indexOf("chrome-extension://") >= 0) return false;
		// if (stack && stack.indexOf("createCancelablePromise") >= 0) return false;
		return true;
	}

	const oriPromise = Promise;

	// Return a function to start watching
	return (executer: Executer): Executer => {
		return (locals: any) => {

			// @ts-ignore
			locals.Promise = new Proxy(oriPromise, promiseConstructorHandler);
			locals.trackPromise = (promise: Promise<any>, functionName: string, args: any[]) => {

				// Notify
				if (result) promise = result(functionName, promise, args) || promise;

				// Track
				return track(promise);
			};

			return executer(locals);

		};
	};

}
