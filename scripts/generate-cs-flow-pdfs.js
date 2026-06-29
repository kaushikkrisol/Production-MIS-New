const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const outputDir = path.join(__dirname, "..", "docs");

function savePdf(doc, fileName) {
  const outPath = path.join(outputDir, fileName);
  fs.writeFileSync(outPath, Buffer.from(doc.output("arraybuffer")));
  return outPath;
}

function addPageNumbers(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 118, 130);
    doc.text(`Page ${page} of ${pageCount}`, doc.internal.pageSize.getWidth() - 28, doc.internal.pageSize.getHeight() - 8);
  }
}

function header(doc, title, subtitle) {
  doc.setFillColor(31, 64, 124);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 12, 9);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(subtitle, 12, 15);
  }
  doc.setTextColor(33, 37, 41);
}

function drawArrow(doc, x1, y1, x2, y2) {
  doc.setDrawColor(67, 81, 107);
  doc.setLineWidth(0.35);
  doc.line(x1, y1, x2, y2);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = 3.2;
  const left = angle - Math.PI / 7;
  const right = angle + Math.PI / 7;

  doc.line(x2, y2, x2 - headLength * Math.cos(left), y2 - headLength * Math.sin(left));
  doc.line(x2, y2, x2 - headLength * Math.cos(right), y2 - headLength * Math.sin(right));
}

function drawStepBox(doc, step) {
  const { x, y, w, h, number, title, detail, fill } = step;
  doc.setFillColor(...fill);
  doc.setDrawColor(142, 151, 168);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.setTextColor(31, 41, 55);
  doc.text(`${number}. ${title}`, x + 2.2, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  const lines = doc.splitTextToSize(detail, w - 4.5);
  doc.text(lines.slice(0, 3), x + 2.2, y + 10.5);
}

function createFlowChartPdf() {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  header(doc, "CS to Implementation Flow Chart", "End-to-end MIS production process");

  const boxW = 42;
  const boxH = 27;
  const gap = 5;
  const startX = 10;
  const row1Y = 35;
  const row2Y = 83;
  const row3Y = 132;
  const colors = [
    [239, 246, 255],
    [240, 253, 244],
    [255, 247, 237],
    [245, 243, 255],
    [236, 253, 245],
    [255, 241, 242],
  ];

  const row1 = [
    ["1", "Login", "User opens MIS and logs in."],
    ["2", "Job Entry", "Create/select job and add line items."],
    ["3", "Line Items", "Store, location, media, qty, size, deadline."],
    ["4", "Charges", "Installation, transportation, layouting charges."],
    ["5", "Estimate Mail", "PDFs split by billing location."],
    ["6", "CS Review", "Track SLA, status, hold, pending, uploads."],
  ];

  const row2 = [
    ["7", "Design", "Assign designer, update brief, complete artwork."],
    ["8", "Printing", "Select rows, printer, media width/length, start/stop."],
    ["9", "Finishing", "Lamination, mounting, and packing start/stop."],
    ["10", "Delivery", "Add person, mode, timestamps, create challan."],
    ["11", "Implementation", "Select rows and create implementation challan."],
    ["12", "Upload Proof", "Upload before/after or execution media."],
  ];

  const row3 = [
    ["13", "Download", "Use Implementation Download for proof records."],
    ["14", "Invoice", "Prepare invoice preview and view all invoices."],
    ["15", "Reports", "MIS, weekly audit, consolidated MIS, billing export."],
  ];

  const steps = [];
  row1.forEach((item, i) => {
    steps.push({ number: item[0], title: item[1], detail: item[2], x: startX + i * (boxW + gap), y: row1Y, w: boxW, h: boxH, fill: colors[i % colors.length] });
  });
  row2.forEach((item, i) => {
    steps.push({ number: item[0], title: item[1], detail: item[2], x: startX + i * (boxW + gap), y: row2Y, w: boxW, h: boxH, fill: colors[(i + 1) % colors.length] });
  });
  const row3StartX = 58;
  row3.forEach((item, i) => {
    steps.push({ number: item[0], title: item[1], detail: item[2], x: row3StartX + i * 60, y: row3Y, w: 52, h: boxH, fill: colors[(i + 2) % colors.length] });
  });

  steps.forEach((step) => drawStepBox(doc, step));

  for (let i = 0; i < 5; i += 1) {
    const a = steps[i];
    const b = steps[i + 1];
    drawArrow(doc, a.x + a.w, a.y + a.h / 2, b.x, b.y + b.h / 2);
  }

  drawArrow(doc, steps[5].x + steps[5].w / 2, steps[5].y + steps[5].h, steps[6].x + steps[6].w / 2, steps[6].y);

  for (let i = 6; i < 11; i += 1) {
    const a = steps[i];
    const b = steps[i + 1];
    drawArrow(doc, a.x + a.w, a.y + a.h / 2, b.x, b.y + b.h / 2);
  }

  drawArrow(doc, steps[11].x + steps[11].w / 2, steps[11].y + steps[11].h, steps[12].x + steps[12].w / 2, steps[12].y);
  drawArrow(doc, steps[12].x + steps[12].w, steps[12].y + steps[12].h / 2, steps[13].x, steps[13].y + steps[13].h / 2);
  drawArrow(doc, steps[13].x + steps[13].w, steps[13].y + steps[13].h / 2, steps[14].x, steps[14].y + steps[14].h / 2);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, 174, 276, 18, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  doc.text("Important notes", 14, 181);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text("Skip Design, Finishing, or Delivery only when the job does not require that department.", 14, 186);
  doc.text("Estimate PDFs are created separately for each billing location, such as North, South, East, and West.", 14, 190);

  doc.addPage("a4", "landscape");
  header(doc, "Detailed Department Flow", "Inputs, actions, and outputs for each MIS stage");

  autoTable(doc, {
    startY: 30,
    margin: { left: 10, right: 10 },
    head: [["Stage", "Screen", "Main User Action", "Output"]],
    body: [
      ["Job Entry", "Production > Job Entry", "Add line items, charges, dimensions, store, billing location, and deadlines.", "Saved job rows and estimate PDF or mail when needed."],
      ["CS", "Production > CS", "Review jobs, SLA, pending/hold rows, delivery status, implementation status, and uploads.", "Clear tracking and department handoff."],
      ["Design", "Production > Design", "Assign designer, update brief, query, and deadline, then complete artwork.", "Approved or completed design or artwork."],
      ["Printing", "Production > Printing", "Select rows, enter printer and media details, start and stop print job.", "Printing completed status."],
      ["Finishing", "Production > Lamination / Mounting & Packing", "Start and stop lamination, mounting, and packing activity.", "Packed and finished material ready for dispatch."],
      ["Delivery", "Production > Delivery", "Enter delivery person, mode, timestamps, and create challan.", "Delivery challan and delivery done status."],
      ["Implementation", "Production > Implementation", "Create implementation challan and upload execution proof media.", "Implementation done and uploaded status."],
      ["Billing", "Invoice / Reports", "Prepare invoice, check challans, export billing and MIS reports.", "Final billing and reporting output."],
    ],
    theme: "grid",
    headStyles: { fillColor: [31, 64, 124], textColor: 255, fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, valign: "top" },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      1: { cellWidth: 55 },
      2: { cellWidth: 112 },
      3: { cellWidth: 78 },
    },
  });

  addPageNumbers(doc);
  return savePdf(doc, "CS_to_Implementation_Flow_Chart.pdf");
}

