const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const outputDir = path.join(__dirname, "..", "docs");
const outputFile = path.join(outputDir, "Job_Card_to_Invoicing_Flow_Presentation_updated.pptx");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Codex";
pptx.company = "Production MIS";
pptx.subject = "Job card to invoicing workflow";
pptx.title = "Job Card to Invoicing Flow";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "en-US",
};

const W = 13.333;
const H = 7.5;
const screenshotDir = path.join(__dirname, "..", "tmp", "slide-shots");
const C = {
  navy: "173E73",
  blue: "2563EB",
  sky: "EAF2FF",
  teal: "0F766E",
  mint: "E7F8F4",
  gold: "C98A1B",
  sand: "FFF6E8",
  rose: "B42318",
  blush: "FDECEC",
  slate: "475569",
  text: "10233D",
  muted: "607086",
  line: "D8E2F0",
  white: "FFFFFF",
  softBg: "F7FAFF",
};

function addSlideBase(slide, title, subtitle) {
  slide.background = { color: C.softBg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.5, line: { color: C.navy, transparency: 100 }, fill: { color: C.navy } });
  slide.addText(title, {
    x: 0.55,
    y: 0.18,
    w: 7.6,
    h: 0.34,
    fontFace: "Aptos Display",
    fontSize: 22,
    bold: true,
    color: C.white,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.58,
      y: 0.56,
      w: 10.8,
      h: 0.24,
      fontSize: 9.5,
      color: C.muted,
      margin: 0,
    });
  }
}

function card(slide, { x, y, w, h, fill = C.white, line = C.line, title, body, titleColor = C.text, accent = C.blue }) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    line: { color: line, pt: 1 },
    fill: { color: fill },
    shadow: { type: "outer", color: "C9D5E8", blur: 1, angle: 45, distance: 1, opacity: 0.15 },
  });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.12, h, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  slide.addText(title, {
    x: x + 0.2,
    y: y + 0.14,
    w: w - 0.28,
    h: 0.26,
    fontSize: 13,
    bold: true,
    color: titleColor,
    margin: 0,
  });
  slide.addText(body, {
    x: x + 0.2,
    y: y + 0.48,
    w: w - 0.34,
    h: h - 0.6,
    fontSize: 9.5,
    color: C.slate,
    breakLine: false,
    valign: "top",
    margin: 0,
    fit: "shrink",
  });
}

function stepNode(slide, { x, y, w, h, n, title, body, fill, accent }) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    line: { color: accent, pt: 1.1 },
    fill: { color: fill },
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: x + 0.16,
    y: y + 0.14,
    w: 0.36,
    h: 0.36,
    line: { color: accent, pt: 1 },
    fill: { color: C.white },
  });
  slide.addText(String(n), {
    x: x + 0.16,
    y: y + 0.19,
    w: 0.36,
    h: 0.16,
    align: "center",
    fontSize: 9,
    bold: true,
    color: accent,
    margin: 0,
  });
  slide.addText(title, {
    x: x + 0.58,
    y: y + 0.12,
    w: w - 0.72,
    h: 0.22,
    fontSize: 12.5,
    bold: true,
    color: C.text,
    margin: 0,
  });
  slide.addText(body, {
    x: x + 0.58,
    y: y + 0.38,
    w: w - 0.72,
    h: h - 0.48,
    fontSize: 8.4,
    color: C.slate,
    margin: 0,
    fit: "shrink",
  });
}

function arrow(slide, x1, y1, x2, y2, color = C.blue) {
  slide.addShape(pptx.ShapeType.line, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color, pt: 1.4, beginArrowType: "none", endArrowType: "triangle" } });
}

function bulletText(items) {
  return items.map((item) => ({ text: item, options: { bullet: { indent: 12 } } }));
}

function screenshotPath(name) {
  return path.join(screenshotDir, `${name}.png`);
}

function addScreenshotPanel(slide, { x, y, w, h, title, subtitle, imagePath, accent }) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.06,
    line: { color: "CBD5E1", pt: 1 },
    fill: { color: C.white },
    shadow: { type: "outer", color: "C9D5E8", blur: 1, angle: 45, distance: 1, opacity: 0.12 },
  });
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.12, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  slide.addText(title, {
    x: x + 0.16,
    y: y + 0.16,
    w: w - 0.32,
    h: 0.22,
    fontSize: 11.5,
    bold: true,
    color: C.text,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: x + 0.16,
      y: y + 0.41,
      w: w - 0.32,
      h: 0.18,
      fontSize: 8.3,
      color: C.muted,
      margin: 0,
    });
  }
  slide.addImage({
    path: imagePath,
    x: x + 0.12,
    y: y + 0.67,
    w: w - 0.24,
    h: h - 0.79,
  });
}

function titleSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, line: { color: C.navy, transparency: 100 }, fill: { color: C.navy } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.6, line: { color: C.blue, transparency: 100 }, fill: { color: C.blue, transparency: 65 } });
  slide.addShape(pptx.ShapeType.arc, { x: 9.2, y: -0.4, w: 4.4, h: 4.4, line: { color: C.blue, transparency: 100 }, fill: { color: "2F6FEA", transparency: 72 } });
  slide.addShape(pptx.ShapeType.arc, { x: 10.1, y: 3.8, w: 3.6, h: 3.6, line: { color: C.teal, transparency: 100 }, fill: { color: "159A8F", transparency: 78 } });
  slide.addText("Job Card to Invoicing Flow", {
    x: 0.72,
    y: 1.05,
    w: 7.7,
    h: 0.65,
    fontFace: "Aptos Display",
    fontSize: 28,
    bold: true,
    color: C.white,
    margin: 0,
  });
  slide.addText("A clear end-to-end view of how a job moves from entry to delivery, implementation, and final billing.", {
    x: 0.74,
    y: 1.9,
    w: 6.7,
    h: 0.52,
    fontSize: 15,
    color: "D7E6FF",
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.76,
    y: 3.02,
    w: 4.95,
    h: 1.75,
    rectRadius: 0.08,
    line: { color: "6FA3FF", pt: 1 },
    fill: { color: "0F2F63", transparency: 8 },
  });
  slide.addText("What this presentation covers", {
    x: 0.98,
    y: 3.2,
    w: 3.4,
    h: 0.25,
    fontSize: 14,
    bold: true,
    color: C.white,
    margin: 0,
  });
  slide.addText(
    bulletText([
      "Job card creation and line-item capture",
      "Estimate sharing and customer approval",
      "Operational handoffs through production, delivery, and implementation",
      "Invoice preparation and reporting",
    ]),
    {
      x: 1.0,
      y: 3.55,
      w: 4.4,
      h: 1.0,
      fontSize: 11,
      color: "EAF2FF",
      breakLine: false,
      margin: 0,
      fit: "shrink",
    }
  );
  slide.addText("Production MIS", {
    x: 0.78,
    y: 6.55,
    w: 2.4,
    h: 0.2,
    fontSize: 10,
    color: "CFE1FF",
    bold: true,
    margin: 0,
  });
  slide.addText("Prepared for internal walkthroughs and team presentations", {
    x: 0.78,
    y: 6.82,
    w: 3.9,
    h: 0.18,
    fontSize: 8.5,
    color: "B9D0F7",
    margin: 0,
  });
}

function descriptionSlide() {
  const slide = pptx.addSlide();
  addSlideBase(slide, "Presentation Description", "This deck explains how a job moves from creation to invoice generation inside Production MIS.");

  card(slide, {
    x: 0.75,
    y: 1.25,
    w: 3.85,
    h: 2.0,
    title: "Purpose",
    body: "Show the full operational flow in a simple order so teams can understand where each action happens and why the job card matters.",
    fill: C.white,
    accent: C.blue,
  });
  card(slide, {
    x: 4.85,
    y: 1.25,
    w: 3.85,
    h: 2.0,
    title: "Audience",
    body: "Useful for CS, job entry, production, implementation, billing, and management teams during training or process review.",
    fill: C.white,
    accent: C.teal,
  });
  card(slide, {
    x: 8.95,
    y: 1.25,
    w: 3.62,
    h: 2.0,
    title: "Outcome",
    body: "Everyone gets a shared view of handoffs, required checks, and the point where invoicing should begin.",
    fill: C.white,
    accent: C.gold,
  });

  card(slide, {
    x: 0.75,
    y: 3.6,
    w: 11.82,
    h: 2.05,
    title: "How to read the flow",
    body: "Start with the job card, check whether an estimate is needed, then follow the work through design, printing, finishing, delivery, implementation, and finally billing. Each stage depends on clean data from the previous step, especially billing location, dimensions, charges, and proof of execution.",
    fill: "F9FBFF",
    accent: C.rose,
  });
  slide.addText("This slide gives the audience the context they need before the detailed process slides begin.", {
    x: 0.9,
    y: 6.0,
    w: 11.5,
    h: 0.2,
    fontSize: 11,
    color: C.slate,
    align: "center",
    margin: 0,
  });
}

