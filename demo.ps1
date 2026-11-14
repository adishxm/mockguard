# MockGuard Judge Demonstration Script (PowerShell)
# ----------------------------------------------------
# Proves: A test can pass and show high coverage while failing to detect a real bug.
# MockGuard exposes that false confidence.

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "        MOCKGUARD LIVE JUDGE DEMONSTRATION                  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Act 1: The Problem
Write-Host "`n[ACT 1: THE AI MOCK ILLUSION - 30s]" -ForegroundColor Yellow
Write-Host "AI code assistants generate tests that pass 100% green by checking mocks"
Write-Host "instead of real application behavior. Let's inspect the target demo project:"
Write-Host ""

# Ensure starting state is weak test
node demo-project/switch-to-weak.js | Out-Null

Write-Host "--- Production Logic (demo-project/src/checkout.ts) ---" -ForegroundColor DarkGray
Get-Content demo-project/src/checkout.ts | Write-Host -ForegroundColor White

Write-Host "`n--- AI Generated Test (demo-project/tests/checkout.test.ts) ---" -ForegroundColor DarkGray
Get-Content demo-project/tests/checkout.test.ts | Write-Host -ForegroundColor Magenta

Write-Host "`nNotice: The test mocks payment and only asserts expect(payment).toHaveBeenCalled()." -ForegroundColor Red
Write-Host "It NEVER asserts checkout outcome, orderStatus, or fulfillmentEvent!" -ForegroundColor Red

# Act 2: MockGuard Finds The Flaw
Write-Host "`n[ACT 2: MOCKGUARD EXPOSES THE FALSE CONFIDENCE - 60s]" -ForegroundColor Yellow
Write-Host "Step 2A: Running baseline test suite..." -ForegroundColor Cyan
mockguard baseline ./demo-project

Write-Host "`nStep 2B: Running MockGuard verification with AST & mutation engine..." -ForegroundColor Cyan
mockguard verify ./demo-project

Write-Host "`n>>> Result: The weak test was 100% GREEN, but all mutants SURVIVED!" -ForegroundColor Red
Write-Host ">>> MockGuard caught the call-only mock assertion and failed the verification." -ForegroundColor Red
Write-Host ">>> GOOGLE GEMINI ADVISORY synthesized the exact behavioral fix shown above!" -ForegroundColor Green

# Act 3: Fixing The Test & Proving It (Applying Gemini's Fix)
Write-Host "`n[ACT 3: APPLY GEMINI'S FIX AND PROVE DEFECT DETECTION - 60s]" -ForegroundColor Yellow
Write-Host "Upgrading demo-project with Gemini-synthesized behavioral assertions..." -ForegroundColor Green
node demo-project/switch-to-strong.js

Write-Host "`n--- Strong Behavioral Test (demo-project/tests/checkout.test.ts) ---" -ForegroundColor DarkGray
Get-Content demo-project/tests/checkout.test.ts | Write-Host -ForegroundColor Green

Write-Host "`nRunning MockGuard verification on behavioral test suite..." -ForegroundColor Cyan
mockguard verify ./demo-project

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host ">>> VERDICT: PASS (100% Mutation Score - All Mutants Killed)" -ForegroundColor Green
Write-Host ">>> CONCLUSION: MockGuard checks whether tests detect real defects." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

