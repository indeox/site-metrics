module.exports = {
	bbcServices: [
		"news",
		"hindi",
		"arabic"
		/*"persian",
		"russian",
		"portuguese",
		"mundo",
		"vietnamese",
		"hausa",
		"gahuza",
		"turkce",
		"azeri"*/
	],

	screenSizes: [
		"320x480",
		"768x576",
		"1008x768"
	],

	assetGroups: {
		frameworks: "/frameworks/"
	},

	externalSites: [
		"http://mobile.nytimes.com/",
		"http://www.theguardian.com/uk?view=mobile"
	],

	// Sandbox requests run sequentially (ie: slower!),
	// to attempt to avoid hitting the ContentAPI limits
	sandbox: [
		//"http://pal.sandbox.dev.bbc.co.uk/hindi?speed=high&lazyload=false",
		//"http://pal.sandbox.dev.bbc.co.uk/hindi?speed=slow&lazyload=true",
		//"http://pal.sandbox.dev.bbc.co.uk/hindi?speed=high&lazyload=true"
	]
};