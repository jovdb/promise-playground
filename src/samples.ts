
export interface ISample {
	name: string;
	code: string;
};

const samples: ISample[] = [
	{
		name: "",
		code: "",
	},
	{
		name: "new Promise",
		code: `// Resolve promise in 2s
new Promise((resolve) => {
	setTimeout(resolve, 2000, 42);
});`,
	},
	{
		name: "Promise.resolve",
		code: `Promise.resolve(42)
  .then(x => x * 2);`,
	},
	{
		name: "Promise.reject",
		code: `Promise.reject(new Error("Doh!"))
	.then(x => x * 2);`,
	},
	{
		name: "catch",
		code: `Promise.reject(new Error("Doh!"))
	.then(x => x * 2)
	.catch(err => 0);`,
	},
	{
		name: "Promise.finally",
		code: `let isCalculating = true;

Promise.resolve(42)
	.then(x => x * 2)
	.finally(() => {
		isCalculating = false;
	});`,
	},

	{
		name: "tree",
		code: `// Resolve promise in 2s
const p = new Promise((resolve) => {
  setTimeout(resolve, 2000, 42);
});

p.then(x => x * 2);
p.then(x => x + 1);`,
	},
/*
	{
		name: "test",
		code: `const delay = (result, delayInMs = 2000) => new Promise(function delay (resolve) {
			setTimeout(resolve, delayInMs, result);
});

Promise.resolve(42)
  .then(x => delay(x * 2))
  .then(x => delay(x), err => "jo")
  .catch(err => delay(err, 3000))
  .then(() => delay().then(() => Promise.reject("Err")))
  .catch(err => delay().then(() => Promise.reject("Err")))
  .then(x => delay(x))
  .then(x => delay(x), err => delay(err))`,
	},*/
	{
		name: "Promise.race",
		code: `function delay(result, delayInMs = 2000) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayInMs, result);
	});
}

const p1 = delay(20, 1000 + Math.random() * 3000);
const p2 = delay(20, 1000 + Math.random() * 3000);
const p3 = delay(2, 1000 + Math.random() * 3000);
Promise.race([p1, p2, p3])
  .then((firstResult) => firstResult * 2);`,
	},
	{
		name: "Promise.all",
		code: `function delay(result, delayInMs = 2000) {
	return new Promise((resolve) => {
		setTimeout(resolve, delayInMs, result);
	});
}

const p1 = delay(20, 1000 + Math.random() * 3000);
const p2 = delay(20, 1000 + Math.random() * 3000);
const p3 = delay(2, 1000 + Math.random() * 3000);
Promise.all([p1, p2, p3])
  .then(([a, b, c]) => a + b + c);`,
	},

	{
		name: "Get GitHub name",
		code: `// Get GitHub name
fetch("https://api.github.com/users/jovdb")
  .then(response => response.json())
  .then(userInfo => userInfo.name);`,
	},

	{
		name: "Get GitHub repos",
		code: `// Get none forked repos of a user
fetch("https://api.github.com/users/jovdb")
  .then(response => response.json())
	.then(userInfo => fetch(userInfo.repos_url))
	.then(response => response.json())
	.then(repos => repos
		.filter(repo => !repo.fork)
		.map(repo => repo.name)
	);`,
	},

	{
		name: "Get size of GitHub image",
		code: `// Get GitHub user info
function getGitHubUserInfo(userName) {

  // Unauthenticated requests are limited to 60/hour and cause HTTP 403: API rate limit exceeded
  return fetch("https://api.github.com/users/" + userName)
    .then(response => response.status === 200
        ? response.json()
        : response.json().then(errorInfo => { throw new Error("HTTP " + response.status + ": " + errorInfo.message); })
    )
}

function loadPhoto(url) {
  return new Promise(function loadingPhoto(resolve, reject) {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Error loading image"));
    image.onabort = () => reject(new Error("Loading image aborted"));
    image.src = url;
  });
}

getGitHubUserInfo("jovdb")                 // Get User info
	.then(userInfo => userInfo.avatar_url)   // Get the URL of the first photo
	.then(loadPhoto)                         // Load the Photo
  .then(image => ({                        // Return the Dimensions
    width: image.width,
    height: image.height,
	})
);`,
	},
]

export function addSamples({
	onChange,
	headerEl,
	loadDefaultSample = false,
}: {
	onChange(sample: ISample): void;
	headerEl: HTMLElement;
	loadDefaultSample?: boolean;
}) {

	function addHtml() {
		headerEl.insertAdjacentHTML(
			"beforeend",
			`<style>
				.sample__title {
					font-size: 120%;
					color: white;
				}
			</style>
			<span class="sample__title">Samples:</span> <select id="samples"></select>`
		);
		return headerEl.querySelector("#samples") as HTMLSelectElement;
	}

	const samplesEl = addHtml();

	// Add handler
	samplesEl.addEventListener("change", e => {
		const sampleIndex = parseInt(e && e.target && (e.target as any).value, 10) || 0;
		if (onChange) onChange(samples[sampleIndex]);
	});

	// Initial Fill
	samples.forEach((sample, idx) => {
		const optionEl = document.createElement("option");
		optionEl.value = idx.toString();
		optionEl.textContent = sample.name;
		samplesEl.options.add(optionEl);
	});

	// Load the first
	if (loadDefaultSample && onChange) {
		samplesEl.selectedIndex = 1;
		onChange(samples[1]);
	}
}