import time
from playwright.sync_api import sync_playwright
import os

def test_mobile_solar_system():
    html_file_path = os.path.abspath(r"c:\AI practice\wonderland\solar-system\index.html")
    url = f"file:///{html_file_path.replace(os.sep, '/')}"
    
    print(f"[*] 테스트 URL: {url}")
    
    with sync_playwright() as p:
        # iPhone X sized layout
        browser = p.chromium.launch(
            headless=False, 
            slow_mo=500, 
            args=['--no-sandbox', '--disable-gpu', '--window-size=375,812']
        )
        context = browser.new_context(viewport={'width': 375, 'height': 812})
        page = context.new_page()
        
        # Capture console API logs for fetch successes
        page.on("console", lambda msg: print(f"[Browser JS Log] {msg.text}"))
        
        page.goto(url)
        
        # Checks
        canvas = page.locator("canvas")
        if canvas.count() > 0:
            print("[OK] Three.js 공간이 렌더링 되었습니다.")
            
        fab = page.locator("#mobile-fab")
        if fab.count() > 0:
            print("[OK] 모바일 전용 반응형 FAB(플로팅 액션 버튼)이 정상 매핑되었습니다.")
            
        bottom_sheet = page.locator("#planet-info.bottom-sheet")
        if bottom_sheet.count() > 0:
            print("[OK] 정보 패널이 모바일 Bottom Sheet 스타일로 전환되었습니다.")
            
        print("[*] 10초간 자동 시연 대기...")
        time.sleep(10)
        
        browser.close()

if __name__ == '__main__':
    try:
        test_mobile_solar_system()
    except Exception as e:
        print(f"[!] 에러 발생: {e}")
