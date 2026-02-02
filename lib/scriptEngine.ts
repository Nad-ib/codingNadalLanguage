type ExecutionResult = {
	success: boolean;
	error?: string;
	line?: number;
};

let customFunctions: Record<string, { params: string[]; body: string[] }> = {};

const evaluateExpression = (
	tokens: string[],
	variables: Record<string, number>,
): number | boolean => {
	const processed = tokens
		.map((t) => {
			if (variables.hasOwnProperty(t)) return variables[t].toString();
			if (
				/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t) &&
				!["true", "false"].includes(t)
			) {
				if (!/^(==|!=|>=|<=|>|<|&&|\|\|)$/.test(t)) {
					throw new Error(`La variable '${t}' n'est pas définie.`);
				}
			}
			return t;
		})
		.join("");

	try {
		const result = new Function(`"use strict"; return (${processed})`)();
		if (typeof result === "number") {
			if (isNaN(result))
				throw new Error("Résultat mathématique invalide (NaN).");
			if (!Number.isInteger(result))
				throw new Error("Les nombres décimaux ne sont pas autorisés.");
			return result;
		}
		return !!result;
	} catch (e: any) {
		throw new Error(`Expression invalide '${processed}' : ${e.message}`);
	}
};

export const executeScript = async (
	code: string,
	api: Record<string, any>,
	externalVariables: Record<string, number> = {},
): Promise<ExecutionResult> => {
	const lines = code.split("\n");
	const variables = { ...externalVariables };
	let i = 0;

	try {
		while (i < lines.length) {
			const raw = lines[i].trim();
			if (!raw || raw.startsWith("//")) {
				i++;
				continue;
			}

			const tokens = raw
				.replace(/(==|!=|>=|<=|&&|\|\|)/g, " $1 ")
				.replace(/([(),={}\[\]+\-*/!><%])(?![=><&|])/g, " $1 ")
				.split(/\s+/)
				.filter((t) => t.length > 0);

			if (!tokens.length) {
				i++;
				continue;
			}

			const first = tokens[0];

			if (first === "function") {
				const name = tokens[1];
				if (!name) throw new Error("Nom de fonction manquant.");
				const pStart = tokens.indexOf("(");
				const pEnd = tokens.indexOf(")");
				const params = tokens
					.slice(pStart + 1, pEnd)
					.filter((t) => !/^[(),]$/.test(t));
				const body: string[] = [];
				let depth = 0;
				let started = false;

				while (i < lines.length) {
					const line = lines[i];
					if (line.includes("{")) {
						depth += (line.match(/{/g) || []).length;
						started = true;
					}
					if (line.includes("}")) {
						depth -= (line.match(/}/g) || []).length;
					}
					if (started && !line.includes("function " + name)) {
						if (depth > 0) body.push(line);
					}
					if (started && depth === 0) break;
					i++;
				}
				customFunctions[name] = { params, body };
				i++;
				continue;
			}

			if (first === "if" || first === "repeat") {
				const openIdx = tokens.indexOf("{");
				if (openIdx === -1) throw new Error(`Bloc '${first}' : '{' manquant.`);
				const exprTokens = tokens
					.slice(1, openIdx)
					.filter((v) => v !== "(" && v !== ")");
				const value = evaluateExpression(exprTokens, variables);
				const body: string[] = [];
				i++;
				let depth = 1;
				while (i < lines.length && depth > 0) {
					if (lines[i].includes("{"))
						depth += (lines[i].match(/{/g) || []).length;
					if (lines[i].includes("}"))
						depth -= (lines[i].match(/}/g) || []).length;
					if (depth > 0) body.push(lines[i]);
					i++;
				}
				if (first === "repeat") {
					for (let n = 0; n < (value as number); n++) {
						const r = await executeScript(body.join("\n"), api, variables);
						if (!r.success) return r;
					}
				} else if (value) {
					const r = await executeScript(body.join("\n"), api, variables);
					if (!r.success) return r;
				}
				continue;
			}

			if (tokens[1] === "=") {
				const varName = tokens[0];
				const expr = tokens.slice(2);
				variables[varName] = evaluateExpression(expr, variables) as number;
				i++;
				continue;
			}

			const open = tokens.indexOf("(");
			if (open !== -1) {
				const name = tokens[0];
				const close = tokens.lastIndexOf(")");
				const parts = tokens.slice(open + 1, close);
				const args: number[] = [];
				let current: string[] = [];
				for (const t of parts) {
					if (t === ",") {
						args.push(evaluateExpression(current, variables) as number);
						current = [];
					} else current.push(t);
				}
				if (current.length)
					args.push(evaluateExpression(current, variables) as number);

				if (typeof api[name] === "function") {
					await api[name](...args);
				} else if (customFunctions[name]) {
					const fn = customFunctions[name];
					const locals: Record<string, number> = {};
					fn.params.forEach((p, idx) => (locals[p] = args[idx]));
					const r = await executeScript(fn.body.join("\n"), api, {
						...variables,
						...locals,
					});
					if (!r.success) return r;
				} else throw new Error(`Commande inconnue : '${name}'.`);
				i++;
				continue;
			}
			i++;
		}
		return { success: true };
	} catch (e: any) {
		return { success: false, error: e.message, line: i + 1 };
	}
};
