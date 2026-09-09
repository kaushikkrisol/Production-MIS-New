const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "build");
const captureDir = path.join(__dirname, "..", "tmp", "capture");
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

function buildCapturePage(scenario) {
  if (scenario === "job-existing") {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>job-existing</title>
  <style>
    :root {
      --bg: #f5f7fb;
      --panel: #ffffff;
      --line: #dbe3ef;
      --line-soft: #e7edf6;
      --text: #17233c;
      --muted: #607189;
      --blue: #315ed8;
      --navy: #12356f;
      --red: #a93c38;
      --accent: #fdf7ee;
      --sidebar: #ffffff;
      --shadow: 0 10px 30px rgba(31, 54, 92, 0.08);
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; font-family: Arial, Helvetica, sans-serif; background: var(--bg); color: var(--text); }
    .app { width: 100vw; height: 100vh; display: flex; flex-direction: column; }
    .topbar {
      height: 67px; background: #fff; border-bottom: 1px solid var(--line); display: flex; align-items: center; padding: 0 18px 0 18px;
    }
    .brand { font-size: 32px; font-weight: 700; color: var(--navy); margin-right: 16px; letter-spacing: -0.4px; }
    .circle { width: 28px; height: 28px; border-radius: 50%; background: #a03b35; color: #fff; display: grid; place-items: center; font-size: 18px; font-weight: 700; margin-right: 14px; }
    .search { width: 300px; height: 38px; border-radius: 10px; background: #f5f7fb; border: 1px solid #edf1f7; display: flex; align-items: center; padding: 0 16px; color: #8794a8; font-size: 14px; }
    .spacer { flex: 1; }
    .icon { width: 38px; height: 38px; border-radius: 8px; border: 1px solid #d9e1ee; margin-left: 14px; background: #fff; }
    .layout { flex: 1; display: flex; min-height: 0; }
    .sidebar {
      width: 260px; background: var(--sidebar); border-right: 1px solid var(--line); padding: 16px 0 0;
      overflow: hidden;
    }
    .menu { height: 100%; padding: 0 22px 18px; overflow: hidden; }
    .menu h4 { margin: 12px 0 18px; font-size: 14px; color: #0d1f52; font-weight: 700; }
    .item { font-size: 14px; color: #3e5571; margin: 0 0 20px; padding-left: 16px; }
    .section {
      margin: 8px 0 8px; background: #fff4ec; border-radius: 10px; padding: 12px 12px; display: flex; align-items: center; gap: 10px; color: #cb5a32; font-weight: 600;
    }
    .section .caret { margin-left: auto; color: #d48a63; }
    .subitem { font-size: 14px; margin: 16px 0 16px 18px; color: #223452; position: relative; }
    .subitem.active { color: #c63d27; }
    .subitem.active::before, .subitem::before {
      content: ""; position: absolute; left: -14px; top: 8px; width: 6px; height: 6px; border-radius: 50%; background: #c7d0dd;
    }
    .subitem.active::before { background: #c63d27; }
    .content { flex: 1; min-width: 0; padding: 22px 24px 20px; overflow: hidden; position: relative; }
    .pagehead { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
    .title { font-size: 20px; font-weight: 700; margin: 12px 0 4px; }
    .subtitle { font-size: 12px; color: var(--muted); line-height: 1.5; }
    .toolbar { display: flex; gap: 12px; align-items: center; }
    .tile {
      width: 115px; height: 68px; border: 1px solid #dbe3ef; border-radius: 6px; background: #fff; box-shadow: var(--shadow); padding: 10px 14px;
    }
    .tile .small { font-size: 11px; color: #6d7f97; }
    .tile .big { font-size: 20px; font-weight: 700; margin-top: 8px; }
    .btn {
      height: 46px; padding: 0 18px; border-radius: 5px; background: var(--blue); color: #fff; display: inline-flex; align-items: center; gap: 8px; font-weight: 700; border: none; font-size: 14px;
    }
    .btn.disabled { background: #ced7e3; color: #fff; }
    .btn.secondary { background: #fff; color: #29384e; border: 1px solid #d7deea; font-weight: 600; }
    .panel {
      background: #fff; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; box-shadow: var(--shadow); margin-top: 10px;
    }
    .row1 { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 10px 10px 14px; }
    .actionrow, .actionrow2 { display: flex; gap: 8px; flex-wrap: nowrap; }
    .smallbtn {
      height: 38px; border-radius: 4px; border: 1px solid #d9e1ee; background: #fff; color: #27364c; padding: 0 12px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;
    }
    .smallbtn.red { color: #e53935; }
    .jobmeta { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 12px 14px; display: flex; gap: 14px; align-items: center; font-size: 13px; white-space: nowrap; overflow: hidden; }
    .jobmeta .highlight { font-weight: 700; }
    .unit { display: inline-flex; align-items: center; gap: 6px; background: #fff5b9; border: 1px solid #e0c400; padding: 3px 8px; border-radius: 4px; }
    .unit select { height: 26px; border-radius: 3px; border: 1px solid #b7c1d0; padding: 0 4px; background: #fff; }
    .gridwrap { height: calc(100vh - 390px); min-height: 360px; overflow: auto; background: #fff; }
    table { border-collapse: collapse; width: 100%; min-width: 1700px; }
    th, td { border: 1px solid #d9e1ee; padding: 6px 8px; font-size: 12px; text-align: left; }
    th { background: #eef2f7; color: #51637f; font-weight: 700; vertical-align: bottom; }
    td { color: #2b3d56; background: #fff; }
    .headcell { font-size: 11px; line-height: 1.15; }
    .center { text-align: center; }
    .num { text-align: right; font-weight: 700; }
    .muted { color: #7d8ca1; }
    .footerbar {
      padding: 10px 0 12px; text-align: center; color: #6f7f95; font-size: 11px;
    }
    .gear { position: absolute; right: 0; top: 320px; width: 36px; height: 36px; border-radius: 10px 0 0 10px; background: #a93c38; color: #fff; display: grid; place-items: center; }
    .tiny { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #c7d0dd; margin-right: 8px; vertical-align: middle; }
  </style>
</head>
<body>
  <div class="app">
    <div class="topbar">
      <div class="brand">Comart</div>
      <div class="circle">‹‹</div>
      <div class="search">Search</div>
      <div class="spacer"></div>
      <div class="icon"></div>
      <div class="icon"></div>
      <div style="margin-left:10px;color:#21324c;font-size:18px;">⌄</div>
    </div>
    <div class="layout">
      <aside class="sidebar">
        <div class="menu">
          <h4>Dashboard</h4>
          <div class="item">Admin Dashboard</div>
          <div class="item">WhatsApp Dashboard</div>
          <div class="item">Designer Dashboard</div>
          <div class="item">CS Dashboard</div>
          <div class="item">Timesheet</div>
          <div class="item">Timesheet Dashboard</div>
          <div class="item">Challan Dashboard</div>
          <div style="height: 10px;"></div>
          <div class="section"><span style="font-size:16px;">▣</span> Production <span class="caret">⌄</span></div>
          <div class="subitem active">Estimate / Job Card Creation</div>
          <div class="subitem">CS</div>
          <div class="subitem">Design</div>
          <div class="subitem">Printing</div>
          <div class="subitem">Lamination/Mounting &amp; Packing</div>
          <div class="subitem">Recce</div>
          <div class="subitem">Retail Customer</div>
          <div class="subitem">Pending Jobs With Hold</div>
          <div class="subitem">Delivery</div>
          <div class="subitem">Implementation</div>
          <div class="subitem">Invoice</div>
          <div class="subitem">All Invoices</div>
          <div class="subitem">Implementation Download</div>
          <div class="subitem">My Design Priority</div>
          <div class="item" style="margin-top: 12px;">Purchase</div>
          <div class="item">Finance</div>
          <div class="item">Master</div>
          <div class="item">Reports</div>
        </div>
      </aside>
      <main class="content">
        <div class="pagehead">
          <div>
            <div class="title">Existing Job</div>
            <div class="subtitle">Existing Job: J0626062390 - 21 salon/store(s) - 21 line(s) - Draft<br/>restored</div>
            <div style="margin-top:10px;"><button class="smallbtn secondary">Change Creation Type</button></div>
          </div>
          <div class="toolbar">
            <div class="tile"><div class="small">TOTAL SQ.F</div><div class="big">1,593.75</div></div>
            <button class="btn">＋ Add Row</button>
            <button class="btn disabled">✉ Send Mail</button>
            <button class="btn">⇪ Send to Production</button>
          </div>
        </div>

        <div class="panel">
          <div class="row1">
            <div class="actionrow2">
              <button class="smallbtn">💾 Draft</button>
              <button class="smallbtn">⧉ Copy Row</button>
              <button class="smallbtn">📋 Paste Row</button>
              <button class="smallbtn">▦ Paste from Excel</button>
              <button class="smallbtn red">🗑 Delete Row</button>
              <button class="smallbtn">⇩ PDF</button>
              <button class="smallbtn">💾 Save to Drafts</button>
            </div>
          </div>
          <div style="border-top:1px solid var(--line); padding: 10px 14px 12px;">
            <div style="font-size:12px; color:#50617c; margin-bottom:8px;">Job No</div>
            <div style="width: 500px; height: 38px; border:1px solid #d8e0ec; border-radius:6px; display:flex; align-items:center; padding:0 12px; color:#223452; background:#fff;">
              J0626062390 (Allana Consumer Products Private Limited (New GST))
              <div style="margin-left:auto; color:#b7c1d0;">×</div>
              <div style="margin-left:14px; color:#b7c1d0;">⌄</div>
            </div>
          </div>
          <div class="jobmeta">
            <div class="highlight">J0626062390</div>
            <div>Job Date: <span class="highlight">08-Jul-2026</span></div>
            <div>Client: <span class="highlight">Allana Consumer Products Private Limited (New GST)</span></div>
            <div class="unit">Unit: <select><option>Inch</option></select></div>
            <div>Sub Client: <span class="muted">-</span></div>
            <div>Business Type: <span class="muted">-</span></div>
            <div>PO No: <span class="muted">-</span></div>
            <div>PO Date: <span class="muted">-</span></div>
            <div>PO Type: <span class="muted">-</span></div>
            <div>Project: <span class="muted">-</span></div>
            <div>Created / Edited By: <span class="highlight">SHAILENDRA KUMAR TIWARI</span></div>
          </div>
          <div class="gridwrap">
            <table>
              <thead>
                <tr>
                  <th style="width:34px;"><div class="center">☐</div></th>
                  <th><div class="headcell">Description</div></th>
                  <th><div class="headcell">Salon / Store Name / City / Address</div></th>
                  <th><div class="headcell">Branding<br/>Location</div></th>
                  <th><div class="headcell">Production<br/>Location *</div></th>
                  <th><div class="headcell">Billing<br/>Location *</div></th>
                  <th><div class="headcell">Printing<br/>Machine</div></th>
                  <th><div class="headcell">Print Ready<br/>File</div></th>
                  <th><div class="headcell">Media</div></th>
                  <th><div class="headcell">Element<br/>Group</div></th>
                  <th><div class="headcell">Visual Code</div></th>
                  <th><div class="headcell">Qty</div></th>
                  <th><div class="headcell">Production<br/>Width</div></th>
                  <th><div class="headcell">Production<br/>Height</div></th>
                  <th><div class="headcell">Billing Width</div></th>
                  <th><div class="headcell">Billing<br/>Height</div></th>
                  <th><div class="headcell">Billable Sq.Ft</div></th>
                  <th><div class="headcell">Lamination</div></th>
                  <th><div class="headcell">Type of<br/>Lamination</div></th>
                  <th><div class="headcell">Mounting</div></th>
                  <th><div class="headcell">Type of<br/>Mounting</div></th>
                </tr>
              </thead>
              <tbody>
                ${Array.from({ length: 9 }).map((_, i) => `
                  <tr>
                    <td class="center">☐</td>
                    <td>Vinyl wit...</td>
                    <td>ALLANA CO...</td>
                    <td><span class="tiny"></span><span class="muted">Sel...</span></td>
                    <td><span class="tiny"></span><span class="muted">Req...</span></td>
                    <td><span class="tiny"></span><span class="muted">West</span></td>
                    <td><span class="muted">-</span></td>
                    <td><span class="muted">-</span></td>
                    <td><span class="muted">-</span></td>
                    <td><span class="muted">-</span></td>
                    <td class="center">${i === 0 ? "" : ""}</td>
                    <td class="center">5</td>
                    <td class="num">45</td>
                    <td class="num">${[100,100,100,100,100,100,100,100,100][i]}</td>
                    <td class="num">${[50,50,50,50,50,50,50,50,50][i]}</td>
                    <td class="num">100</td>
                    <td class="num">156.25</td>
                    <td><span class="muted">-</span></td>
                    <td><span class="muted">-</span></td>
                    <td><span class="muted">-</span></td>
                    <td><span class="muted">-</span></td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <div class="footerbar">Shortcuts: Ctrl+S Save - Ctrl+E PDF - Ctrl+C/V Copy/Paste - Ctrl+A Select All - Ctrl+X Delete - Alt+N Add Line - Esc Clear selection</div>
        <div class="gear">⚙</div>
      </main>
    </div>
  </div>
</body>
</html>`;
  }

  const sequences = {
    "estimate-step2": ["Estimate", "Continue"],
    "estimate-existing": ["Estimate", "Continue", "Existing", "Open Form"],
    "job-step2": ["Job Card Creation", "Continue"],
    "job-existing": ["Job Card Creation", "Continue", "Existing", "Open Form"],
  };
  const sequence = sequences[scenario] || [];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${scenario}</title>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #f4f6f9; }
    iframe { width: 100vw; height: 100vh; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe id="appFrame" src="/jobs"></iframe>
  <script>
    const clickText = (text) => {
      const frame = document.getElementById("appFrame");
      const doc = frame?.contentWindow?.document;
      if (!doc) return false;
      const candidates = [...doc.querySelectorAll("button, a")];
      const needle = String(text || "").toLowerCase();
      const target = candidates.find((el) => {
        const buttonLabel = String(el.querySelector("h1,h2,h3,strong")?.textContent || "").trim().toLowerCase();
        const textContent = String(el.textContent || "").trim().toLowerCase();
        if (needle === "continue") return textContent === "continue";
        if (buttonLabel) return buttonLabel === needle;
        return textContent.includes(needle);
      });
      if (target) {
        target.click();
        return true;
      }
      return false;
    };

    const sequence = ${JSON.stringify(sequence)};
    let step = 0;
    const timer = setInterval(() => {
      if (step >= sequence.length) {
        clearInterval(timer);
        return;
      }
      if (clickText(sequence[step])) {
        step += 1;
      }
    }, 800);
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURI((req.url || "/").split("?")[0]);

  if (requestPath.startsWith("/__capture/")) {
    const scenario = requestPath.replace("/__capture/", "").replace(/\.html$/i, "");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buildCapturePage(scenario));
    return;
  }

  let filePath = path.join(rootDir, requestPath);

  if (requestPath === "/" || requestPath === "") {
    filePath = path.join(rootDir, "index.html");
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return sendFile(res, filePath);
  }

  const indexPath = path.join(rootDir, "index.html");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  fs.createReadStream(indexPath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`SPA server running at http://127.0.0.1:${port}`);
});
