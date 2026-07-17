# AiFER v0.7

AiFER v0.7 is a cleaned, releaseable snapshot reconstructed from the uploaded project dump.

## Included
- React + Vite web shell
- Routed AiFER pages
- PopOS and Neon UI systems
- Core dashboards and Ferret apps from the upload
- Stubbed platform services so the app can boot without the missing private backend modules
- Tauri desktop scaffolding
- GitHub Actions release workflow

## Run
```bash
npm install
npm run dev
```

## Release
```bash
git tag v0.7.0
git push origin main --tags
```

## Notes
Some advanced mesh, wallet, federated, and blockchain behaviors are mocked in this release so the codebase is runnable and publishable.