function currentFlowSlides() {
  const slide1 = pptx.addSlide();
  addSlideBase(slide1, "Current Flow Screens", "Live screenshots from the current MIS flow: job card, CS, and delivery.");
  addScreenshotPanel(slide1, {
    x: 0.7,
    y: 1.2,
    w: 4.05,
    h: 4.9,
    title: "1. Job ID Creation",
    subtitle: "Start here in Production > Job Entry.",
    imagePath: screenshotPath("jobs"),
    accent: C.blue,
  });
  addScreenshotPanel(slide1, {
    x: 4.64,
    y: 1.2,
    w: 4.05,
    h: 4.9,
    title: "2. CS Screen",
    subtitle: "Track row status and production handoff.",
    imagePath: screenshotPath("cs"),
    accent: C.teal,
  });
  addScreenshotPanel(slide1, {
    x: 8.58,
    y: 1.2,
    w: 4.05,
    h: 4.9,
    title: "3. Delivery Screen",
    subtitle: "Save delivery details and create challan.",
    imagePath: screenshotPath("delivery"),
    accent: C.gold,
  });
  slide1.addText("These are the operational screens the team uses before implementation and billing.", {
    x: 0.9,
    y: 6.45,
    w: 11.5,
    h: 0.22,
    fontSize: 10.8,
    color: C.slate,
    align: "center",
    margin: 0,
  });

  const slide2 = pptx.addSlide();
  addSlideBase(slide2, "Current Flow Screens", "Live screenshots from the current MIS flow: implementation, challan dashboard, and invoice.");
  addScreenshotPanel(slide2, {
    x: 0.7,
    y: 1.2,
    w: 4.05,
    h: 4.9,
    title: "4. Implementation",
    subtitle: "Create the implementation challan and upload proof.",
    imagePath: screenshotPath("implementation"),
    accent: C.rose,
  });
  addScreenshotPanel(slide2, {
    x: 4.64,
    y: 1.2,
    w: 4.05,
    h: 4.9,
    title: "5. Challan Dashboard",
    subtitle: "Review delivery and implementation challans.",
    imagePath: screenshotPath("challan"),
    accent: C.navy,
  });
  addScreenshotPanel(slide2, {
    x: 8.58,
    y: 1.2,
    w: 4.05,
    h: 4.9,
    title: "6. Invoice Preview",
    subtitle: "Prepare billing after execution is complete.",
    imagePath: screenshotPath("invoice"),
    accent: C.teal,
  });
  slide2.addText("Each screen below represents a milestone in the route from job creation to invoicing.", {
    x: 0.9,
    y: 6.45,
    w: 11.5,
    h: 0.22,
    fontSize: 10.8,
    color: C.slate,
    align: "center",
    margin: 0,
  });
}

function explanationSlide() {
  const slide = pptx.addSlide();
  addSlideBase(slide, "Screen Explanations", "What each captured screen contributes to the end-to-end flow.");

  const cards = [
    { n: "1", title: "Job ID Creation", body: "Use this screen to choose Estimate or Job Card Creation and begin the workflow.", accent: C.blue },
    { n: "2", title: "CS Screen", body: "The CS grid tracks job numbers, client data, location, and row status.", accent: C.teal },
    { n: "3", title: "Delivery Screen", body: "Record delivery person, timestamps, mode, and create the delivery challan.", accent: C.gold },
    { n: "4", title: "Implementation", body: "Capture site execution details, challan, and proof media before billing.", accent: C.rose },
    { n: "5", title: "Challan Dashboard", body: "Validate delivery and implementation challans in one place.", accent: C.navy },
    { n: "6", title: "Invoice Preview", body: "Build the sales invoice after delivery and implementation are complete.", accent: C.teal },
  ];

  cards.forEach((cardDef, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 0.7 + col * 4.15;
    const y = 1.3 + row * 2.1;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 3.9, h: 1.65,
      rectRadius: 0.06,
      line: { color: "CBD5E1", pt: 1 },
      fill: { color: C.white },
    });
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.12, h: 1.65, line: { color: cardDef.accent, transparency: 100 }, fill: { color: cardDef.accent } });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.18, y: y + 0.18, w: 0.34, h: 0.34,
      line: { color: cardDef.accent, pt: 1 }, fill: { color: C.white },
    });
    slide.addText(cardDef.n, {
      x: x + 0.18, y: y + 0.23, w: 0.34, h: 0.12, align: "center",
      fontSize: 8.5, bold: true, color: cardDef.accent, margin: 0,
    });
    slide.addText(cardDef.title, {
      x: x + 0.6, y: y + 0.14, w: 3.1, h: 0.22,
      fontSize: 11.8, bold: true, color: C.text, margin: 0,
    });
    slide.addText(cardDef.body, {
      x: x + 0.6, y: y + 0.42, w: 3.05, h: 0.95,
      fontSize: 8.8, color: C.slate, margin: 0, fit: "shrink",
    });
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.72, y: 5.82, w: 11.88, h: 0.9,
    rectRadius: 0.06, line: { color: C.line, pt: 1 }, fill: { color: "F9FBFF" }
  });
  slide.addText("The sequence is: job card creation, CS review, delivery, implementation, challan verification, and invoice preparation.", {
    x: 0.94, y: 6.08, w: 11.4, h: 0.2, fontSize: 10.8, color: C.slate, align: "center", margin: 0
  });
}

