import { chromium } from 'playwright-core'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const SP = '/tmp/claude-0/-home-user-Workout-App/34481eee-ddd3-5f28-9930-305efcb9601f/scratchpad'
const DIST_NEW = `${SP}/dist_new`
const DIST_OLD = `${SP}/dist_old`
const PORT = 4182
const BASE = `http://localhost:${PORT}/Workout-App/`

let serveDir = DIST_NEW
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  let p = url.pathname
  if (!p.startsWith('/Workout-App/')) { res.writeHead(404).end('nope'); return }
  let rel = p.slice('/Workout-App/'.length) || 'index.html'
  const file = path.join(serveDir, rel)
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // GitHub Pages behaviour: an unknown path 404s. Old hashed assets are gone
    // after a deploy, so this is what a stale chunk request would really get.
    res.writeHead(404, { 'content-type': 'text/plain' }).end('404')
    return
  }
  const ext = path.extname(file)
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': rel === 'sw.js' || rel === 'index.html' ? 'no-cache' : 'max-age=31536000',
  })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(PORT, r))

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
})

const out = []
const say = (m) => { out.push(m); process.stdout.write(m + '\n') }

async function newCtx() {
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => {
    const n = Number(sessionStorage.getItem('__loads') || '0') + 1
    sessionStorage.setItem('__loads', String(n))
    console.log(`[DOC${n}] url=${location.href} controlled=${!!navigator.serviceWorker?.controller}`)
    navigator.serviceWorker?.addEventListener('controllerchange', () =>
      console.log(`[DOC${n}] controllerchange`))
  })
  await ctx.route('**/*.supabase.co/**', async (route) => {
    const req = route.request()
    say(`      NET ${req.method()} ${req.url().replace(/https:\/\/[^/]+/, '<supabase>')}`)
    await new Promise((r) => setTimeout(r, 1200)) // widen the race window
    await route.fulfill({
      status: 400, contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'mock backend' }),
    })
  })
  return ctx
}

function attach(page, tag) {
  page.on('console', (m) => say(`      ${tag} console: ${m.text().slice(0, 220)}`))
  page.on('pageerror', (e) => say(`      ${tag} pageerror: ${e.message.slice(0, 220)}`))
  page.on('requestfailed', (r) => say(`      ${tag} reqfail: ${r.url().split('/').pop()} ${r.failure()?.errorText}`))
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/Workout-App/')) say(`      ${tag} HTTP ${r.status()} ${r.url()}`) })
}

async function report(page, label) {
  const loads = await page.evaluate(() => sessionStorage.getItem('__loads'))
  const txt = (await page.locator('#root').innerText().catch(() => '<no #root>')).replace(/\s+/g, ' ').slice(0, 260)
  const sw = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations()
    const keys = await caches.keys()
    const c = keys.length ? await caches.open(keys[0]) : null
    const cached = c ? (await c.keys()).map((r) => r.url.split('/').pop()).filter((u) => u.endsWith('.js')) : []
    return { regs: regs.length, controller: !!navigator.serviceWorker.controller, caches: keys, cachedJs: cached }
  })
  say(`   RESULT ${label}`)
  say(`     url         : ${page.url()}`)
  say(`     doc loads   : ${loads}`)
  say(`     cached js   : ${sw.cachedJs.join(', ')}`)
  say(`     screen text : ${txt}`)
}

async function waitForSw(page) {
  // The old build reloads itself on first install, which destroys the execution
  // context mid-evaluate; retry until it settles.
  for (let i = 0; i < 6; i++) {
    try {
      const st = await page.evaluate(async () => {
        const r = await navigator.serviceWorker.ready
        return r.active?.state
      })
      if (st === 'activated') { await page.waitForTimeout(1500); return }
    } catch { /* navigated */ }
    await page.waitForTimeout(1000)
  }
}

// ---------------------------------------------------------------- scenarios
const urls = {
  pkce: '?code=fakecode123',
  implicit: '#access_token=abc&refresh_token=def',
  linkerr: '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
}

for (const [name, suffix] of Object.entries(urls)) {
  serveDir = DIST_NEW
  const ctx = await newCtx()
  const page = await ctx.newPage()
  attach(page, name)
  say(`\n=== S1.${name}  FRESH profile, new build, ${suffix}`)
  await page.goto(BASE + suffix, { waitUntil: 'load' })
  await page.waitForTimeout(5000)
  await report(page, `fresh / ${name}`)
  await ctx.close()
}

// S2: user already has the OLD (buggy) build installed; new build is deployed.
for (const [name, suffix] of Object.entries(urls)) {
  serveDir = DIST_OLD
  const ctx = await newCtx()
  const page = await ctx.newPage()
  attach(page, `old-${name}`)
  say(`\n=== S2.${name}  OLD build already installed, then NEW build deployed, ${suffix}`)
  await page.goto(BASE, { waitUntil: 'load' })
  await waitForSw(page)
  say(`   (old sw installed; swapping the served build to the fixed one)`)
  serveDir = DIST_NEW
  await page.evaluate(() => sessionStorage.setItem('__loads', '0'))
  await page.goto(BASE + suffix, { waitUntil: 'load' })
  await page.waitForTimeout(6000)
  await report(page, `post-deploy / ${name}`)
  await ctx.close()
}

// S3: new build installed, then ANOTHER new build deployed, magic link clicked.
{
  // make a v2 of the new build by copying and renaming the entry chunk
  const V2 = `${SP}/dist_new2`
  fs.rmSync(V2, { recursive: true, force: true })
  fs.cpSync(DIST_NEW, V2, { recursive: true })
  const entry = fs.readdirSync(`${V2}/assets`).find((f) => f.startsWith('index-') && f.endsWith('.js') && fs.statSync(`${V2}/assets/${f}`).size > 300000)
  const v2name = entry.replace('index-', 'index-v2')
  fs.renameSync(`${V2}/assets/${entry}`, `${V2}/assets/${v2name}`)
  for (const f of ['index.html', 'sw.js']) {
    fs.writeFileSync(`${V2}/${f}`, fs.readFileSync(`${V2}/${f}`, 'utf8').split(entry).join(v2name))
  }
  // bump the sw revision so the browser sees a byte difference
  fs.appendFileSync(`${V2}/sw.js`, '\n// v2\n')

  serveDir = DIST_NEW
  const ctx = await newCtx()
  const page = await ctx.newPage()
  attach(page, 'upd')
  say(`\n=== S3  NEW build installed, then a LATER build deployed, ?code=`)
  await page.goto(BASE, { waitUntil: 'load' })
  await waitForSw(page)
  serveDir = V2
  await page.evaluate(() => sessionStorage.setItem('__loads', '0'))
  await page.goto(BASE + urls.pkce, { waitUntil: 'load' })
  await page.waitForTimeout(6000)
  await report(page, 'update-during-auth')
  // Does the page still hold a usable app? probe the lazily imported chunk.
  const probe = await page.evaluate(async () => {
    const r = await fetch('/Workout-App/assets/index-Xbuit-zV.js')
    return { status: r.status }
  })
  say(`     vendor chunk fetch after update: HTTP ${probe.status}`)
  await ctx.close()
}

console.log(out.join('\n'))
await browser.close()
server.close()
