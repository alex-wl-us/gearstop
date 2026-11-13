import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const chrome = process.env.CHROME_PATH || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/chromium", "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find(existsSync);

let report = { ok: false, error: "Chrome/Chromium not found" };
let profile, browser, socket, closeBrowser;
try {
  if (chrome && existsSync(chrome)) {
    profile = await mkdtemp(join(tmpdir(), "laas-page-probe-"));
    browser = spawn(chrome, [
      "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
      "--no-first-run", "--no-default-browser-check", "about:blank",
    ], { windowsHide: true, stdio: "ignore" });
    browser.on("error", () => {});
    let port;
    for (let i = 0; i < 50 && !port; i++) {
      try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); }
      catch { await delay(100); }
    }
    if (!port) throw new Error("Chrome did not start");
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let nextId = 0, apiFailed = false;
    const pending = new Map(), requests = new Map();
    const apiRequests = [], failedRequests = [], consoleErrors = [], exceptions = [];
    const pathOf = url => { try { return new URL(url).pathname; } catch { return ""; } };
    socket.onmessage = ({ data }) => {
      const event = JSON.parse(data), params = event.params || {}, pendingCall = pending.get(event.id);
      if (pendingCall) {
        pending.delete(event.id);
        event.error ? pendingCall.reject(new Error(event.error.message)) : pendingCall.resolve(event.result);
      }
      if (event.method === "Network.requestWillBeSent") {
        requests.set(params.requestId, { method: params.request.method, path: pathOf(params.request.url) });
      } else if (event.method === "Network.responseReceived") {
        const request = requests.get(params.requestId);
        if (request?.path.startsWith("/api/")) {
          if (params.response.status >= 400) apiFailed = true;
          if (apiRequests.length < 30) apiRequests.push({ ...request, status: params.response.status });
        }
      } else if (event.method === "Network.loadingFailed") {
        const request = requests.get(params.requestId);
        if (request && failedRequests.length < 30) failedRequests.push({ path: request.path, error: String(params.errorText).slice(0, 300) });
      } else if (event.method === "Runtime.exceptionThrown" && exceptions.length < 10) {
        exceptions.push(String(params.exceptionDetails.exception?.description || params.exceptionDetails.text).slice(0, 300));
      } else if (event.method === "Runtime.consoleAPICalled" && params.type === "error" && consoleErrors.length < 10) {
        consoleErrors.push(params.args.map(arg => arg.value ?? arg.description ?? "").join(" ").slice(0, 300));
      } else if (event.method === "Log.entryAdded" && params.entry.level === "error" && consoleErrors.length < 10) {
        consoleErrors.push(String(params.entry.text).slice(0, 300));
      }
    };
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (pending.delete(id)) reject(new Error(`Timeout: ${method}`)); }, 5000).unref();
    });
    closeBrowser = () => call("Browser.close");
    await Promise.all([call("Network.enable"), call("Runtime.enable"), call("Log.enable"), call("Page.enable")]);
    await call("Page.navigate", { url: new URL(process.env.PROBE_ROUTE || "/", process.env.PROBE_BASE_URL).href });
    const deadline = Date.now() + 5000;
    let loaded = false;
    while (Date.now() < deadline && !loaded) {
      const state = await call("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
      loaded = state.result.value === "complete";
      if (!loaded) await delay(100);
    }
    await delay(500);
    const page = await call("Runtime.evaluate", {
      expression: "JSON.stringify({title:document.title,text:document.body?.innerText || ''})",
      returnByValue: true,
    });
    const { title, text } = JSON.parse(page.result.value);
    const visibleErrorText = text.split(/\r?\n/).map(line => line.trim())
      .filter(line => /could not|couldn't|failed|error|unable|something went wrong|connection issue/i.test(line))
      .slice(0, 5).map(line => line.slice(0, 300));
    report = {
      ok: loaded && !apiFailed && !failedRequests.length && !exceptions.length && !visibleErrorText.length,
      loaded, title, text_excerpt: text.slice(0, 500), api_requests: apiRequests,
      failed_requests: failedRequests, console_errors: consoleErrors, exceptions, visible_error_text: visibleErrorText,
    };
  }
} catch (error) {
  report = { ok: false, error: String(error.message || error).slice(0, 300) };
} finally {
  if (closeBrowser && socket?.readyState === WebSocket.OPEN) {
    await Promise.race([closeBrowser().catch(() => {}), delay(1000)]);
  }
  socket?.close();
  if (browser && browser.exitCode === null) {
    const exited = new Promise(resolve => browser.once("exit", resolve));
    await Promise.race([exited, delay(1000)]);
    if (browser.exitCode === null) {
      browser.kill();
      await Promise.race([exited, delay(1500)]);
    }
  }
  if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
console.log(JSON.stringify(report));
