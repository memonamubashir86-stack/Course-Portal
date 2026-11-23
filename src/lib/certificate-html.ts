/**
 * Shared helper to render a professional certificate as a self-contained HTML
 * document. Used by the in-page preview route, the printable "PDF" route,
 * and the public verification route.
 */
export interface CertificateData {
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  templateTitle: string;
  bodyText: string;
  organizationName: string;
  appName: string;
  appLogoUrl?: string | null;
  universityName?: string | null;
  instructorName?: string | null;
  instructorSignatureUrl?: string | null;
  issueDate: string;
}

export function buildCertificateHtml(
  cert: CertificateData,
  opts: { forPrint?: boolean; backHref?: string } = {}
): string {
  const { forPrint = false, backHref } = opts;
  const appName = (cert.appName || cert.organizationName || "CourseLearn").trim();
  const universityName = cert.universityName?.trim() || null;
  const instructorName = cert.instructorName?.trim() || null;
  const appLogoUrl = cert.appLogoUrl || null;
  const instructorSignatureUrl = cert.instructorSignatureUrl || null;

  const appInitials =
    appName
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CL";

  // Escaper to prevent HTML injection from user-provided fields
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/\n/g, "<br/>");

  const escAttr = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const safeBackHref =
    backHref ||
    `/api/public/certificates/${encodeURIComponent(cert.certificateNumber)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(cert.templateTitle)} — ${esc(cert.studentName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: #F8FAFC;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #1E293B;
    min-height: 100%;
  }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    min-height: 100vh;
  }
  .toolbar {
    position: fixed; top: 12px; right: 12px;
    display: flex; gap: 8px;
    z-index: 20;
  }
  .toolbar button {
    background: #172554; color: #F8FAFC;
    border: none; border-radius: 8px;
    padding: 8px 14px; font-size: 13px; font-weight: 600;
    cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.12);
  }
  .toolbar button:hover { background: #0F766E; }
  .toolbar a.back {
    background: #FFFFFF; color: #172554;
    border: 1px solid #E2E8F0;
    text-decoration: none;
    display: inline-flex; align-items: center;
    border-radius: 8px; padding: 8px 14px;
    font-size: 13px; font-weight: 600;
  }
  .cert {
    width: 1000px; max-width: 100%;
    background: #FFFFFF;
    padding: 56px 64px;
    position: relative;
    box-shadow: 0 12px 40px rgba(15,23,42,0.12);
  }
  /* Outer + inner border frame */
  .cert::before {
    content: ""; position: absolute;
    inset: 16px;
    border: 2px solid #172554;
    pointer-events: none;
  }
  .cert::after {
    content: ""; position: absolute;
    inset: 22px;
    border: 1px solid #0F766E;
    pointer-events: none;
  }
  .corner {
    position: absolute; width: 64px; height: 64px;
    border: 2px solid #0F766E;
    pointer-events: none;
  }
  .corner.tl { top: 28px; left: 28px; border-right: none; border-bottom: none; }
  .corner.tr { top: 28px; right: 28px; border-left: none; border-bottom: none; }
  .corner.bl { bottom: 28px; left: 28px; border-right: none; border-top: none; }
  .corner.br { bottom: 28px; right: 28px; border-left: none; border-top: none; }

  .inner { position: relative; z-index: 1; text-align: center; }

  .brand-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
  }
  .org {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 6px 18px;
    border: 1px solid #E2E8F0;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(23,37,84,0.04), rgba(15,118,110,0.04));
    font-size: 13px; font-weight: 600;
    color: #172554;
    letter-spacing: 0.06em; text-transform: uppercase;
  }
  .org .dot {
    width: 8px; height: 8px; border-radius: 999px;
    background: #0F766E;
  }
  .seal {
    width: 36px; height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #172554; color: #F8FAFC;
    font-size: 16px; line-height: 1;
    font-weight: 700;
    font-family: 'Cormorant Garamond', serif;
    overflow: hidden;
  }
  .app-logo-img {
    width: 36px; height: 36px;
    border-radius: 8px;
    object-fit: contain;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    padding: 2px;
  }
  .uni-badge {
    font-size: 13px;
    font-weight: 600;
    color: #0F766E;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .heading {
    font-family: 'Cormorant Garamond', serif;
    font-size: 46px; font-weight: 700;
    color: #172554;
    letter-spacing: 0.02em;
    margin: 0 0 6px;
  }
  .subtitle {
    font-size: 13px; font-weight: 500;
    color: #64748B; letter-spacing: 0.16em;
    text-transform: uppercase; margin-bottom: 28px;
  }
  .divider {
    width: 80px; height: 3px;
    background: linear-gradient(90deg, #172554, #0F766E);
    margin: 0 auto 28px;
    border-radius: 999px;
  }
  .label {
    font-size: 12px; color: #64748B;
    text-transform: uppercase; letter-spacing: 0.18em;
    margin-bottom: 8px;
  }
  .name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 52px; font-weight: 600;
    color: #0F766E;
    margin: 0 0 8px;
    line-height: 1.1;
  }
  .name-underline {
    width: 420px; max-width: 90%;
    height: 1px; margin: 0 auto 28px;
    background: linear-gradient(90deg, transparent, #CBD5E1, transparent);
  }
  .body-text {
    font-size: 15px; line-height: 1.7;
    color: #334155; max-width: 720px;
    margin: 0 auto 28px;
  }
  .course {
    font-family: 'Inter', sans-serif;
    font-size: 22px; font-weight: 700;
    color: #172554;
    margin: 0 0 28px;
  }
  .meta {
    display: flex; justify-content: space-between;
    align-items: flex-end;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px dashed #E2E8F0;
    gap: 24px;
  }
  .meta-block { text-align: left; flex: 1; }
  .meta-block.center { text-align: center; flex: 1.15; }
  .meta-block.right { text-align: right; }
  .meta-label {
    font-size: 10px; color: #64748B;
    text-transform: uppercase; letter-spacing: 0.16em;
    margin: 0 0 4px;
  }
  .meta-value { font-size: 14px; color: #172554; font-weight: 600; margin: 0; }
  .sig-wrap {
    height: 58px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 6px;
  }
  .sig-img {
    max-height: 54px;
    max-width: 190px;
    object-fit: contain;
    display: block;
  }
  .signature-line {
    border-top: 1px solid #1E293B;
    width: 210px; max-width: 100%;
    margin: 0 auto;
    padding-top: 6px;
    font-size: 13px; color: #1E293B;
    font-weight: 600;
  }
  .sig-role {
    font-size: 10px;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    margin-top: 2px;
  }
  .cert-id {
    margin-top: 24px;
    font-size: 11px; color: #94A3B8;
    letter-spacing: 0.18em; text-transform: uppercase;
  }
  .verify-note {
    margin-top: 8px;
    font-size: 11px; color: #64748B;
    font-style: italic;
  }
  @media print {
    body { background: #FFFFFF; padding: 0; min-height: auto; }
    .toolbar { display: none; }
    .cert { box-shadow: none; width: 100%; padding: 48px; }
    @page { size: landscape; margin: 12mm; }
  }
</style>
</head>
<body>
  ${
    forPrint
      ? `<div class="toolbar">
           <a class="back" href="${escAttr(safeBackHref)}">← Back</a>
           <button onclick="window.print()">Save as PDF</button>
         </div>`
      : ``
  }
  <div class="cert" role="img" aria-label="Certificate of completion for ${esc(
    cert.studentName
  )}">
    <span class="corner tl"></span>
    <span class="corner tr"></span>
    <span class="corner bl"></span>
    <span class="corner br"></span>
    <div class="inner">
      <div class="brand-row">
        <div class="org">
          ${
            appLogoUrl
              ? `<img src="${escAttr(appLogoUrl)}" alt="${escAttr(appName)} logo" class="app-logo-img" />`
              : `<span class="seal">${esc(appInitials)}</span>`
          }
          <span>${esc(appName)}</span>
          <span class="dot"></span>
        </div>
        ${
          universityName
            ? `<div class="uni-badge" data-cert-university="true">${esc(universityName)}</div>`
            : ``
        }
      </div>

      <h1 class="heading">${esc(cert.templateTitle)}</h1>
      <p class="subtitle">This document is proudly presented to</p>
      <div class="divider"></div>
      <p class="label">Recipient</p>
      <p class="name">${esc(cert.studentName)}</p>
      <div class="name-underline"></div>
      <p class="body-text">${esc(cert.bodyText)}</p>
      <p class="label">Completed Course</p>
      <p class="course">${esc(cert.courseTitle)}</p>

      <div class="meta">
        <div class="meta-block">
          <p class="meta-label">Issue Date</p>
          <p class="meta-value">${esc(cert.issueDate)}</p>
          ${
            universityName
              ? `<p class="meta-label" style="margin-top:14px;">University</p>
                 <p class="meta-value">${esc(universityName)}</p>`
              : `<p class="meta-label" style="margin-top:14px;">Issued By</p>
                 <p class="meta-value">${esc(cert.organizationName || appName)}</p>`
          }
        </div>

        <div class="meta-block center">
          <div class="sig-wrap">
            ${
              instructorSignatureUrl
                ? `<img src="${escAttr(
                    instructorSignatureUrl
                  )}" alt="Instructor electronic signature" class="sig-img" />`
                : ``
            }
          </div>
          <div class="signature-line">${esc(
            instructorName || "Authorized Instructor"
          )}</div>
          <div class="sig-role">Course Instructor</div>
        </div>

        <div class="meta-block right">
          <p class="meta-label">Certificate Number</p>
          <p class="meta-value">${esc(cert.certificateNumber)}</p>
          <p class="meta-label" style="margin-top:14px;">Platform</p>
          <p class="meta-value">${esc(appName)}</p>
        </div>
      </div>

      <p class="cert-id">Certificate ID: ${esc(cert.certificateNumber)}</p>
      <p class="verify-note">Verify the authenticity of this certificate at ${esc(
        appName
      )} by referencing the certificate number above.</p>
    </div>
  </div>
</body>
</html>`;
}
