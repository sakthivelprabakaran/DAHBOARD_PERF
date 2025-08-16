from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto("http://localhost:3000")

            # Wait for the login screen to be visible
            expect(page.locator("#loginScreen")).to_be_visible()

            # Fill in the username
            page.get_by_label("Amazon Username").fill("L2User")
            page.get_by_label("Password").fill("password") # The API doesn't check passwords, but the field is there

            # Click the sign in button
            page.get_by_role("button", name="Sign In").click()

            # Wait for the main menu to appear
            main_menu_header = page.get_by_role("heading", name="Welcome, L2User")
            expect(main_menu_header).to_be_visible()

            # Take a screenshot
            page.screenshot(path="jules-scratch/verification/verification.png")

            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")

        finally:
            browser.close()

if __name__ == "__main__":
    run()