function screenSlide(slide, { title, subtitle, imageName, bullets, accent = C.blue }) {
  addSlideBase(slide, title, subtitle);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.72,
    y: 1.2,
    w: 7.95,
    h: 5.72,
    rectRadius: 0.06,
    line: { color: "CBD5E1", pt: 1 },
    fill: { color: C.white },
  });
  slide.addImage({
    path: screenshotPath(imageName),
    x: 0.82,
    y: 1.3,
    w: 7.75,
    h: 5.52,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.92,
    y: 1.2,
    w: 3.72,
    h: 5.72,
    rectRadius: 0.06,
    line: { color: "CBD5E1", pt: 1 },
    fill: { color: "F8FBFF" },
  });
  slide.addShape(pptx.ShapeType.rect, { x: 8.92, y: 1.2, w: 0.12, h: 5.72, line: { color: accent, transparency: 100 }, fill: { color: accent } });
  slide.addText("Key points", {
    x: 9.12,
    y: 1.42,
    w: 2.2,
    h: 0.2,
    fontSize: 12.5,
    bold: true,
    color: C.text,
    margin: 0,
  });
  slide.addText(
    bulletText(bullets),
    {
      x: 9.12,
      y: 1.75,
      w: 3.18,
      h: 4.95,
      fontSize: 10.1,
      color: C.slate,
      margin: 0,
      fit: "shrink",
    }
  );
}

