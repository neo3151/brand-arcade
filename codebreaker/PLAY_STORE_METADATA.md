# Google Play Store Release Pack — Black Vault: Codebreaker

This document contains everything required to publish **Black Vault: Codebreaker** on the Google Play Console today.

---

## 1. Store Listing Details

### App Title (Max 30 characters)
```text
Black Vault: Codebreaker
```

### Short Description (Max 80 characters)
```text
Cold War espionage codebreaker. Crack classified bunker ciphers. 100% ad-free.
```

### Full Description (Max 4,000 characters)
```text
Intercept classified transmissions and crack encrypted vault sequences in Black Vault: Codebreaker — a tense, 1970s Cold War espionage deduction puzzle game!

Experience pure, ad-free codebreaking with zero third-party interruptions, zero subscriptions, and zero tracking. Pure offline cryptographic problem solving.

📻 THREE CLEARANCE PROTOCOLS + CUSTOM WIRETAP
• Field Operative (Clearance I): 4 Pins, 6 Colors, 10 Attempts. Rapid code extraction for field operatives.
• Senior Officer (Clearance II): 5 Pins, 8 Colors, 10 Attempts. Deep cryptographic permutation deduction.
• Station Chief (Clearance III): 6 Pins, 8 Colors, 10 Attempts. High-stakes master espionage clearance.
• Custom Wiretap: Configure custom pin count (3–6), color pool (4–8), duplicate rules (Allowed/Forbidden), and guess attempts (8–15).

⚡ DEAD DROP TACTICAL ARMORY (100% AD-FREE)
• Signal Decryptor (⚡): High-frequency carrier desynchronizer. Instantly discovers and permanently locks the exact color and slot of 1 concealed vault compartment.
• Frequency Filter (📡): Spectrum analyzer. Identifies carrier noise and completely eliminates 2 unused pin frequencies from the active palette.
• Magnetic Tape Rewind (📼): Spools back the analog wiretap tape, granting +2 bonus guess attempts to prevent transmission compromise.
• Wiretap Logic Probe (🔍): Automated cryptographic cross-examiner. Scans the pending row against every prior clue to verify logic before transmitting.

🎮 AUTHENTIC COLD WAR ESPIONAGE AESTHETICS
• Analog Mechanical Teleprinter: Authentic typewriter chitter, analog tape hiss, relay clatter, and CRT phosphor feedback.
• Dual-Peg Feedback Verification: Red pegs confirm exact matches (right color & right position); amber pegs confirm partial matches (right color, wrong position).
• Responsive Mobile Controls: Tap pins, drag colors, or use keyboard numbers 1–8 with rapid backspace and submit controls.
• Auto-Save Continuity: Exit anytime — your active teleprinter session and code state are safely preserved.

🌟 WHY OPERATIVES CHOOSE BLACK VAULT:
• Zero Advertisements: No popups, no banners, no video ads interrupting your covert intercepts.
• 100% Offline Play: Full operational capability without internet or cellular access.
• Privacy Respecting: All clearance records, streaks, and armory supplies stay strictly on your local device.
• Silky-Smooth Performance: Lightweight, instant startup with hardware-accelerated rendering.

Decipher the classified bunker transmission. Download Black Vault: Codebreaker today!
```

---

## 2. Category & Tags

- **Application Type:** Game
- **Category:** Puzzle / Board / Logic
- **Tags:**
  - Codebreaker
  - Mastermind
  - Puzzle
  - Logic
  - Retro
  - Spy
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

- **Data Collection:** "No data collected" (Black Vault does not collect, transmit, or share any personal user data).
- **Data Sharing:** "No data shared with third parties".
- **Security Practices:**
  - No user account or authentication required.
  - All progression (clearance best times, streak records, armory supplies) is saved locally on device in HTML5 localStorage / Android sandbox.

---

## 5. APK / Android App Bundle (AAB) Build Instructions

From `c:\Users\Mason\Downloads\Games\codebreaker\`:

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
