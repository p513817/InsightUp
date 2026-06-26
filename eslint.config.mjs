import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const config = [
	...compat.extends("next/core-web-vitals"),
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
