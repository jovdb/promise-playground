
export function addToRenderer(_renderer: IRenderer) {

	const oriFetch = window.fetch;

	// @ts-ignore
	function createNewFetch(trackPromise: (promise: Promise<any>, functionName: string, args: any[]) => void)  {
		return function newFetch(...args: any[]) {
			const promise = (oriFetch as any)(...args);
			return trackPromise(promise, "fetch", args);
		};
	}

	// Return a function to start watching
	return (executer: Executer): Executer => {
		return (locals: any) => {

			const trackPromise = locals.trackPromise;

			// @ts-ignore
			locals.fetch = createNewFetch(trackPromise);

			return executer(locals);

		};
	};
}