function buildScreenSlides() {
  const slides = [];
  const defs = [
    {
      title: "Job ID Creation",
      subtitle: "Start here to choose the creation path for a job card or estimate.",
      imageName: "jobs",
      accent: C.blue,
      bullets: [
        "Choose Estimate when you want to prepare a quotation first.",
        "Choose Job Card Creation when you want to open a job directly.",
        "Click Continue after selecting the workflow type.",
      ],
    },
    {
      title: "Estimate Setup",
      subtitle: "Use this path when the team needs a new estimate or wants to continue an estimate flow.",
      imageName: "estimate-step2",
      accent: C.teal,
      bullets: [
        "Select Estimate and move to the second step.",
        "Choose New for a blank estimate or Existing to continue a saved job.",
        "Use Send Estimate when the estimate is ready to share.",
      ],
    },
    {
      title: "Estimate Existing",
      subtitle: "The existing estimate path is used when you continue from a saved job or estimate list.",
      imageName: "estimate-existing",
      accent: C.gold,
      bullets: [
        "Use Existing to search the Job ID list for an already-started estimate.",
        "This helps continue work instead of starting from scratch.",
        "The same estimate screen supports mail, PDF, and save actions.",
      ],
    },
    {
      title: "Job Card Creation",
      subtitle: "Use this path to open a new job-card form or continue an existing Job ID.",
      imageName: "job-step2",
      accent: C.rose,
      bullets: [
        "Select Job Card Creation and continue to the second step.",
        "Choose New to open a blank job-card form or Existing to continue an old job.",
        "Job card data is the source for all downstream production and billing steps.",
      ],
    },
    {
      title: "Existing Job",
      subtitle: "This screen opens after choosing Existing from Estimate or Job Card Creation.",
      imageName: "job-existing",
      accent: C.navy,
      bullets: [
        "Step 1 selects Estimate or Job Card Creation, then step 2 selects Existing.",
        "Change Creation Type takes you back to the first step if you picked the wrong flow.",
        "Use Add Row, Draft, Copy Row, PDF, and Save to Drafts to continue the job entry.",
        "Send to Production passes the completed job to the next team.",
      ],
    },
    {
      title: "CS Screen",
      subtitle: "CS tracks job status, hold state, and row-level progress.",
      imageName: "cs",
      accent: C.blue,
      bullets: [
        "Review job no, client, location, and current production status.",
        "Use this screen to monitor hold, pending, and completed rows.",
        "CS is the control point before work moves deeper into production.",
      ],
    },
    {
      title: "Delivery",
      subtitle: "Capture dispatch details and create the delivery challan.",
      imageName: "delivery",
      accent: C.teal,
      bullets: [
        "Enter delivery person, delivery start, delivery completed time, and mode.",
        "Click Add to save the delivery detail row.",
        "Create Challan to generate the delivery record for billing and proof.",
      ],
    },
    {
      title: "Implementation",
      subtitle: "Record on-site execution and upload proof media.",
      imageName: "implementation",
      accent: C.gold,
      bullets: [
        "Select the implemented rows and create the implementation challan.",
        "Upload media or proof photos for verification.",
        "Implementation proof is the final operational checkpoint before invoicing.",
      ],
    },
    {
      title: "Challan Dashboard",
      subtitle: "View all delivery and implementation challans in one place.",
      imageName: "challan",
      accent: C.rose,
      bullets: [
        "Search challans by customer, job, or challan type.",
        "Use this dashboard to review delivery and implementation records together.",
        "This is useful when billing or operations need a quick verification point.",
      ],
    },
    {
      title: "Invoice Preview",
      subtitle: "Prepare the invoice after delivery and implementation are complete.",
      imageName: "invoice",
      accent: C.navy,
      bullets: [
        "Select the job from the invoice queue and review invoice details.",
        "Confirm bill-to, PO, E-way details, and address fields.",
        "Save Draft or Final Invoice when everything is correct.",
      ],
    },
    {
      title: "All Invoices",
      subtitle: "See saved invoices and filter them by date or invoice number.",
      imageName: "invoice-list",
      accent: C.teal,
      bullets: [
        "Search and filter invoices by client, job, location, or invoice number.",
        "Use this screen to review existing billing records.",
        "This acts as the invoice register for the billing team.",
      ],
    },
    {
      title: "Implementation Download",
      subtitle: "Review or export implementation upload records.",
      imageName: "implementation-download",
      accent: C.blue,
      bullets: [
        "Use this screen to inspect implementation upload data.",
        "It is helpful when rechecking proof, size, or site execution details.",
        "Export or filter the records when the billing team needs supporting evidence.",
      ],
    },
  ];

  defs.forEach((def) => {
    const slide = pptx.addSlide();
    screenSlide(slide, def);
    slides.push(slide);
  });
  return slides;
}

function overviewSlide() {
  const slide = pptx.addSlide();
  addSlideBase(slide, "Process Overview", "The flow starts with the job card and ends only after invoicing and reporting are complete.");

  const boxes = [
    { x: 0.7, y: 1.2, w: 1.95, h: 1.15, title: "1. Job Card", body: "Create the job and add line items.", fill: C.sky, accent: C.blue },
    { x: 2.85, y: 1.2, w: 1.95, h: 1.15, title: "2. Estimate", body: "Send mail and share PDF by billing location.", fill: C.mint, accent: C.teal },
    { x: 5.0, y: 1.2, w: 1.95, h: 1.15, title: "3. Production", body: "Design, printing, finishing, and delivery.", fill: C.sand, accent: C.gold },
    { x: 7.15, y: 1.2, w: 2.0, h: 1.15, title: "4. Implementation", body: "Create challan and upload proof media.", fill: C.blush, accent: C.rose },
    { x: 9.35, y: 1.2, w: 2.2, h: 1.15, title: "5. Invoice", body: "Prepare invoice preview and move to billing.", fill: "EEF4FF", accent: C.navy },
  ];
  boxes.forEach((b) => card(slide, b));
  for (let i = 0; i < boxes.length - 1; i += 1) {
    arrow(slide, boxes[i].x + boxes[i].w, boxes[i].y + 0.58, boxes[i + 1].x, boxes[i + 1].y + 0.58);
  }

  card(slide, {
    x: 0.7,
    y: 2.72,
    w: 4.0,
    h: 2.7,
    title: "Core rule",
    body: "Each department updates status before the next handoff. If a job does not need design, finishing, or delivery, it can skip that step and move to the next required stage.",
    fill: C.white,
    accent: C.blue,
  });
  card(slide, {
    x: 4.95,
    y: 2.72,
    w: 3.65,
    h: 2.7,
    title: "Key outputs",
    body: "Saved job rows, estimate PDFs, challans, proof uploads, invoice preview, invoice list, and reporting exports.",
    fill: C.white,
    accent: C.teal,
  });
  card(slide, {
    x: 8.85,
    y: 2.72,
    w: 3.75,
    h: 2.7,
    title: "Who uses it",
    body: "Job Entry, CS, Design, Printing, Finishing, Delivery, Implementation, and Billing/Admin teams.",
    fill: C.white,
    accent: C.gold,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.72, y: 5.72, w: 11.9, h: 1.0,
    rectRadius: 0.06, line: { color: C.line, pt: 1 }, fill: { color: C.white }
  });
  slide.addText("Best presentation takeaway", {
    x: 0.92, y: 5.92, w: 2.2, h: 0.2, fontSize: 12.5, bold: true, color: C.text, margin: 0
  });
  slide.addText("The job card is the single source of truth. Every later step depends on the details entered there, especially billing location, dimensions, charges, and deadlines.", {
    x: 3.0, y: 5.89, w: 9.1, h: 0.38, fontSize: 11, color: C.slate, margin: 0, fit: "shrink"
  });
}

