import fs from "fs";
import path from "path";

const DIST_DIR = path.join(process.cwd(), "profreehost_dist");
const NEXT_STATIC = path.join(process.cwd(), ".next", "static");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const LOCAL_SERVER = "http://localhost:3000";

const ROUTES_TO_EXPORT = [
  { route: "/", filename: "index.html" },
  { route: "/movies", filename: "movies.html" },
  { route: "/series", filename: "series.html" },
  { route: "/anime", filename: "anime.html" },
  { route: "/trending", filename: "trending.html" },
  { route: "/search", filename: "search.html" },
  { route: "/login", filename: "login.html" },
  { route: "/register", filename: "register.html" },
  { route: "/watch/movie/27205", filename: "watch.html" },
  { route: "/profile", filename: "profile.html" },
  { route: "/my-list", filename: "my-list.html" },
  { route: "/history", filename: "history.html" },
];

function copyFolderRecursiveSync(source: string, target: string) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

async function buildProFreeHostDist() {
  console.log("=== BUILDING CHILLER PROFREEHOST DISTRIBUTION ===");

  // 1. Clean / create dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // 2. Copy Public Assets
  console.log("-> Copying public assets...");
  if (fs.existsSync(PUBLIC_DIR)) {
    copyFolderRecursiveSync(PUBLIC_DIR, DIST_DIR);
  }

  // 3. Copy Next.js Static Chunks & Styles to _next/static
  console.log("-> Copying .next/static to profreehost_dist/_next/static...");
  const targetNextStatic = path.join(DIST_DIR, "_next", "static");
  if (fs.existsSync(NEXT_STATIC)) {
    copyFolderRecursiveSync(NEXT_STATIC, targetNextStatic);
  } else {
    throw new Error(".next/static does not exist. Run 'npm run build' first!");
  }

  // 4. Fetch and bake static HTML pages from active server
  console.log("-> Fetching and baking pre-rendered HTML routes...");
  for (const { route, filename } of ROUTES_TO_EXPORT) {
    try {
      const res = await fetch(`${LOCAL_SERVER}${route}`);
      if (res.ok) {
        let html = await res.text();
        // Replace localhost API references with production backend or relative
        html = html.replace(/http:\/\/localhost:3000\/api/g, "https://streaming-chi-red.vercel.app/api");
        fs.writeFileSync(path.join(DIST_DIR, filename), html, "utf-8");
        console.log(`   ✓ Exported ${route} -> ${filename} (${(html.length / 1024).toFixed(1)} KB)`);
      } else {
        console.warn(`   ! Route ${route} returned status ${res.status}`);
      }
    } catch (err: any) {
      console.error(`   ✗ Error fetching route ${route}:`, err.message);
    }
  }

  // 5. Create .htaccess for Apache on ProFreeHost
  console.log("-> Generating production .htaccess for ProFreeHost...");
  const htaccessContent = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /

# 1. Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# 2. Transparently proxy /api/ requests to api_proxy.php
RewriteRule ^api/(.*)$ api_proxy.php [QSA,L]

# 3. Serve existing static files & directories directly
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# 4. Clean URL routing for pre-rendered pages
RewriteCond %{DOCUMENT_ROOT}/$1.html -f
RewriteRule ^([^/]+)/?$ $1.html [L]

# 5. Route dynamic paths
RewriteRule ^watch/(.*)$ watch.html [L]
RewriteRule ^movie/(.*)$ movies.html [L]
RewriteRule ^tv/(.*)$ series.html [L]
RewriteRule ^anime/(.*)$ anime.html [L]
RewriteRule ^genre/(.*)$ index.html [L]
RewriteRule ^category/(.*)$ index.html [L]
RewriteRule ^collection/(.*)$ index.html [L]

# 6. Fallback to index.html for SPA client-side hydration
RewriteRule ^ index.html [L]
</IfModule>

# MIME Types
<IfModule mod_mime.c>
AddType application/manifest+json .webmanifest
AddType application/javascript .js
AddType text/css .css
AddType image/svg+xml .svg
AddType font/woff2 .woff2
AddType application/vnd.apple.mpegurl .m3u8
AddType video/mp2t .ts
AddType text/vtt .vtt
</IfModule>

# Caching & Security Headers
<IfModule mod_headers.c>
<FilesMatch "\\.(js|css|woff2|png|jpg|jpeg|gif|svg|ico|webp)$">
    Header set Cache-Control "max-age=31536000, public, immutable"
</FilesMatch>
<FilesMatch "(sw\\.js|manifest\\.webmanifest|offline\\.html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
<FilesMatch "\\.html$">
    Header set Cache-Control "no-cache, must-revalidate"
</FilesMatch>
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
</IfModule>
`;
  fs.writeFileSync(path.join(DIST_DIR, ".htaccess"), htaccessContent, "utf-8");

  // 6. Create api_proxy.php for ProFreeHost
  console.log("-> Generating api_proxy.php bridge for ProFreeHost...");
  const apiProxyContent = `<?php
/**
 * CHILLER API BRIDGE FOR PROFREEHOST
 * Seamlessly forwards API requests to the production backend on Vercel.
 */

$backend_base = "https://streaming-chi-red.vercel.app";
$request_uri = $_SERVER['REQUEST_URI'] ?? '';

// Extract path after /api/
$path = preg_replace('#^/api/#', '', parse_url($request_uri, PHP_URL_PATH));
$query = parse_url($request_uri, PHP_URL_QUERY);
$target_url = $backend_base . "/api/" . $path . ($query ? "?" . $query : "");

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Handle CORS Preflight directly
if ($method === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token, Range");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400");
    http_response_code(204);
    exit;
}

