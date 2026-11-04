# frontend

React + Vite, two entry points sharing one design system (`src/styles.css`):

- `index.html` -> student app (`src/main.jsx`, `src/App.jsx`), hash-routed (`#/home`, `#/checkin`, ...)
- `admin.html` -> counselor portal + cohort analytics (`src/admin/`)

```bash
npm install
npm run dev      # http://localhost:5173  (student)   /admin.html (counselor/admin)
npm run build
```

Backend URL: `VITE_API_BASE` (default `http://localhost:8000`). All student API calls live in `src/api.js`.

```
src/
  api.js  styles.css  App.jsx  main.jsx
  lib/        store.jsx (auth/theme/toasts/shared state) router.js audio.js (Web Audio soundscapes) dictation.js constants.js
  components/ ui.jsx Shell.jsx EarlyWarning.jsx Interventions.jsx MusicPlayer.jsx BreathingWidget.jsx PomodoroWidget.jsx Garden.jsx DemoDock.jsx onboarding/
  pages/      Landing Auth Onboarding Home CheckIn Chat CalmSpace Games games/{BubblePop,Reframe} GardenPage Reports Support Profile
  admin/      CounselorPortal.jsx AdminDashboard.jsx ...
```