function jobCardSlide() {
  const slide = pptx.addSlide();
  addSlideBase(slide, "1. Job Card Creation", "This is where the workflow starts and where the billing foundation is set.");

  stepNode(slide, {
    x: 0.75, y: 1.25, w: 4.0, h: 1.1,
    n: 1, title: "Create or select the job", body: "Open Production > Job Entry and create the job header before adding detailed rows.", fill: C.white, accent: C.blue,
  });
  stepNode(slide, {
    x: 0.75, y: 2.58, w: 4.0, h: 1.45,
    n: 2, title: "Add line items", body: "Capture store, billing location, product, media, visual code, quantity, dimensions, and remarks for each row.", fill: C.white, accent: C.teal,
  });
  stepNode(slide, {
    x: 0.75, y: 4.28, w: 4.0, h: 1.25,
    n: 3, title: "Add charges", body: "Include installation, transportation, and layouting charges where applicable.", fill: C.white, accent: C.gold,
  });
  stepNode(slide, {
    x: 0.75, y: 5.78, w: 4.0, h: 1.0,
    n: 4, title: "Save the rows", body: "The saved job rows become the source for downstream teams and reporting.", fill: C.white, accent: C.rose,
  });

  card(slide, {
    x: 5.1, y: 1.3, w: 7.35, h: 2.15,
    title: "What must be correct at job card stage",
    body: "Client/store, billing location, production location, quantity, width and height, billing width and height, deadline, and any special instructions. Missing or wrong data here usually creates rework later in estimate, challan, or invoice preparation.",
    fill: "F9FBFF",
    accent: C.blue,
  });
  card(slide, {
    x: 5.1, y: 3.72, w: 3.55, h: 2.15,
    title: "Why it matters",
    body: "This is the master record used by CS, production teams, and billing.",
    fill: C.white,
    accent: C.teal,
  });
  card(slide, {
    x: 8.9, y: 3.72, w: 3.55, h: 2.15,
    title: "Practical tip",
    body: "Use Excel copy/paste when multiple rows need to be entered quickly.",
    fill: C.white,
    accent: C.gold,
  });
}

function estimateSlide() {
  const slide = pptx.addSlide();
  addSlideBase(slide, "2. Estimate and Approval", "When the customer needs an estimate, Job Entry generates split PDFs by billing location.");

  card(slide, {
    x: 0.75, y: 1.25, w: 3.1, h: 1.4,
    title: "Send Mail",
    body: "Select the required rows and open the email workflow.",
    fill: C.white, accent: C.blue,
  });
  card(slide, {
    x: 4.05, y: 1.25, w: 3.1, h: 1.4,
    title: "Separate PDFs",
    body: "The system creates one estimate PDF per billing location.",
    fill: C.white, accent: C.teal,
  });
  card(slide, {
    x: 7.35, y: 1.25, w: 2.95, h: 1.4,
    title: "Review mail",
    body: "Check To, Subject, Body, and attachments before sending.",
    fill: C.white, accent: C.gold,
  });
  card(slide, {
    x: 10.5, y: 1.25, w: 1.95, h: 1.4,
    title: "Approval",
    body: "Customer approval or PO confirmation moves the job forward.",
    fill: C.white, accent: C.rose,
  });
  arrow(slide, 3.85, 1.95, 4.05, 1.95);
  arrow(slide, 7.15, 1.95, 7.35, 1.95);
  arrow(slide, 10.3, 1.95, 10.5, 1.95);

  card(slide, {
    x: 0.75, y: 3.0, w: 5.6, h: 2.3,
    title: "Estimate contents",
    body: "Line items plus added charges such as installation, transportation, and layouting. This helps the customer review the commercial picture before production starts.",
    fill: "F9FBFF",
    accent: C.blue,
  });
  card(slide, {
    x: 6.55, y: 3.0, w: 6.1, h: 2.3,
    title: "Why split by billing location",
    body: "The system can group items by North, South, East, West, or any other billing location so the customer receives the right estimates for the right location scope.",
    fill: C.white,
    accent: C.teal,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.76, y: 5.72, w: 11.9, h: 0.95,
    rectRadius: 0.06, line: { color: C.line, pt: 1 }, fill: { color: C.white }
  });
  slide.addText("If no estimate is required, the job can move directly into the next operational stage after approval is already available.", {
    x: 0.98, y: 5.98, w: 11.4, h: 0.28, fontSize: 11, color: C.slate, margin: 0, align: "center"
  });
}

