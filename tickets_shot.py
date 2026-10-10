from playwright.sync_api import sync_playwright
BASE="http://localhost:3000"
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    errs=[]
    pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.goto(BASE+"/admin/login")
    pg.fill("input[type=email]","support@droovee.in"); pg.fill("input[type=password]","Admin#2026pass")
    pg.click("button[type=submit]"); pg.wait_for_timeout(1500)
    pg.goto(BASE+"/admin/tickets"); pg.wait_for_timeout(1500)
    pg.screenshot(path="/home/user/screens/13-admin-tickets.png", full_page=True)
    pg.click("text=TKT-"); pg.wait_for_timeout(500)
    pg.screenshot(path="/home/user/screens/14-admin-ticket-detail.png", full_page=True)
    print("ERRS", errs); b.close()
