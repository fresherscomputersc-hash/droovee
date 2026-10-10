import json, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUT = "/home/user/screens"
import os
os.makedirs(OUT, exist_ok=True)
errors = []

def shot(page, name):
    page.wait_for_timeout(600)
    page.screenshot(path=f"{OUT}/{name}.png", full_page=True)
    print("shot", name, page.url)

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(f"{page.url} console.{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"{page.url} pageerror: {e}"))

    # Public landing
    page.goto(BASE + "/")
    page.wait_for_load_state("networkidle")
    shot(page, "01-landing")

    # Admin login as operations
    page.goto(BASE + "/admin/login")
    page.fill("input[type=email]", "ops@droovee.in")
    page.fill("input[type=password]", "Admin#2026pass")
    page.click("button[type=submit]")
    page.wait_for_url(BASE + "/admin", timeout=15000)
    page.wait_for_load_state("networkidle")
    shot(page, "02-admin-dashboard-ops")

    page.goto(BASE + "/admin/bookings")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)
    shot(page, "03-admin-bookings")

    # Open first booking detail
    link = page.locator("a[href^='/admin/bookings/']").first
    if link.count():
        link.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        shot(page, "04-admin-booking-detail")

    # Owner sees pricing/staff/audit; check nav per role
    page.goto(BASE + "/admin/pricing")
    page.wait_for_load_state("networkidle")
    shot(page, "05-admin-pricing-ops-view")

    # Customer journey
    page.goto(BASE + "/register")
    page.wait_for_load_state("networkidle")
    stamp = str(int(time.time()*1000))[-8:]
    page.fill("input >> nth=0", "Priya Mohanty")
    page.fill("input >> nth=1", f"98{stamp}")
    page.fill("input >> nth=2", f"priya{stamp}@example.com")
    page.fill("input[type=password] >> nth=0", "Priya-pass-2026")
    page.fill("input[type=password] >> nth=1", "Priya-pass-2026")
    shot(page, "06-register-filled")
    page.click("button[type=submit]")
    page.wait_for_url(BASE + "/book", timeout=15000)
    page.wait_for_load_state("networkidle")
    shot(page, "07-book-empty")

    page.select_option("select >> nth=0", "outstation_round_trip")
    page.wait_for_timeout(500)
    shot(page, "08-book-outstation")

    page.select_option("select >> nth=0", "hourly")
    page.wait_for_timeout(500)
    page.fill("input[placeholder='LAUNCH99']", "LAUNCH99")
    page.fill("textarea >> nth=0", "Plot 12, Jayadev Vihar, Bhubaneswar")
    page.fill("input[placeholder='e.g. Maruti Swift']", "Maruti Swift")
    page.wait_for_timeout(900)
    shot(page, "09-book-hourly-estimate")

    page.click("button[type=submit]")
    try:
        page.wait_for_url("**/bookings/**", timeout=15000)
    except Exception:
        shot(page, "10-booking-FAILED")
        print("ALERT:", page.locator("[role=alert]").all_inner_texts())
        print("FIELD ERRORS:", page.locator("span.text-rose-600").all_inner_texts())
        raise
    page.wait_for_load_state("networkidle")
    shot(page, "10-booking-confirmation")

    page.goto(BASE + "/bookings")
    page.wait_for_load_state("networkidle")
    shot(page, "11-my-bookings")

    # Finance: no assign button, reports visible
    ctx2 = browser.new_context(viewport={"width": 1280, "height": 900})
    p2 = ctx2.new_page()
    p2.on("pageerror", lambda e: errors.append(f"finance pageerror: {e}"))
    p2.goto(BASE + "/admin/login")
    p2.fill("input[type=email]", "finance@droovee.in")
    p2.fill("input[type=password]", "Admin#2026pass")
    p2.click("button[type=submit]")
    p2.wait_for_url(BASE + "/admin", timeout=15000)
    p2.goto(BASE + "/admin/payments")
    p2.wait_for_load_state("networkidle")
    p2.wait_for_timeout(800)
    shot(p2, "12-finance-reports")

    browser.close()

print("ERRORS:")
for e in errors:
    print(" -", e[:300])