function productionSlide() {
  const slide = pptx.addSlide();
  addSlideBase(slide, "3. Production and Handoffs", "CS monitors the job while design, printing, finishing, and delivery teams complete their work.");

  const nodes = [
    { n: 1, title: "CS review", body: "Track SLA, pending jobs, hold status, delivery, and uploads.", fill: C.white, accent: C.blue },
    { n: 2, title: "Design", body: "Assign designer, update brief, and upload artwork or approvals.", fill: "F6FBFF", accent: C.teal },
    { n: 3, title: "Printing", body: "Select rows, choose printer and media details, then start and stop the job.", fill: "FFFDF4", accent: C.gold },
    { n: 4, title: "Finishing", body: "Complete lamination, mounting, and packing if needed.", fill: "FFF7F5", accent: C.rose },
    { n: 5, title: "Delivery", body: "Enter delivery details and create the delivery challan.", fill: "F8FAFF", accent: C.navy },
  ];
  const xs = [0.7, 3.25, 5.8, 8.35, 10.9];
  nodes.forEach((node, idx) => {
    stepNode(slide, { x: xs[idx], y: 1.4, w: 2.25, h: 1.65, ...node });
    if (idx < nodes.length - 1) arrow(slide, xs[idx] + 2.25, 2.22, xs[idx + 1], 2.22);
  });

  card(slide, {
    x: 0.75, y: 3.6, w: 4.0, h: 2.25,
    title: "Design stage",
    body: "Used only when artwork or approval work is needed. The designer receives the brief, deadline, and any queries before moving the job back to the flow.",
    fill: C.white,
    accent: C.teal,
  });
  card(slide, {
    x: 4.98, y: 3.6, w: 4.0, h: 2.25,
    title: "Printing and finishing",
    body: "The operator starts and stops work against selected rows. This creates an audit trail for production progress and completion.",
    fill: C.white,
    accent: C.gold,
  });
  card(slide, {
    x: 9.2, y: 3.6, w: 3.35, h: 2.25,
    title: "Delivery output",
    body: "Delivery details are saved and a challan is created before implementation begins.",
    fill: C.white,
    accent: C.rose,
  });
}

function implementationSlide() {
  const slide = pptx.addSlide();
  addSlideBase(slide, "4. Implementation and Proof Upload", "Final execution closes the operational loop and prepares the job for billing.");

  stepNode(slide, {
    x: 0.75, y: 1.35, w: 3.0, h: 1.5,
    n: 1, title: "Open Implementation", body: "Select the relevant job rows and prepare the implementation entry.", fill: C.white, accent: C.blue,
  });
  stepNode(slide, {
    x: 4.0, y: 1.35, w: 3.0, h: 1.5,
    n: 2, title: "Create challan", body: "Capture implementation timestamp and details, then generate the challan.", fill: C.white, accent: C.teal,
  });
  stepNode(slide, {
    x: 7.25, y: 1.35, w: 3.0, h: 1.5,
    n: 3, title: "Upload media", body: "Attach proof images and related information for verification.", fill: C.white, accent: C.gold,
  });
  stepNode(slide, {
    x: 10.5, y: 1.35, w: 2.05, h: 1.5,
    n: 4, title: "Done", body: "The job is ready for invoicing and report checks.", fill: C.white, accent: C.rose,
  });
  arrow(slide, 3.75, 2.1, 4.0, 2.1);
  arrow(slide, 7.0, 2.1, 7.25, 2.1);
  arrow(slide, 10.25, 2.1, 10.5, 2.1);

  card(slide, {
    x: 0.75, y: 3.35, w: 5.7, h: 2.35,
    title: "What implementation proves",
    body: "The work was completed at the site, the execution is documented, and the proof media can be reviewed later through Implementation Download or challan-related screens.",
    fill: "F9FBFF",
    accent: C.blue,
  });
  card(slide, {
    x: 6.7, y: 3.35, w: 5.6, h: 2.35,
    title: "Why billing waits for this step",
    body: "Implementation confirms that the job has been executed. That makes invoice preparation and billing review more reliable and auditable.",
    fill: C.white,
    accent: C.teal,
  });
  slide.addText("The main outcome is a verifiable handoff: implementation challan + proof upload.", {
    x: 0.92, y: 6.02, w: 11.2, h: 0.22, fontSize: 11.5, bold: true, color: C.text, align: "center", margin: 0
  });
}

