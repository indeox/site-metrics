module.exports = {
	bbcServices: [
		"news",
		"hindi",
		/*"arabic",
		"russian",
		"persian",
		"portuguese",
		"mundo",
		"vietnamese",
		"hausa",
		"gahuza",
		"turkce",
		"azeri"*/
	],

	screenSizes: [
		"320x240",
		"768x560",
		"1008x768"
	],

	assetGroups: {
		frameworks: "/frameworks/"
	},

	externalSites: [
		"http://www.theguardian.com/uk?view=mobile"
	],

	sandbox: [
		"http://pal.sandbox.dev.bbc.co.uk/hindi?speed=high&lazyload=false",
		"http://pal.sandbox.dev.bbc.co.uk/hindi?speed=slow&lazyload=false",
		"http://pal.sandbox.dev.bbc.co.uk/hindi?speed=high&lazyload=true",
		"http://pal.sandbox.dev.bbc.co.uk/hindi?speed=slow&lazyload=true"
		"http://pal.sandbox.dev.bbc.co.uk/hindi?speed=high&lazyload=true&noupscale=1"
		//"http://www.bbc.co.uk/news"
	]
};