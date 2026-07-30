import { chromium } from 'playwright-core'

const BASE = 'http://localhost:4182/Workout-App/'
const log = []
const t0 = Date.now()
const stamp = (m) => log.push(`${String(Date.now() - t0).padStart(5)}ms  ${m}`)

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
})
const ctx = await browser.newContext()

// Record each document execution of the app bundle.
await ctx.addInitScript(() => {
  const n = Number(sessionStorage.getItem('__loads') || '0') + 1
  sessionStorage.setItem('__loads', String(n))
  console.log(`[DOC ${n}] url=${location.href} controller=${!!navigator.serviceWorker?.controller}`)
  navigator.serviceWorker?.addEventListener('controllerchange', () =>
    console.log(`[DOC ${n}] controllerchange url=${location.href}`),
  )
  window.addEventListener('pagehide', () => console.log(`[DOC ${n}] pagehide`))
})

const page = await ctx.newPage()
page.on('console', (m) => stamp(`console: ${m.text()}`))
page.on('pageerror', (e) => stamp(`pageerror: ${e.message}`))
page.on('framenavigated', (f) => { if (!f.parentFrame()) stamp(`navigated: ${f.url()}`) })

// Mock the Supabase token endpoint; slow enough to observe a mid-flight reload.
await ctx.route('**/auth/v1/**', async (route) => {
  const req = route.request()
  stamp(`--> SUPABASE ${req.method()} ${req.url()}`)
  stamp(`    body: ${req.postData() ?? '(none)'}`)
  await new Promise((r) => setTimeout(r, 1500))
  stamp(`<-- SUPABASE responding`)
  await route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'invalid_grant', error_description: 'mock: code not real' }),
  })
})

stamp('=== goto ?code=fake on a BRAND NEW profile (no SW installed yet) ===')
await page.goto(`${BASE}?code=fake`, { waitUntil: 'load' })
await page.waitForTimeout(6000)

stamp(`final url: ${page.url()}`)
stamp(`document loads: ${await page.evaluate(() => sessionStorage.getItem('__loads'))}`)
stamp(`visible text: ${JSON.stringify((await page.locator('#root').innerText()).slice(0, 400))}`)
stamp(`localStorage keys: ${JSON.stringify(await page.evaluate(() => Object.keys(localStorage)))}`)

console.log(log.join('\n'))
await browser.close()
