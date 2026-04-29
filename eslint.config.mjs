import nextConfig from 'eslint-config-next'

const config = [
	...nextConfig,
	{
		ignores: [
			"node_modules/**",
			".next/**",
			"coverage/**",
			"legacy/**",
			"supabase/**",
			"app.js",
			"index.html",
			"login.html",
			"profile.html",
			"style.css",
			"src/**",
		],
	},
];

export default config;