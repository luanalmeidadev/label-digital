import { execFileSync } from "node:child_process";

export function getLocalSupabaseEnvironment() {
  const isWindows = process.platform === "win32";
  const commandShell = process.env.ComSpec ?? "cmd.exe";
  const statusCommand = isWindows ? commandShell : "npx";
  const statusArguments = isWindows
    ? ["/d", "/s", "/c", "npx.cmd supabase status -o env"]
    : ["supabase", "status", "-o", "env"];
  const statusOutput = execFileSync(statusCommand, statusArguments, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

  function readLocalVariable(name) {
    const match = statusOutput.match(
      new RegExp(`^${name}="([^"]+)"$`, "m")
    );

    if (!match) {
      throw new Error(
        `O Supabase local não informou a variável ${name}. Execute supabase start antes do teste.`
      );
    }

    return match[1];
  }

  const apiUrl = readLocalVariable("API_URL");
  const serviceRoleKey = readLocalVariable("SERVICE_ROLE_KEY");
  const anonKey = readLocalVariable("ANON_KEY");
  const parsedUrl = new URL(apiUrl);

  if (!["127.0.0.1", "localhost"].includes(parsedUrl.hostname)) {
    throw new Error(
      `A operação foi bloqueada porque a URL não é local: ${parsedUrl.origin}`
    );
  }

  return {
    apiUrl,
    serviceRoleKey,
    anonKey,
  };
}
