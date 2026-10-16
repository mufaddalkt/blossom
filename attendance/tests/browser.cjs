const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const out = path.resolve(process.env.QA_OUTPUT || "../../work/browser-qa");
fs.mkdirSync(out, { recursive: true });
const results = [];
const pass = (name) => {
  results.push(name);
  console.log("PASS " + name);
};
(async () => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "msedge",
    headless: true,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    acceptDownloads: true,
    permissions: ["camera"],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const nav = async (name) =>
    page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
  const login = async (role) => {
    await page
      .getByLabel("Username", { exact: true })
      .fill(role === "admin" ? "admin" : "ukg_teacher");
    await page.getByLabel("Password", { exact: true }).fill("demo123");
    await page.getByRole("button", { name: "Enter workspace" }).click();
    await page.getByRole("navigation").waitFor();
  };
  const logout = async () => {
    await page.locator(".user-block").click();
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
  };
  const db = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("blossom-demo-v1")));
  const dialog = () => page.getByRole("dialog");
  try {
    await page.goto(process.env.DEMO_URL || "http://127.0.0.1:3000", {
      waitUntil: "networkidle",
    });
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    assert.ok(
      await page.getByAltText("Approved Blossom school logo").isVisible(),
    );
    await page.getByLabel("Password", { exact: true }).fill("wrong");
    await page.getByRole("button", { name: "Enter workspace" }).click();
    await page.locator(".form-error").waitFor();
    pass("Invalid login shows an error");
    await login("teacher");
    assert.equal(
      await page.getByRole("navigation").getByRole("button").count(),
      4,
    );
    assert.equal(
      await page
        .getByRole("navigation")
        .getByRole("button", { name: "Reports", exact: true })
        .count(),
      0,
    );
    pass("Teacher login and restricted navigation");
    await nav("Attendance");
    assert.equal(
      await page.getByRole("button", { name: "Review & submit" }).isDisabled(),
      true,
    );
    await page
      .getByRole("combobox", { name: "Demo Time Simulation" })
      .selectOption("closed");
    assert.equal(
      await page.getByRole("button", { name: "Mark all present" }).isDisabled(),
      true,
    );
    pass("Closed attendance state blocks teacher marking");
    await page
      .getByRole("combobox", { name: "Demo Time Simulation" })
      .selectOption("normal");
    await page.getByRole("button", { name: "Mark all present" }).click();
    await page
      .getByRole("button", { name: "Anaya Wren: Absent", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reyansh Vale: Leave", exact: true })
      .click();
    await page.reload();
    await page.getByRole("navigation").waitFor();
    await nav("Attendance");
    assert.equal(
      await page
        .getByRole("button", { name: "Anaya Wren: Absent", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Reyansh Vale: Leave", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    pass("Present/Absent/Leave and saved draft survive reload");
    await page.getByRole("button", { name: "Review & submit" }).click();
    await dialog().waitFor();
    assert.ok(
      await page.evaluate(() =>
        document.querySelector("dialog").contains(document.activeElement),
      ),
    );
    await page.keyboard.press("Escape");
    assert.equal(await dialog().count(), 0);
    pass("Review dialog focus and Escape dismissal");
    await page.getByRole("button", { name: "Review & submit" }).click();
    await page
      .getByRole("button", { name: "Confirm final submission" })
      .click();
    await page.getByText("Submitted register · read-only.").waitFor();
    assert.ok((await db()).registers["year-demo|UKG|2026-10-15"].submittedAt);
    assert.equal(
      await page.getByRole("button", { name: "Mark all present" }).isDisabled(),
      true,
    );
    pass("Final confirmation submits and locks register");
    await nav("Correction Requests");
    await page.getByRole("button", { name: "New request" }).click();
    await dialog()
      .getByLabel("Student", { exact: true })
      .selectOption("student-2");
    await dialog()
      .getByLabel("Reason", { exact: true })
      .fill("Synthetic attendance checked with the fictional guardian.");
    await page.getByRole("button", { name: "Send correction request" }).click();
    await dialog().waitFor({ state: "hidden" });
    assert.equal(
      (await db()).corrections.filter((c) => c.status === "Pending").length,
      2,
    );
    pass("Teacher submits a correction request");
    await logout();
    await login("admin");
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
      await nav(name);
      assert.ok(await page.locator("main h1").isVisible());
    }
    pass("Every administrator navigation item renders");
    await nav("Correction Requests");
    const current = page
      .locator(".correction-card")
      .filter({ hasText: "15 Oct 2026" });
    await current.getByRole("button", { name: "Review & approve" }).click();
    await page.getByRole("button", { name: "Confirm approval" }).click();
    await dialog().waitFor({ state: "hidden" });
    assert.equal(
      (await db()).registers["year-demo|UKG|2026-10-15"].marks["student-2"],
      "Present",
    );
    pass("Administrator approval updates official attendance");
    const prior = page
      .locator(".correction-card")
      .filter({ hasText: "14 Oct 2026" });
    await prior.getByRole("button", { name: "Reject", exact: true }).click();
    await dialog()
      .getByRole("textbox")
      .fill("Synthetic evidence does not support this request.");
    await page.getByRole("button", { name: "Confirm rejection" }).click();
    await dialog().waitFor({ state: "hidden" });
    assert.equal(
      (await db()).corrections.find((c) => c.id === "correction-seed").status,
      "Rejected",
    );
    pass("Administrator rejection preserves value and records reason");
    await nav("Attendance");
    await page
      .getByLabel("Attendance date", { exact: true })
      .fill("2026-10-07");
    await page
      .getByRole("button", { name: "Reopen for teacher", exact: true })
      .click();
    await dialog()
      .getByLabel("Extension expiry · IST")
      .fill("2026-10-15T17:00");
    await page.getByRole("button", { name: "Authorize extension" }).click();
    await dialog().waitFor({ state: "hidden" });
    assert.ok((await db()).registers["year-demo|UKG|2026-10-07"].extension);
    pass("Administrator authorizes scoped late extension");
    await logout();
    await login("teacher");
    await nav("Attendance");
    await page
      .getByLabel("Attendance date", { exact: true })
      .fill("2026-10-07");
    await page.getByRole("button", { name: "Mark all present" }).click();
    await page.getByRole("button", { name: "Review & submit" }).click();
    await page
      .getByRole("button", { name: "Confirm final submission" })
      .click();
    await dialog().waitFor({ state: "hidden" });
    assert.ok((await db()).registers["year-demo|UKG|2026-10-07"].submittedAt);
    pass("Teacher submits reopened historical register");
    await logout();
    await login("admin");
    await nav("Students");
    await page
      .getByRole("button", { name: "Add student", exact: true })
      .click();
    await dialog()
      .getByLabel("Full name", { exact: true })
      .fill("Test Fictional Learner");
    await dialog().getByLabel("Fictional guardian phone").fill("DEMO-0099");
    await page
      .getByRole("button", { name: "Save student", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    assert.ok(
      (await db()).students.find((s) => s.name === "Test Fictional Learner"),
    );
    pass("Add a provisional fictional student");
    await page
      .getByPlaceholder("Search students or admission numbers…")
      .fill("Test Fictional");
    await page
      .getByRole("button", { name: "Test Fictional Learner", exact: true })
      .click();
    await page.getByRole("button", { name: "Edit profile" }).click();
    await dialog()
      .getByLabel("Full name", { exact: true })
      .fill("Edited Fictional Learner");
    await dialog()
      .locator("input[type=file]")
      .setInputFiles({
        name: "neutral-demo.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    await page
      .getByText("Fictional photograph added", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Save student", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    assert.ok(
      (await db()).students
        .find((s) => s.name === "Edited Fictional Learner")
        .photo.startsWith("data:image/png"),
    );
    pass("Edit student and validated neutral photo upload");
    await page
      .getByPlaceholder("Search students or admission numbers…")
      .fill("Edited Fictional");
    await page
      .getByRole("button", { name: "Edited Fictional Learner", exact: true })
      .click();
    await page.getByRole("button", { name: "Withdraw", exact: true }).click();
    await page.getByRole("button", { name: "Confirm withdrawal" }).click();
    await dialog().waitFor({ state: "hidden" });
    assert.equal(
      (await db()).students.find((s) => s.name === "Edited Fictional Learner")
        .enrollments[0].status,
      "Withdrawn",
    );
    pass("Withdrawal preserves the profile");
    await page.getByRole("button", { name: "Sample import" }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByRole("button", { name: "Confirm import of 2 sample records" })
      .click();
    await page.getByRole("heading", { name: "Import complete" }).waitFor();
    await dialog().getByRole("button", { name: "Close", exact: true }).click();
    assert.equal((await db()).students.length, 27);
    pass("Synthetic-only import mapping, preview and confirmation");
    await nav("Academic Years");
    await page
      .getByRole("button", { name: "Create academic year", exact: true })
      .click();
    await dialog().getByLabel("Year name").fill("2027–28 Fictional");
    await dialog().getByLabel("Start date").fill("2027-07-01");
    await dialog().getByLabel("End date").fill("2028-06-30");
    await page
      .getByRole("button", { name: "Create year", exact: true })
      .click();
    await dialog().waitFor({ state: "hidden" });
    assert.equal((await db()).years.length, 2);
    pass("Create explicit academic-year dates");
    await nav("Students");
    await page
      .getByRole("button", { name: "Aarav Meadow", exact: true })
      .click();
    await page.getByRole("button", { name: "Promote / repeat" }).click();
    await page.getByRole("button", { name: "Preview change" }).click();
    await page.getByRole("button", { name: "Confirm enrollment" }).click();
    await dialog().waitFor({ state: "hidden" });
    assert.equal((await db()).students[0].enrollments.length, 2);
    pass("Manual promotion preview preserves historical identity");
    await nav("Holidays");
    await page
      .getByRole("button", { name: "Add holiday", exact: true })
      .click();
    await dialog().getByLabel("Holiday name").fill("Synthetic review holiday");
    await dialog().getByLabel("From", { exact: true }).fill("2026-10-14");
    await dialog().getByLabel("Through (inclusive)").fill("2026-10-14");
    assert.equal(
      await page.getByRole("button", { name: "Save holiday" }).isDisabled(),
      true,
    );
    await dialog().getByRole("checkbox").check();
    await page.getByRole("button", { name: "Save holiday" }).click();
    await dialog().waitFor({ state: "hidden" });
    assert.ok(
      (await db()).holidays.some((h) => h.name === "Synthetic review holiday"),
    );
    pass("Holiday conflict requires explicit administrator decision");
    await nav("Reports");
    for (const [button, file] of [
      ["Download PDF", "monthly-demo.pdf"],
      ["Export Excel", "monthly-demo.xlsx"],
    ]) {
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: button, exact: true }).click();
      const download = await downloadPromise;
      await download.saveAs(path.join(out, file));
      assert.ok(fs.statSync(path.join(out, file)).size > 1000);
    }
    pass("Browser PDF and Excel downloads");
    await nav("Teachers");
    await page.getByRole("button", {name:"Reset password"}).click();
    await dialog().getByLabel("Administrator-assigned demo password").fill("replacement-demo");
    await dialog().getByRole("button", {name:"Save account"}).click();
    await dialog().waitFor({state:"hidden"});
    assert.notEqual((await db()).teachers[0].passwordHash,"SEED");
    await page.getByRole("button", {name:"Disable",exact:true}).click();
    await dialog().getByRole("button", {name:"Confirm",exact:true}).click();
    await dialog().waitFor({state:"hidden"});
    assert.equal((await db()).teachers[0].enabled,false);
    await page.getByRole("button", {name:"Create teacher"}).click();
    await dialog().getByLabel("Fictional teacher name").fill("Ms. Fern Example");
    await dialog().getByLabel("Username",{exact:true}).fill("new_ukg_teacher");
    await dialog().getByLabel("Administrator-assigned demo password").fill("new-demo-password");
    await dialog().getByRole("button", {name:"Save account"}).click();
    await dialog().waitFor({state:"hidden"});
    assert.equal((await db()).teachers.length,2);
    pass("Administrator resets, disables and creates replacement teacher accounts");
    await nav("Students");
    await page.getByRole("button",{name:"Aarav Meadow",exact:true}).click();
    await page.getByRole("button",{name:"Edit profile"}).click();
    await dialog().getByRole("button",{name:"Camera",exact:true}).click();
    await page.getByRole("button",{name:"Capture photo"}).click();
    await page.getByRole("button",{name:"Save student",exact:true}).click();
    await dialog().waitFor({state:"hidden"});
    assert.ok((await db()).students[0].photo.startsWith("data:image/jpeg"));
    pass("Camera capture works with a synthetic browser camera");
    await nav("Alerts");
    await page.getByRole("button",{name:"Acknowledge",exact:true}).first().click();
    await page.getByText("Alert acknowledged. History preserved.", {exact:true}).waitFor();
    assert.ok((await db()).alerts.some(a=>a.acknowledged));
    pass("Alert acknowledgement is saved");
    await nav("Dashboard");
    await page.screenshot({
      path: path.join(out, "dashboard-desktop.png"),
      fullPage: true,
    });
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    fs.writeFileSync(
      path.join(out, "accessibility.json"),
      JSON.stringify(accessibility.violations, null, 2),
    );
    console.log(
      "AXE_VIOLATIONS",
      accessibility.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
      })),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(out, "dashboard-mobile.png"),
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    );
    await page.getByRole("button", { name: "Open navigation" }).click();
    await nav("Attendance");
    await page.getByRole("navigation").waitFor({ state: "hidden" });
    await page.screenshot({
      path: path.join(out, "attendance-mobile.png"),
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    );
    pass("Mobile dashboard and attendance fit 390px; navigation works");
    await page.setViewportSize({width:1440,height:1080});
    await nav("Settings");
    await page.getByRole("button",{name:"Reset synthetic demo"}).click();
    await page.getByRole("button",{name:"Reset demonstration"}).click();
    await dialog().waitFor({state:"hidden"});
    assert.equal((await db()).students.length,24);
    assert.equal((await db()).teachers.length,1);
    assert.ok((await db()).logo);
    pass("Demo reset restores reproducible scenarios and retains the logo");
    assert.deepEqual(errors, []);
    pass("No browser runtime errors");
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(
        {
          passed: results,
          errors,
          accessibilityViolations: accessibility.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            count: v.nodes.length,
          })),
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await page.screenshot({
      path: path.join(out, "failure.png"),
      fullPage: true,
    });
    fs.writeFileSync(path.join(out, "failure.txt"), String(e.stack));
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
