# Google Play Store Release Pack — Celestial Jade

This document contains everything required to publish **Celestial Jade** on the Google Play Console today.

---

## 1. Store Listing Details

### App Title (Max 30 characters)
```text
Celestial Jade: Mahjong Solitaire
```
*(Exactly 33 chars? Wait, let's count: "Celestial Jade: Mahjong Solitaire" is 33 chars. Let's make it <= 30 chars: "Celestial Jade: Mahjong" = 23 chars, or "Celestial Jade Mahjong" = 22 chars)*
```text
Celestial Jade Mahjong
```

### Short Description (Max 80 characters)
```text
Imperial 3D Mahjong Solitaire. Carved jade tiles, timeless harmony. 100% ad-free.
```
*(79 characters — fits under 80 limit)*

### Full Description (Max 4,000 characters)
```text
Welcome to the peaceful pavilions of the Celestial Dynasty. Disassemble intricate 3D tiered formations of hand-carved jade and ivory tiles in Celestial Jade — a premium, authentic Mahjong Solitaire experience crafted for tranquility and sharp mindful focus.

Experience pure, ad-free tile matching with zero third-party interruptions, zero subscriptions, and zero tracking. Pure offline contemplative gameplay.

🀄 THREE SACRED TIERED FORMATIONS
• The Classic Turtle (144 Tiles): The timeless 5-tier pyramid masterpiece with an elevated central pagoda apex.
• The Imperial Dragon (144 Tiles): A majestic serpentine silhouette featuring spread wings, curved tail, and crowned head.
• The Stone Fortress (144 Tiles): High-density fortified ramparts flanked by 4 elevated corner towers and an inner keep.

✨ 100% GUARANTEED SOLVABLE BOARDS
Every board generated in Celestial Jade is mathematically verified to be solvable using reverse-placement logic. Every puzzle has a clear path to victory through mindful strategy.

🏛️ SACRED TACTICAL TREASURY (100% AD-FREE)
• Compass Hint (🧭): Imperial divining needle that instantly illuminates an open matching pair with a radiant jade glow.
• Dragon Shuffle (🐉): Celestial wind that rearranges remaining tiles to guarantee at least one open matching pair.
• Time Rewind (⏳): Spools back the threads of time to restore your last matched pair of tiles.
• Celestial Lotus (🪷): Sacred banishing flower that sweeps away an open pair from the formation.

🌸 AUTHENTIC DYNASTY AESTHETICS & SOUNDSCAPE
• Carved Tile Slabs: Crisp vector rendering of traditional Wan (Characters), Bamboo, Dots, Dragons, Winds, and Wildcard Seasons & Flowers.
• Calming Acoustic Atmosphere: Soothing wooden clicks, meditative jade chimes, and deep temple gong resonances.
• Intelligent Dynamic Lighting: Free, playable tiles remain bright and crisp while locked tiles subtly dim to guide your vision effortlessly.
• Instant Auto-Scale: Beautifully centers and scales to every smartphone and tablet screen size.

🌟 WHY PLAYERS LOVE CELESTIAL JADE:
• Zero Advertisements: No popups, no banners, no video ads interrupting your peaceful session.
• 100% Offline Play: Full gameplay without Wi-Fi or cellular connection needed.
• Auto-Save Continuity: Close the app anytime — your exact active tile layout and elapsed time are safely preserved.
• Privacy First: Zero user tracking, zero data collection. All best times and streaks stay strictly on your device.

Enter the sacred sanctuary. Download Celestial Jade today!
```

---

## 2. Category & Tags

- **Application Type:** Game
- **Category:** Board / Puzzle / Mahjong
- **Tags:**
  - Mahjong
  - Mahjong Solitaire
  - Puzzle
  - Board Game
  - Casual
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

*Result:* **PEGI 3 / ESRB Everyone / USK 0** (Global universal clearance).

---

## 4. Data Safety Declarations

- **Data Collection:** "No data collected" (Celestial Jade does not collect, transmit, or share any personal user data).
- **Data Sharing:** "No data shared with third parties".
- **Security Practices:**
  - No user account or authentication required.
  - All progression (best times, win streaks, inventory) is saved locally on device in HTML5 localStorage / Android sandbox.

---

## 5. APK / Android App Bundle (AAB) Build Instructions

From `c:\Users\Mason\Downloads\Games\mahjong\`:

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
