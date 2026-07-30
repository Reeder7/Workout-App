import { chromium } from 'playwright-core'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const SP = '/tmp/claude-0/-home-user-Workout-App/34481eee-ddd3-5f28-9930-305efcb9601f/scratchpad'
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
}
function serve(dir, port) {
  const server = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname
    if (!p.startsWith('/Workout-App/')) { res.writeHead(404).end('nope'); return }
    const rel = p.slice('/Workout-App/'.length) || 'index.html'
    const file = path.join(dir, rel)
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end('404'); return }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((r) => server.listen(port, () => r(server)))
}

const sPre = await serve(`${SP}/dist_pre`, 4191)
const sHead = await serve(`${SP}/dist_head`, 4192)

const URLS = [
  ['/', ''],
  ['?code=fake', '?code=fake'],
  ['#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer', '#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer'],
  ['#access_token=abc', '#access_token=abc'],
  ['#refresh_token=def', '#refresh_token=def'],
  ['#type=recovery', '#type=recovery'],
  ['#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'],
  ['#error=server_error&error_code=unexpected_failure', '#error=server_error&error_code=unexpected_failure'],
  ['#/train', '#/train'],
  ['#/feed', '#/feed'],
  ['#/session/123', '#/session/123'],
  ['#/plans/abc/edit', '#/plans/abc/edit'],
  ['#/settings/profile', '#/settings/profile'],
  ['#/library/squat', '#/library/squat'],
  ['#/index.html', '#/index.html'],
  ['#/Workout-App/', '#/Workout-App/'],
  ['#//plans', '#//plans'],
  ['#/%2Fplans', '#/%2Fplans'],
  ['?code=fake#/join', '?code=fake#/join'],
  ['#/plans', '#/plans'],
  ['#/settings/', '#/settings/'],
  ['#/Plans', '#/Plans'],
  ['#access_token=abc&type=recovery', '#access_token=abc&type=recovery'],
  // extra adversarial shapes the claim did not test
  ['#error=access_denied#/plans', '#error=access_denied#/plans'],
  ['#/join?error=access_denied&error_code=otp_expired', '#/join?error=access_denied&error_code=otp_expired'],
  ['#access_token=abc&refresh_token=def (then in-app nav)', '#access_token=abc&refresh_token=def'],
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
})

async function run(port, label) {
  const rows = []
  for (const [name, suffix] of URLS) {
    const ctx = await browser.newContext()
    await ctx.route('**/*.supabase.co/**', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'mock backend' }) }))
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 120)))
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)) })
    try {
      await page.goto(`http://localhost:${port}/Workout-App/${suffix}`, { waitUntil: 'load', timeout: 20000 })
      await page.waitForTimeout(2500)
      const r = await page.evaluate(() => {
        const root = document.getElementById('root')
        const kids = [...root.children]
        const nonTab = kids.filter((c) => !c.className.includes('tabbar'))
        return {
          children: kids.map((c) => c.className || c.tagName.toLowerCase()).join('|'),
          text: nonTab.map((c) => c.innerText || '').join(' ').replace(/\s+/g, ' ').trim().slice(0, 150),
          url: location.href.replace(/^http:\/\/[^/]+/, ''),
        }
      })
      const blank = r.text === ''
      rows.push({ name, blank, children: r.children, text: r.text, url: r.url, errs: errs.length })
    } catch (e) {
      rows.push({ name, blank: 'ERR', children: String(e).slice(0, 80), text: '', url: '', errs: errs.length })
    }
    await ctx.close()
  }
  console.log(`\n########## ${label} ##########`)
  for (const r of rows) {
    console.log(`${r.blank === true ? 'BLANK ' : r.blank === 'ERR' ? 'ERROR ' : 'ok    '} ${r.name}`)
    console.log(`        children=[${r.children}] url=${r.url} consoleErrs=${r.errs}`)
    console.log(`        text="${r.text}"`)
  }
  return rows
}

const pre = await run(4191, 'PRE-FIX BUILD (commit 1761f0f)')
const head = await run(4192, 'HEAD BUILD (commit 26b35ba + working tree)')

console.log('\n===== SUMMARY =====')
console.log(`pre-fix blanks : ${pre.filter((r) => r.blank === true).length}/${pre.length}`)
console.log(`HEAD blanks    : ${head.filter((r) => r.blank === true).length}/${head.length}`)
console.log('HEAD blank cases: ' + head.filter((r) => r.blank === true).map((r) => r.name).join(' , '))

await browser.close()
sPre.close(); sHead.close()
