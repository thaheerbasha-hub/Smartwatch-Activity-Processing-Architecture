#!/usr/bin/env python3
"""
Technical Report PDF Generator for Smartwatch Activity Processing Architecture
Reads report_template.html and compiles to PDF via Playwright Chromium.
"""

import os
import sys
import base64
import asyncio
import shutil
from playwright.async_api import async_playwright

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_PATH = os.path.join(BASE_DIR, 'report_template.html')
SCREENSHOT_PATH = os.path.join(BASE_DIR, 'verified_screenshot.png')
OUTPUT_PDF = os.path.join(BASE_DIR, 'Smartwatch_COA_Architecture_Report.pdf')
DOCS_DIR = r'C:\Users\thahe\OneDrive\Documents'
DOCS_PDF = os.path.join(DOCS_DIR, 'Smartwatch_COA_Architecture_Report.pdf')

def get_base64_image(image_path):
    if os.path.exists(image_path):
        with open(image_path, 'rb') as f:
            return f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"
    return ""

async def generate_pdf():
    print("[*] Reading report template...")
    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        html = f.read()

    print("[*] Embedding verified workbench screenshot...")
    b64_img = get_base64_image(SCREENSHOT_PATH)
    html = html.replace('{{SCREENSHOT_B64}}', b64_img)

    temp_html = os.path.join(BASE_DIR, 'rendered_report.html')
    with open(temp_html, 'w', encoding='utf-8') as f:
        f.write(html)

    print("[*] Launching Headless Chromium via Playwright...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        file_url = f"file:///{temp_html.replace(os.sep, '/')}"
        await page.goto(file_url, wait_until='networkidle')
        await asyncio.sleep(1)

        print(f"[*] Printing PDF: {OUTPUT_PDF}...")
        await page.pdf(
            path=OUTPUT_PDF,
            format='A4',
            print_background=True,
            margin={
                'top': '16mm',
                'bottom': '18mm',
                'left': '14mm',
                'right': '14mm'
            },
            display_header_footer=True,
            header_template='<div style="font-size:7pt; color:#64748b; font-family:system-ui, -apple-system, sans-serif; width:100%; text-align:right; padding-right:14mm;">Smartwatch Activity Processing Architecture | Technical Report</div>',
            footer_template='<div style="font-size:7pt; color:#64748b; font-family:system-ui, -apple-system, sans-serif; width:100%; text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
        )

        await browser.close()

    if os.path.exists(temp_html):
        try:
            os.remove(temp_html)
        except Exception:
            pass

    if os.path.exists(DOCS_DIR):
        try:
            shutil.copy2(OUTPUT_PDF, DOCS_PDF)
            print(f"[*] Copied PDF to User Documents: {DOCS_PDF}")
        except Exception as e:
            print(f"[!] Notice copying to Documents: {e}")

    file_size_kb = round(os.path.getsize(OUTPUT_PDF) / 1024, 1)
    print("=" * 70)
    print(f" SUCCESS! Technical Report PDF Generated ({file_size_kb} KB)")
    print(f" Local Path: {OUTPUT_PDF}")
    print(f" Documents Path: {DOCS_PDF}")
    print("=" * 70)

if __name__ == '__main__':
    asyncio.run(generate_pdf())
