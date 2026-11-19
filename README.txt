Salat Tracker v0.5
==================
Install on Android (one-time hosting needed, because installable PWAs require HTTPS):
1. Upload this folder to any free static host:
   - Netlify Drop: https://app.netlify.com/drop  (drag the unzipped folder)
   - or GitHub Pages
2. Open the https:// link in Chrome on your phone.
3. Menu (three dots) > Install app / Add to Home screen.
After the first load it works offline. All data stays in the phone (IndexedDB).

Notes
- Adhan: pick your own audio file in Settings > Alerts (stored on the device). Default is a soft chime.
- Alerts fire while the app is open or recently used; Android PWAs cannot guarantee background timers.
- Qibla needs a phone with a magnetometer and HTTPS.