function invoiceSlide() {
  const slide = pptx.addSlide();
  addSlideBase(slide, "5. Invoicing and Reporting", "Once implementation is complete, billing can prepare the invoice and related reports.");

  card(slide, {
    x: 0.75, y: 1.3, w: 3.75, h: 2.0,
    title: "Invoice preview",
    body: "Use Production > Invoice to prepare the invoice preview from the completed job data.",
    fill: C.white,
    accent: C.blue,
  });
  card(slide, {
    x: 4.75, y: 1.3, w: 3.75, h: 2.0,
    title: "All invoices",
    body: "Use Production > All Invoices to view the invoice list and confirm invoice records.",
    fill: C.white,
    accent: C.teal,
  });
  card(slide, {
    x: 8.75, y: 1.3, w: 3.82, h: 2.0,
    title: "Challan dashboard",
    body: "Check delivery and implementation challans before final billing sign-off.",
    fill: C.white,
    accent: C.gold,
  });

  card(slide, {
    x: 0.75, y: 3.65, w: 5.95, h: 2.55,
    title: "Reports available to Billing/Admin",
    body: "MIS Report, Weekly Audit Report, Consolidated MIS Report, and Billing Export support reconciliation and downstream finance work.",
    fill: "F9FBFF",
    accent: C.rose,
  });
  card(slide, {
    x: 6.95, y: 3.65, w: 5.62, h: 2.55,
    title: "Final control checks",
    body: "Verify job number, store, billing location, quantity, dimensions, challan status, and proof upload before final billing output is shared.",
    fill: C.white,
    accent: C.blue,
  });
  slide.addText("Invoicing is the final checkpoint where operations, proof, and finance align.", {
    x: 0.95, y: 6.45, w: 11.4, h: 0.2, fontSize: 11.5, bold: true, color: C.text, align: "center", margin: 0
  });
}

function closeSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, line: { color: C.navy, transparency: 100 }, fill: { color: C.navy } });
  slide.addText("The flow in one line", {
    x: 0.85, y: 0.92, w: 4.2, h: 0.3, fontSize: 14, bold: true, color: "D9E8FF", margin: 0
  });
  slide.addText("Job card -> Estimate -> Production -> Delivery -> Implementation -> Invoice", {
    x: 0.85, y: 1.25, w: 11.3, h: 0.6, fontFace: "Aptos Display", fontSize: 24, bold: true, color: C.white, margin: 0
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.9, y: 2.35, w: 11.55, h: 2.05, rectRadius: 0.08,
    line: { color: "5A83C7", pt: 1 }, fill: { color: "12325E" }
  });
  slide.addText(
    bulletText([
      "The job card is the source record.",
      "Each department updates the job as it moves forward.",
      "Implementation proof unlocks invoicing confidence.",
      "Reports and billing exports support the finance handoff.",
    ]),
    {
      x: 1.15, y: 2.65, w: 10.9, h: 1.2, fontSize: 13, color: C.white, margin: 0, fit: "shrink"
    }
  );
  slide.addText("Thank you", {
    x: 0.88, y: 5.45, w: 2.1, h: 0.3, fontSize: 18, bold: true, color: "D9E8FF", margin: 0
  });
  slide.addText("Prepared for the Production MIS workflow discussion", {
    x: 0.88, y: 5.82, w: 4.6, h: 0.18, fontSize: 10, color: "B8CEF1", margin: 0
  });
}

function buildDeck() {
  titleSlide();
  descriptionSlide();
  buildScreenSlides();
}

function main() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  buildDeck();
  return pptx.writeFile({ fileName: outputFile });
}

main()
  .then(() => {
    console.log(outputFile);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
