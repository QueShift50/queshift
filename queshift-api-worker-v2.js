const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyOTDyjMh1tz3Lho6wnWprB_DdZtf9MC-ONyux3n-ezh8M1OLHbj5tXuonkzNVwckrCXQ/exec";
const WORKER_BUILD = "V18-WORKER-MANUAL-REDIRECT";

const ALLOWED_ORIGINS = new Set([
  "https://queshift.in",
  "https://www.queshift.in"
]);

const PUBLIC_CACHE_SECONDS = 30;

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://queshift.in";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(obj, status, cors, extra) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(extra || {})
    }
  });
}

function isCacheablePublicGet(url, request) {
  if (request.method !== "GET") return false;
  const action = url.searchParams.get("action") || "publicData";
  return ["publicData","blogs","blog","helpArticles","helpArticle","health","trialConfig"].includes(action);
}

async function fetchWithTimeout(url, init, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/*
  Apps Script ContentService does not return the JSON body directly from
  script.google.com. Google responds with a redirect to a one-time
  script.googleusercontent.com URL.

  For POST requests we handle that redirect explicitly:
    1) POST to script.google.com with redirect:"manual"
    2) read Location
    3) GET the one-time googleusercontent URL
  This avoids ambiguous automatic POST/302 redirect behaviour.
*/
async function googleAppsFetch(targetUrl, method, body, contentType) {
  const firstHeaders = {
    "User-Agent": "Queshift-Cloudflare-Bridge/2.0",
    "Accept": "application/json,text/plain,*/*"
  };
  if (contentType) firstHeaders["Content-Type"] = contentType;

  const first = await fetchWithTimeout(
    targetUrl,
    {
      method,
      body: method === "POST" ? body : undefined,
      headers: firstHeaders,
      redirect: "manual"
    },
    method === "POST" ? 55000 : 30000
  );

  if (first.status >= 300 && first.status < 400) {
    const location = first.headers.get("Location");
    if (!location) {
      throw new Error("Google Apps Script redirect did not include a Location header.");
    }

    const redirected = new URL(location, targetUrl).toString();

    // ContentService redirect target is a read-only one-time response URL.
    return await fetchWithTimeout(
      redirected,
      {
        method: "GET",
        headers: {
          "User-Agent": "Queshift-Cloudflare-Bridge/2.0",
          "Accept": "application/json,text/plain,*/*"
        },
        redirect: "follow"
      },
      30000
    );
  }

  return first;
}

export default {
  async fetch(request, env, ctx) {
    const incoming = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Worker-only diagnostic: confirms the deployed Worker version.
    if (incoming.pathname === "/__diag") {
      return jsonResponse(
        { ok:true, worker:WORKER_BUILD, time:new Date().toISOString() },
        200,
        cors
      );
    }

    // Full POST diagnostic: Worker -> Apps Script doPost -> ContentService redirect.
    if (incoming.pathname === "/__posthealth") {
      const body = new URLSearchParams();
      body.set("action", "postHealth");
      body.set("payload", "{}");
      body.set("credential", "");

      try {
        const upstream = await googleAppsFetch(
          APPS_SCRIPT_URL,
          "POST",
          new TextEncoder().encode(body.toString()),
          "application/x-www-form-urlencoded;charset=UTF-8"
        );
        const text = await upstream.text();
        return new Response(text, {
          status: upstream.status,
          headers: {
            ...cors,
            "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Queshift-Worker": WORKER_BUILD
          }
        });
      } catch (error) {
        return jsonResponse(
          { ok:false, worker:WORKER_BUILD, message:String(error && error.message || error) },
          502,
          cors
        );
      }
    }

    if (!["GET","POST"].includes(request.method)) {
      return jsonResponse({ ok:false, message:"Method not allowed." }, 405, cors);
    }

    const target = new URL(APPS_SCRIPT_URL);
    incoming.searchParams.forEach((value, key) => {
      if (key !== "callback") target.searchParams.append(key, value);
    });

    const cacheable = isCacheablePublicGet(incoming, request);
    const cache = caches.default;
    const cacheKey = new Request(incoming.toString(), { method:"GET" });

    if (cacheable) {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const headers = new Headers(hit.headers);
        Object.entries(cors).forEach(([k,v]) => headers.set(k,v));
        headers.set("X-Queshift-Proxy", "HIT");
        headers.set("X-Queshift-Worker", WORKER_BUILD);
        return new Response(hit.body, { status:hit.status, headers });
      }
    }

    try {
      let body = null;
      let contentType = "";
      if (request.method === "POST") {
        contentType = request.headers.get("Content-Type") || "application/x-www-form-urlencoded;charset=UTF-8";
        body = new Uint8Array(await request.arrayBuffer());
      }

      const upstream = await googleAppsFetch(
        target.toString(),
        request.method,
        body,
        contentType
      );

      const responseBody = await upstream.arrayBuffer();
      const headers = new Headers(cors);
      headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json; charset=utf-8");
      headers.set("Cache-Control", cacheable ? `public, max-age=${PUBLIC_CACHE_SECONDS}` : "no-store");
      headers.set("X-Queshift-Proxy", "MISS");
      headers.set("X-Queshift-Worker", WORKER_BUILD);

      const response = new Response(responseBody, {
        status: upstream.status,
        headers
      });

      if (cacheable && upstream.ok) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;

    } catch (error) {
      return jsonResponse(
        {
          ok:false,
          message:"Queshift backend proxy could not reach Google Apps Script.",
          worker:WORKER_BUILD,
          detail:String(error && error.message || error)
        },
        502,
        cors
      );
    }
  }
};
