
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Add a delay to wait for the server to start
        await asyncio.sleep(10)

        # Navigate to the operator view
        await page.goto("http://localhost:5173/operator")

        # Configure the machine
        await page.get_by_test_id("button-configure-machine").click()
        await page.get_by_test_id("input-passcode").fill("1234")
        await page.get_by_test_id("button-verify-passcode").click()
        await page.get_by_test_id("button-select-machine-1").click()

        # Start a batch
        await page.get_by_test_id("button-start-batch").click()
        await page.get_by_test_id("input-product-search").fill("Product A")
        await page.get_by_test_id("select-batch-product").click()
        await page.get_by_test_id("option-product-1").click()
        await page.get_by_test_id("input-planned-quantity").fill("100")
        await page.get_by_test_id("button-confirm-start-batch").click()

        # Click on a maintenance-required cause to lock the machine
        await page.get_by_test_id("button-cause-3").click()

        # Verify that the "Causas de Parada" section is not visible
        await expect(page.locator("h2:has-text('Causas de Parada')")).not_to_be_visible()

        # Verify that the resume button is visible and disabled
        resume_button = page.get_by_test_id("button-resume-production")
        await expect(resume_button).to_be_visible()
        await expect(resume_button).to_be_disabled()

        # At this point, you would need to simulate a `ticket_closed` event
        # via WebSocket to enable the resume button. This is complex to do
        # in a simple verification script, so we will manually take a screenshot
        # of the initial disabled state, which is the most critical part of the fix.

        # Take a screenshot of the locked screen
        await page.screenshot(path="jules-scratch/verification/locked_screen.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
