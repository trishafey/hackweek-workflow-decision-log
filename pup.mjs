import puppeteer from "puppeteer";
const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox"], defaultViewport:{width:1280,height:900} });
const page = await browser.newPage();
const errs=[]; page.on("pageerror",e=>errs.push(e.message));
await page.goto("http://localhost:4178/#/workflow/outfit", { waitUntil:"networkidle0", timeout:30000 });
await new Promise(r=>setTimeout(r,600));
console.log("H1:", await page.evaluate(()=>document.querySelector("h1")?.textContent));
// click Tree diagram toggle
await page.evaluate(()=>{ const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Tree diagram" && x.closest("div")); b&&b.click(); });
await new Promise(r=>setTimeout(r,800));
const info = await page.evaluate(()=>({
  hasReactFlow: !!document.querySelector(".react-flow"),
  nodeCount: document.querySelectorAll(".react-flow__node").length,
  edgeCount: document.querySelectorAll(".react-flow__edge").length,
  sampleNode: document.querySelector(".react-flow__node")?.innerText?.slice(0,40),
  hasControls: !!document.querySelector(".react-flow__controls"),
}));
console.log("diagram:", JSON.stringify(info));
console.log("pageerrors:", errs.join(" | ")||"(none)");
await browser.close(); process.exit(0);
