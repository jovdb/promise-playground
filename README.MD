
# Promise Playground
For an internal training, I created a Promise Playground to visualize what is going on.
Feel free to [play with it](docs/).

## Details
It will only track `Promise` and `fetch` that you write in the code editor, not the `Promise` and `fetch` from the global scope: so you cannot use `window.fetch` or `window.Promise`.
This prevents tracking of other promises from background processes or plugins that also use the fetch/Promise.