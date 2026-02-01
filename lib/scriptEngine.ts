type TokenType = "WORD" | "NUMBER" | "SYMBOL";

interface Token {
  type: TokenType;
  value: string;
}

interface ScriptResult {
  success: boolean;
  error?: string;
  line?: number;
}

const tokenize = (line: string): Token[] => {
  line = line.replace(/!=/g, "__NEQ__").replace(/==/g, "__EQ__");

  return line
    .split(/([(),={}\[\]+\-*/!><%]+|\s+)/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(value => {
      if (value === "__NEQ__") value = "!=";
      if (value === "__EQ__") value = "==";
      if (/^[(),={}\[\]+\-*/!><%]+$/.test(value)) return { type: "SYMBOL", value };
      if (!isNaN(Number(value))) return { type: "NUMBER", value };
      return { type: "WORD", value };
    });
};

let customFunctions: Record<string, { params: string[]; body: string[] }> = {};

const evaluateExpression = (
  tokens: string[],
  variables: Record<string, number>
): number | boolean => {
  // On remplace les variables par leurs valeurs
  // Si une variable n'existe pas, on laisse le token tel quel
  let processed = tokens
    .map(t => (variables.hasOwnProperty(t) ? variables[t].toString() : t))
    .join(" ");

  try {
    // On laisse JavaScript gérer les signes moins unaires (-5, -a) 
    // "use strict" est conservé pour la sécurité
    const result = new Function(`"use strict"; return (${processed})`)();

    if (typeof result === "number") {
      if (!Number.isInteger(result)) throw new Error("decimal");
      return result;
    }
    return !!result;
  } catch (e: any) {
    return NaN;
  }
};

export const executeScript = async (
  fullScript: string,
  api: any,
  externalVariables: Record<string, number> = {}
): Promise<ScriptResult> => {
  const lines = fullScript.split("\n");
  const variables: Record<string, number> = externalVariables;
  let i = 0;

  try {
    while (i < lines.length) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("//")) {
        i++;
        continue;
      }

      const tokens = tokenize(raw);
      if (!tokens.length) {
        i++;
        continue;
      }

      const first = tokens[0].value;

      if (first === "function") {
        const name = tokens[1].value;
        const params: string[] = [];
        const pStart = tokens.findIndex(t => t.value === "(");
        const pEnd = tokens.findIndex(t => t.value === ")");

        for (let j = pStart + 1; j < pEnd; j++) {
          if (tokens[j].type === "WORD") params.push(tokens[j].value);
        }

        const body: string[] = [];
        let depth = 0;
        let started = false;

        while (i < lines.length) {
          const line = lines[i];
          if (line.includes("{")) {
            depth += (line.match(/{/g) || []).length;
            started = true;
          }
          if (started && !line.includes("function " + name)) body.push(line);
          if (line.includes("}")) {
            depth -= (line.match(/}/g) || []).length;
            if (started && depth <= 0) {
              body[body.length - 1] = body[body.length - 1].replace(/\}[\s\}]*$/, "");
              break;
            }
          }
          i++;
        }

        customFunctions[name] = { params, body };
        i++;
        continue;
      }

      if (first === "if" || first === "repeat") {
        const open = tokens.findIndex(t => t.value === "{");
        const expr = tokens
          .slice(1, open)
          .map(t => t.value)
          .filter(v => v !== "(" && v !== ")");

        const value = evaluateExpression(expr, variables);

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

      const eq = tokens.findIndex(t => t.value === "=");
      if (eq !== -1) {
        const name = tokens[eq - 1].value;
        const expr = tokens.slice(eq + 1).map(t => t.value);
        variables[name] = evaluateExpression(expr, variables) as number;
        i++;
        continue;
      }

      const open = tokens.findIndex(t => t.value === "(");
      if (open !== -1) {
        const name = tokens[0].value;
        const close = tokens.findLastIndex(t => t.value === ")");
        const parts = tokens.slice(open + 1, close);

        const args: number[] = [];
        let current: string[] = [];

        for (const t of parts) {
          if (t.value === ",") {
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
          const locals: Record<string, number> = {};
          fn.params.forEach((p, idx) => (locals[p] = args[idx] ?? 0));
          const r = await executeScript(fn.body.join("\n"), api, { ...variables, ...locals });
          if (!r.success) return r;
        } else {
          throw new Error(name);
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

/*vx = 2
vy = 3
posX = 0
posY = 0

function nadal(a, b) {
  moveX(a)
  moveY(b)
  moveX( - a) 
  moveY( - b)
}

repeat(5) {
  moveX(posX)
  moveY(posY)
  nadal(vx, vy)
  
}*/