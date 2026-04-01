const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const username =
  process.env.MINIBO_SMOKE_USERNAME ??
  process.env.MINIBO_ADMIN_USERNAME ??
  (process.env.NODE_ENV === "production" ? "" : "admin");
const password =
  process.env.MINIBO_SMOKE_PASSWORD ??
  process.env.MINIBO_ADMIN_PASSWORD ??
  (process.env.NODE_ENV === "production" ? "" : "1234");

if (!username || !password) {
  throw new Error("Missing smoke test credentials. Set MINIBO_SMOKE_USERNAME and MINIBO_SMOKE_PASSWORD.");
}

const getJson = async (path, cookie) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { Cookie: cookie } : undefined
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`);
  }

  return response.json();
};

const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ username, password })
});

if (!loginResponse.ok) {
  const payload = await loginResponse.json().catch(() => ({}));
  throw new Error(payload.message ?? `Login failed with status ${loginResponse.status}`);
}

const setCookieHeader = loginResponse.headers.get("set-cookie");
if (!setCookieHeader) {
  throw new Error("Authentication cookie was not returned by /api/auth/login");
}

const authCookie = setCookieHeader.split(";")[0];
const storePayload = await getJson("/api/store", authCookie);
const statusPayload = await getJson("/api/system/storage-status", authCookie);

const sessions = storePayload.store?.sessions ?? [];
const selectedSession =
  sessions.find((item) => item.status === "submitted" || item.status === "approved") ?? sessions[0];

if (!selectedSession) {
  throw new Error("No session is available for export smoke testing");
}

const excelResponse = await fetch(
  `${baseUrl}/api/reports/approval/excel?sessionId=${encodeURIComponent(selectedSession.id)}`,
  {
    headers: {
      Cookie: authCookie
    }
  }
);

if (!excelResponse.ok) {
  throw new Error(`Excel export failed with status ${excelResponse.status}`);
}

const pdfResponse = await fetch(
  `${baseUrl}/api/reports/approval/pdf?sessionId=${encodeURIComponent(selectedSession.id)}`,
  {
    headers: {
      Cookie: authCookie
    }
  }
);

if (!pdfResponse.ok) {
  throw new Error(`PDF export failed with status ${pdfResponse.status}`);
}

const excelContentType = excelResponse.headers.get("content-type") ?? "";
const pdfContentType = pdfResponse.headers.get("content-type") ?? "";

if (!excelContentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
  throw new Error(`Unexpected Excel content type: ${excelContentType}`);
}

if (!pdfContentType.includes("application/pdf")) {
  throw new Error(`Unexpected PDF content type: ${pdfContentType}`);
}

const excelBytes = new Uint8Array(await excelResponse.arrayBuffer());
const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      user: username,
      storageBackend: statusPayload.backend,
      storageHealthy: statusPayload.healthy,
      sessionId: selectedSession.id,
      excelBytes: excelBytes.byteLength,
      pdfBytes: pdfBytes.byteLength
    },
    null,
    2
  )
);
