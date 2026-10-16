const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("fs");
const path = require("path");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const results = [];
  try {
    await page.goto(process.env.DEMO_URL || "http://127.0.0.1:3000");
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    async function audit(name) {
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      results.push({ name, violations: r.violations });
      console.log(
        name,
        r.violations.map((v) => `${v.id}: ${v.nodes.length}`),
      );
    }
    await audit("Login");
    await page.getByRole("button", { name: "Enter workspace" }).click();
    await page.getByRole("navigation").waitFor();
    for (const name of [
      "Dashboard",
      "Attendance",
      "Students",
      "Teachers",
      "Correction Requests",
      "Alerts",
      "Reports",
      "Academic Years",
      "Holidays",
      "Audit History",
      "Settings",
    ]) {
      await page
        .getByRole("navigation")
        .getByRole("button", { name, exact: true })
        .click();
      await audit(name);
    }
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Students", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add student", exact: true })
      .click();
    await audit("Student dialog");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await audit("Mobile directory");
    const out = path.resolve("../../work/browser-qa/accessibility-all.json");
    fs.writeFileSync(out, JSON.stringify(results, null, 2));
    if (results.some((r) => r.violations.length)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
