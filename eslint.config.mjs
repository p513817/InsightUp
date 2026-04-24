import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
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
	...nextVitals,
];

export default config;