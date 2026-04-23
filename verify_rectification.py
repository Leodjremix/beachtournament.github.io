from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto('http://localhost:5173')
        time.sleep(2)

        page.evaluate("() => { window.localStorage.setItem('auth-storage', JSON.stringify({state: {userRole: 'admin'}})) }")

        page.goto('http://localhost:5173')
        time.sleep(2)

        # In a real app we'd need valid data, but here Firebase is dummy anyway so the user dashboard may not load.

        browser.close()

if __name__ == '__main__':
    run()