$ch = curl_init($target_url);

// Forward request headers
$headers = [];
$incoming_headers = function_exists('getallheaders') ? getallheaders() : [];
foreach ($incoming_headers as $key => $value) {
    $lower = strtolower($key);
    if ($lower !== 'host' && $lower !== 'content-length') {
        $headers[] = "$key: $value";
    }
}
$headers[] = "X-Forwarded-Host: " . ($_SERVER['HTTP_HOST'] ?? 'chillerstream.unaux.com');
$headers[] = "X-Forwarded-Proto: https";

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

if ($method !== 'GET' && $method !== 'HEAD') {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$resp_headers = substr($response, 0, $header_size);
$resp_body = substr($response, $header_size);

// Set HTTP response code
if ($http_code > 0) {
    http_response_code($http_code);
}

// Forward response headers
$header_lines = explode("\\r\\n", $resp_headers);
foreach ($header_lines as $h) {
    if (strpos($h, ':') !== false) {
        $name = strtolower(trim(substr($h, 0, strpos($h, ':'))));
        if ($name !== 'transfer-encoding' && $name !== 'content-encoding') {
            header($h, false);
        }
    }
}

// Always ensure CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

echo $resp_body;
`;
  fs.writeFileSync(path.join(DIST_DIR, "api_proxy.php"), apiProxyContent, "utf-8");

  // 7. Audit file sizes against ProFreeHost 10 MB limit
  console.log("-> Auditing file sizes for ProFreeHost 10 MB limit...");
  let maxFileSize = 0;
  let maxFile = "";
  let totalFiles = 0;
  let totalBytes = 0;

  function auditDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        auditDir(fullPath);
      } else {
        totalFiles++;
        const stat = fs.statSync(fullPath);
        totalBytes += stat.size;
        if (stat.size > maxFileSize) {
          maxFileSize = stat.size;
          maxFile = path.relative(DIST_DIR, fullPath);
        }
        if (stat.size > 10 * 1024 * 1024) {
          console.error(`   ✗ FILE EXCEEDS 10 MB LIMIT: ${fullPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
        }
      }
    }
  }

  auditDir(DIST_DIR);

  console.log(`\n=== DISTRIBUTION SUMMARY ===`);
  console.log(`Total Files: ${totalFiles}`);
  console.log(`Total Size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Largest File: ${maxFile} (${(maxFileSize / 1024).toFixed(1)} KB)`);
  console.log(`10 MB Limit Check: ${maxFileSize < 10 * 1024 * 1024 ? "PASS ✓" : "FAIL ✗"}`);
  console.log(`Output Directory: ${DIST_DIR}`);
  console.log(`=== BUILD COMPLETE ===\n`);
}

buildProFreeHostDist().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