function createManualWriter(doc) {
  const margin = 14;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = 32;

  function ensureSpace(space) {
    if (y + space > pageHeight - 16) {
      doc.addPage();
      header(doc, "CS to Implementation User Manual", "MIS production process");
      y = 32;
    }
  }

  function section(title) {
    ensureSpace(16);
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(margin, y - 5, maxWidth, 9, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text(title, margin + 3, y + 1);
    doc.setTextColor(33, 37, 41);
    y += 12;
  }

  function paragraph(text) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    const lines = doc.splitTextToSize(text, maxWidth);
    ensureSpace(lines.length * 5 + 3);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  }

  function bullets(items) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    items.forEach((item) => {
      const lines = doc.splitTextToSize(item, maxWidth - 6);
      ensureSpace(lines.length * 5 + 2);
      doc.text("-", margin, y);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  }

  function numbered(items) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    items.forEach((item, index) => {
      const prefix = `${index + 1}.`;
      const lines = doc.splitTextToSize(item, maxWidth - 8);
      ensureSpace(lines.length * 5 + 2);
      doc.text(prefix, margin, y);
      doc.text(lines, margin + 8, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  }

  function table(head, body, columnStyles = {}) {
    ensureSpace(24);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head,
      body,
      theme: "grid",
      headStyles: { fillColor: [31, 64, 124], textColor: 255, fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.2, valign: "top", overflow: "linebreak" },
      columnStyles,
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  return { section, paragraph, bullets, numbered, table };
}

function createUserManualPdf() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  header(doc, "CS to Implementation User Manual", "MIS production process");
  const w = createManualWriter(doc);

  w.section("Scope");
  w.paragraph("This manual explains the complete operating flow from Job Entry and CS monitoring to design, printing, finishing, delivery, implementation, proof upload, invoices, and reports.");
  w.paragraph("Main menu path: Production > Job Entry > CS > Design > Printing > Lamination / Mounting & Packing > Delivery > Implementation.");

  w.section("Roles");
  w.table(
    [["Role", "Main Work"]],
    [
      ["CS / Customer Service", "Monitor job line items, status, SLA, pending jobs, customer approval, and handoff."],
      ["Job Entry User", "Create job rows, charges, estimate PDFs, and estimate mails."],
      ["Designer", "Complete artwork, update design status, and upload approval or artwork details."],
      ["Printing Operator", "Start and stop printing with printer and media details."],
      ["Lamination / Mounting / Packing Operator", "Complete finishing and packing activity."],
      ["Delivery Coordinator", "Add delivery details and create delivery challan."],
      ["Implementation Executive", "Complete implementation, create challan, and upload proof media."],
      ["Billing / Admin", "Prepare invoices, check challans, download reports, and export billing data."],
    ],
    { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: 127 } }
  );

  w.section("Screen Reference");
  w.table(
    [["Screen", "Menu Path", "Purpose"]],
    [
      ["Job Entry", "Production > Job Entry", "Create job line items and estimate PDFs."],
      ["CS", "Production > CS", "Track all job rows, SLA, delivery, implementation, and upload status."],
      ["Design", "Production > Design", "Assign and complete artwork or design work."],
      ["Printing", "Production > Printing", "Start and stop printing work."],
      ["Lamination / Mounting & Packing", "Production > Lamination / Mounting & Packing", "Complete finishing and packing."],
      ["Delivery", "Production > Delivery", "Add delivery details and create delivery challan."],
      ["Implementation", "Production > Implementation", "Create implementation challan and upload proof media."],
      ["Implementation Download", "Production > Implementation Download", "Download or view implementation upload details."],
      ["Invoice / All Invoices", "Production > Invoice / All Invoices", "Prepare invoice preview and view invoice list."],
      ["Reports", "Production > Reports", "MIS, weekly audit, consolidated MIS, and billing export."],
    ],
    { 0: { cellWidth: 40, fontStyle: "bold" }, 1: { cellWidth: 66 }, 2: { cellWidth: 76 } }
  );

  w.section("1. Login");
  w.numbered([
    "Open the MIS application.",
    "Enter username and password.",
    "Click login.",
    "Open the Production menu from the sidebar.",
  ]);

  w.section("2. Master Data Check");
  w.paragraph("Before creating or processing jobs, confirm that all required master data is available.");
  w.bullets([
    "Store Master: confirm client, store, and address details.",
    "Product Media Rates: confirm media and rate details.",
    "Element Group Master: confirm element grouping if the job requires it.",
  ]);

  w.section("3. Job Entry");
  w.numbered([
    "Open Production > Job Entry.",
    "Select or create the job.",
    "Add each line item with region/production location, billing location, salon/store, address, brand, product, element, media, visual code, quantity, dimensions, deadline, and remarks.",
    "Add installation charges, transportation charges, and layouting charges where applicable.",
    "Save the job rows.",
    "Use Excel copy/paste when many rows need to be added quickly.",
  ]);

  w.section("4. Estimate PDF and Mail");
  w.numbered([
    "Select the required job rows in Job Entry.",
    "Click Send Mail.",
    "Confirm To, Subject, and Body.",
    "Review the attachment list.",
    "Click Send Mail.",
  ]);
  w.paragraph("The system creates separate estimate PDF files by billing location. For example, if selected line items have billing locations North, South, East, and West, separate estimate PDFs are created for each location. The PDF includes installation, transportation, and layouting charges when added in the line items.");

  w.section("5. CS Monitoring");
  w.numbered([
    "Open Production > CS.",
    "Use search, filters, and tabs to find the required job.",
    "Check line-item status, SLA alerts, pending rows, and hold rows.",
    "Confirm delivery status, implementation status, and implementation upload status.",
    "Export data when required for coordination or reporting.",
  ]);
  w.bullets([
    "Verify job number, client, store, and address.",
    "Verify production location and billing location.",
    "Verify quantity, dimensions, deadline, and charges.",
    "Confirm customer approval or PO status before further work.",
  ]);

  w.section("6. Design");
  w.numbered([
    "Open Production > Design.",
    "Search or filter the required job.",
    "Select the job row.",
    "Update designer name, design type, brief, query, and deadlines.",
    "Start the design job.",
    "Complete the design job after artwork is ready.",
    "Upload approval/artwork images if required.",
    "Refresh the list and confirm the status is updated.",
  ]);

  w.section("7. Printing");
  w.numbered([
    "Open Production > Printing.",
    "Search or filter the required job rows.",
    "Select the rows to print.",
    "Select the printing machine/printer.",
    "Enter media width and media length where required.",
    "Click Start Job.",
    "After printing is completed, click Stop Job.",
    "Confirm the completed printing status.",
  ]);

  w.section("8. Lamination, Mounting, and Packing");
  w.numbered([
    "Open Production > Lamination / Mounting & Packing.",
    "Search or filter by job, location, or store.",
    "Select the required rows.",
    "Click Start Job.",
    "Complete lamination, mounting, and packing activity.",
    "Click Stop Job.",
    "View challan details if available.",
  ]);

  w.section("9. Delivery");
  w.numbered([
    "Open Production > Delivery.",
    "Select the required job rows.",
    "Enter delivery person.",
    "Enter delivery start time.",
    "Enter delivery completed time.",
    "Select delivery mode.",
    "Click Add to save delivery details.",
    "Click Create Challan.",
    "Review challan details and save.",
  ]);

  w.section("10. Implementation");
  w.numbered([
    "Open Production > Implementation.",
    "Search or filter the required job rows.",
    "Select the implemented rows.",
    "Enter implementation timestamp/details.",
    "Click Create Implementation Challan.",
    "Upload implementation media.",
    "Select media type/image type as required.",
    "Enter implementation person, contact, and authority details if required.",
    "Submit the upload and confirm upload status.",
  ]);

  w.section("11. Invoice and Reports");
  w.bullets([
    "Use Invoice to prepare invoice preview.",
    "Use All Invoices to view existing invoices.",
    "Use Challan Dashboard to check delivery and implementation challans.",
    "Use MIS Report, Weekly Audit Report, and Consolidated MIS Report for tracking.",
    "Use Billing Export for billing data export.",
  ]);

  w.section("Common Controls");
  w.table(
    [["Control", "Use"]],
    [
      ["Search", "Find job number, client, store, city, or other visible row details."],
      ["Filters and Tabs", "Narrow down jobs by status, location, or workflow area."],
      ["Checkbox", "Select one or more rows for action."],
      ["Refresh", "Reload latest data from the server."],
      ["Export or Download", "Download Excel, CSV, or PDF data where supported."],
      ["Start Job", "Begin department work and capture start status/time."],
      ["Stop Job", "Complete department work and capture end status/time."],
      ["Create Challan", "Generate delivery or implementation challan for selected rows."],
      ["Upload Media", "Upload implementation or approval proof."],
    ],
    { 0: { cellWidth: 42, fontStyle: "bold" }, 1: { cellWidth: 140 } }
  );

  w.section("Handoff Checklist");
  w.bullets([
    "Job number and client are correct.",
    "Store/salon name and address are correct.",
    "Billing location and production location are correct.",
    "Product, media, element, and visual code are correct.",
    "Quantity, dimensions, and square feet are correct.",
    "Installation, transportation, and layouting charges are added when applicable.",
    "Deadline is entered.",
    "Customer approval/PO confirmation is available where required.",
    "Challan is created for delivery/implementation where required.",
    "Implementation proof media is uploaded after execution.",
  ]);

  w.section("Troubleshooting");
  w.table(
    [["Issue", "Check"]],
    [
      ["Job rows are not visible in CS", "Refresh the screen, check filters/tabs, and confirm rows were saved in Job Entry."],
      ["Estimate PDF is not split correctly", "Confirm each line item has the correct billing location."],
      ["Charges are missing from PDF", "Confirm installation, transportation, and layouting charges are entered before sending mail."],
      ["Cannot start printing", "Select rows and enter required printer/media details."],
      ["Packing job is not visible", "Confirm printing is completed and filters/location are correct."],
      ["Delivery challan is not created", "Select rows and save delivery details before creating challan."],
      ["Implementation upload is missing", "Confirm implementation challan is created and media upload was submitted successfully."],
      ["Status is not updated", "Refresh the screen and verify the previous department has stopped/completed the job."],
    ],
    { 0: { cellWidth: 62, fontStyle: "bold" }, 1: { cellWidth: 120 } }
  );

  addPageNumbers(doc);
  return savePdf(doc, "CS_to_Implementation_User_Manual.pdf");
}

const flowChartPdf = createFlowChartPdf();
const userManualPdf = createUserManualPdf();

console.log(`Created ${flowChartPdf}`);
console.log(`Created ${userManualPdf}`);
