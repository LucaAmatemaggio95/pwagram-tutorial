module.exports = {
	globDirectory: 'public/',
	globPatterns: [
		'**/*.{html,ico,json,css}',
		'src/images/*.{png,jpg}',
		'src/js/*.min.js'
	],
	globIgnores: [
		'help/**',
		'404.html'
	],
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	swSrc: 'public/sw-base.js',
	swDest: 'public/service-worker.js'
};