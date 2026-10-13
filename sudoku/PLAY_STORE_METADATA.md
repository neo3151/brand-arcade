# Google Play Store Release Pack — Classic Sudoku

This document contains everything required to publish **Classic Sudoku** on the Google Play Console today.

---

## 1. Store Listing Details

### App Title (Max 30 characters)
```text
Classic Sudoku: Logic Puzzle
```

### Short Description (Max 80 characters)
```text
Pure classic 9x9 Sudoku. 5 difficulties, smart step-by-step hints. 100% ad-free.
```

### Full Description (Max 4,000 characters)
```text
Train your brain, sharpen logical reasoning, and unwind with Classic Sudoku — the pure, advertisement-free 9×9 number puzzle experience!

Experience authentic Japanese logic puzzles with zero third-party interruptions, zero subscriptions, and zero tracking. Pure offline cerebral deduction.

🔢 5 BALANCED SKILL DIFFICULTY TIERS
• Beginner: Generous starting clues for learning fundamentals and casual unwinding.
• Easy: Smooth logical deductions with single-candidate eliminations.
• Medium: Demands row, column, and box intersection deduction.
• Hard: Intricate naked/hidden pairs, triples, and advanced elimination logic.
• Master: The ultimate test of endurance and deductive logic with strict 1-mistake limit.

💡 SMART HINTS THAT ACTUALLY TEACH
Never get stuck on a puzzle again! Unlike basic solvers that just dump a random number, our intelligent hint engine points directly to the target cell, highlights the constraint group, and explains the step-by-step logic in clear, simple English.

✏️ FULL NOTE TAKING & TACTICAL TOOLS
• Pencil Notes Mode: Quickly jot down multiple candidates per cell.
• Auto-Candidate Clean: Automatically removes pencil marks when a confirmed number is placed.
• Highlight Duplicates: Instantly spot conflicting numbers in the same row, column, or 3×3 block.
• Unlimited Undo: Step backward freely to retrace and refine your logical deductions.

🎮 CLEAN, DISTRACTION-FREE MOBILE DESIGN
• Fast Number-First or Cell-First Input: Place numbers the way you prefer.
• Responsive Number Keypad: High-contrast buttons with remaining count indicators.
• Auto-Save Continuity: Close the app anytime — your exact board state, pencil marks, and timer are safely preserved.
• Mistake Counter: Track accuracy or toggle strict mode for expert challenge.

🌟 WHY PLAYERS LOVE CLASSIC SUDOKU:
• Zero Advertisements: No popups, no banners, no video ads interrupting your concentration.
• 100% Offline Play: Full gameplay without Wi-Fi or cellular network required.
• Privacy Respecting: All statistics, win streaks, and best times remain strictly on your local device.
• Silky-Smooth 60fps: Lightweight, instant startup with hardware-accelerated grid rendering.

Master the classic grid. Download Classic Sudoku today!
```

---

## 2. Category & Tags

- **Application Type:** Game
- **Category:** Puzzle / Board / Logic
- **Tags:**
  - Sudoku
  - Puzzle
  - Logic
  - Brain Training
  - Math Game
  - Offline
  - Single Player

---

## 3. Content Rating Questionnaire Guide (IARC / PEGI 3 / Everyone)

When answering Google Play Console's Content Rating questions:
- Violence: **No**
- Sexuality / Suggestive themes: **No**
- Language / Profanity: **No**
- Controlled substances (alcohol, tobacco, drugs): **No**
- Simulated gambling / real money: **No**
- Does app allow users to interact / exchange messages: **No**
- Does app share current user physical location: **No**
- Does app allow digital goods purchases: **Optional (Demo local store, or In-App Purchases if configured)**

*Result:* **PEGI 3 / ESRB Everyone / USK 0** (Universal clearance).

---

## 4. Data Safety Declarations

- **Data Collection:** "No data collected" (Classic Sudoku does not collect, transmit, or share any personal user data).
- **Data Sharing:** "No data shared with third parties".
- **Security Practices:**
  - No user account or authentication required.
  - All progression (best times, streak records, level progress) is saved locally on device in HTML5 localStorage / Android sandbox.

---

## 5. APK / Android App Bundle (AAB) Build Instructions

From `c:\Users\Mason\Downloads\Games\sudoku\`:

```powershell
# 1. Sync assets into Android native project
node sync-www.js
npx cap sync android

# 2. Build release bundle in Android Studio or via Gradle CLI:
cd android
./gradlew bundleRelease
```

The signed `.aab` file will be generated at:
`android/app/build/outputs/bundle/release/app-release.aab`
