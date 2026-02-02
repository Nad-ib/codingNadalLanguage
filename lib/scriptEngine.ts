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
            
            
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t) && !["true", "false"].includes(t)) {
                throw new Error(`La variable '${t}' n'est pas définie.`);
            }
            return t;
        })
        .join(" ");

    try {
        
        const result = new Function(`"use strict"; return (${processed})`)();
        
        if (typeof result === "number") {
            if (isNaN(result)) throw new Error("Résultat mathématique invalide (NaN).");
            if (!Number.isInteger(result)) throw new Error("Les nombres décimaux ne sont pas autorisés.");
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
    externalVariables: Record<string, number> = {}
): Promise<ExecutionResult> => {
    const lines = code.split("\n");
    const variables = { ...externalVariables };
    let i = 0;

    try {
        while (i < lines.length) {
            const raw = lines[i].trim();
            if (!raw || raw.startsWith("//")) { i++; continue; }

            
            const tokens = raw
                .replace(/([(),={}\[\]+\-*/!><%])/g, " $1 ")
                .split(/\s+/)
                .filter((t) => t.length > 0)
                .map((t) => ({
                    value: t,
                    type: /^[(),={}\[\]+\-*/!><%]+$/.test(t) ? "SYMBOL" : 
                          /^\d+$/.test(t) ? "NUMBER" : "WORD"
                }));

            if (!tokens.length) { i++; continue; }

            const first = tokens[0].value;

            
            if (first === "function") {
                const name = tokens[1]?.value;
                if (!name) throw new Error("Nom de fonction manquant après 'function'.");

                const pStart = tokens.findIndex((t) => t.value === "(");
                const pEnd = tokens.findIndex((t) => t.value === ")");
                if (pStart === -1 || pEnd === -1) throw new Error(`Syntaxe parenthèses '()' manquante pour la fonction '${name}'.`);

                const params = tokens.slice(pStart + 1, pEnd)
                    .filter(t => t.type === "WORD")
                    .map(t => t.value);

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
                const openIdx = tokens.findIndex((t) => t.value === "{");
                if (openIdx === -1) throw new Error(`Bloc '${first}' : Accolade '{' manquante.`);

                const exprTokens = tokens.slice(1, openIdx)
                    .map(t => t.value)
                    .filter(v => v !== "(" && v !== ")");
                
                const value = evaluateExpression(exprTokens, variables);

                const body: string[] = [];
                i++;
                let depth = 1;
                while (i < lines.length && depth > 0) {
                    if (lines[i].includes("{")) depth += (lines[i].match(/{/g) || []).length;
                    if (lines[i].includes("}")) depth -= (lines[i].match(/}/g) || []).length;
                    if (depth > 0) body.push(lines[i]);
                    i++;
                }

                if (first === "repeat") {
                    const count = value as number;
                    for (let n = 0; n < count; n++) {
                        const r = await executeScript(body.join("\n"), api, variables);
                        if (!r.success) return r;
                    }
                } else if (value) {
                    const r = await executeScript(body.join("\n"), api, variables);
                    if (!r.success) return r;
                }
                continue;
            }

            
            if (tokens[1]?.value === "=") {
                const varName = tokens[0].value;
                const expr = tokens.slice(2).map(t => t.value);
                variables[varName] = evaluateExpression(expr, variables) as number;
                i++;
                continue;
            }


            const open = tokens.findIndex((t) => t.value === "(");
            if (open !== -1) {
                const name = tokens[0].value;
                const close = tokens.findLastIndex((t) => t.value === ")");
                if (close === -1) throw new Error(`Parenthèse ')' manquante pour '${name}'.`);

                const parts = tokens.slice(open + 1, close);
                const args: number[] = [];
                let current: string[] = [];

                for (const t of parts) {
                    if (t.value === ",") {
                        if (!current.length) throw new Error(`Argument vide dans '${name}'.`);
                        args.push(evaluateExpression(current, variables) as number);
                        current = [];
                    } else {
                        current.push(t.value);
                    }
                }
                if (current.length) args.push(evaluateExpression(current, variables) as number);

                if (typeof api[name] === "function") {
                    await api[name](...args);
                } else if (customFunctions[name]) {
                    const fn = customFunctions[name];
                    if (args.length !== fn.params.length) {
                        throw new Error(`'${name}' attend ${fn.params.length} arguments (${args.length} reçus).`);
                    }
                    const locals: Record<string, number> = {};
                    fn.params.forEach((p, idx) => (locals[p] = args[idx]));
                    const r = await executeScript(fn.body.join("\n"), api, { ...variables, ...locals });
                    if (!r.success) return r;
                } else {
                    throw new Error(`Commande inconnue : '${name}'.`);
                }
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