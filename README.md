# ColorWall - By Laxenta Inc.
## Upcoming in rust soon for small bundle size. 
> **A cool desktop wallpaper manager with multi-source support, built with Next.js, Electron,**

![GitHub](https://img.shields.io/github/license/yourusername/ColorWall)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Electron](https://img.shields.io/badge/Electron-39.1.2-47848F?logo=electron)
![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black?logo=next.js)

---

## ✨ Features
# up coming - autochange after a period of time from a list of selected tags by you (or random)
- **🌐 Multi-Source Wallpaper Aggregation** - Fetches from 7+ wallpaper sites
- **Live2D Support** - Interactive anime wallpapers (not yet implemented)
- **QUICK WALLPAPER SETTING** - one click and that's it, boom a good wallpaper
- **Smart Caching** - Local image cache for offline access
- **Proxy System** - Built-in image proxy for CORS bypass
- **Advanced Filtering** - For the best results across all sites we scrape from
- **⚡ Okay at Performance, just gpu heavy** 
- **Native Desktop App**
- **okayish UI**

---

## 📸 Screenshots

<!-- Images will be automatically embedded from /assets folder -->

![App Interface](./assets/screenshot-1.png)
*Main interface with wallpaper grid*

![Wallpaper Preview](./assets/screenshot-2.png)
*Full-screen wallpaper preview*

![Settings Panel](./assets/Capture.png)
*Exclude tags for your preferences (ex put feet, for less feet)*

---
---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/ColorWall/issues)
- **Discord:** [Join our DISCORD COMMUNITY](https://discord.gg/9emnU25HaY)
- **Email:** laxenta.inc@gmail.com

---
## Quick Start
### Prerequisites

- Node.js 18+ (with pnpm)
- Windows 10/11 (current build)
- 500MB free disk space

### Installation

```bash
git clone https://github.com/shelleyloosespatience/ColorWall.git
cd ColorWall

pnpm install
pnpm dev
# or production
pnpm build && pnpm test:prod
# then self install as a app using the installer
pnpm dist
```

---

## What stuff is used

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | Frontend framework with Turbopack |
| **Electron 39** | Desktop app wrapper |
| **TypeScript** | Type-safe development |
| **IPC Services** | Native OS integration |
| **Sharp** | Image processing & conversion |

---

## Multiple Wallpaper Sources (live upcoming soon lol)

<!-- <table>
  <tr>
    <td align="center">
      <img src="./assets/wplflare.png" width="80px"/><br/>
      <b>Wplfare</b>
    </td>
    <td align="center">
      <img src="./assets/source-wallpapers.png" width="80px"/><br/>
      <b>Wallpapers.com</b>
    </td>
    <td align="center">
      <img src="./assets/source-wallpaperflare.png" width="80px"/><br/>
      <b>WallpaperFlare</b>
    </td>
    <td align="center">
      <img src="./assets/source-safebooru.png" width="80px"/><br/>
      <b>Safebooru</b>
    </td>
  </tr>
</table> -->

*+ 3 more sources*

---

## Features Breakdown

### Intelligent Search
- Multi-site parallel fetching
- Tag-based filtering
- Live2D animation support
- Random wallpaper discovery

### Smart Caching System
```
AppData/Roaming/Electron/wallpaper-cache/
├── wallpaper-moewalls-*.png
├── wallpaper-wallpapers-*.jpg
└── wallpaper-wallpaperflare-*.png
```
- Automatic cache management
- (compatiblity) Image format conversion (JPEG → PNG)
- Cache size monitoring
- One-click cache clearing
- CORS bypass for restricted images
- batch image downloading
- accessibility checks
- image URL resolution

---
---

## Scripts you might use if forking (see pkg.json)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm test:prod` | Test production build |
| `pnpm dist` | Create installer package |
| `pnpm clean` | Remove build artifacts |

---
*Planning Tauri migration to reduce bundle size to <50MB*
---

## Known Issues

- [ ] Sometimes Disk cache error on first launch (non-critical)
- [ ] Large installer size due to Chromium (Tauri migration planned)
- [ ] Windows-only build (macOS/Linux support coming)

---

## 🗺️ Roadmap
Done->
- [x] Multi-source wallpaper scraping
- [x] Live2D support
- [x] Desktop
- [x] caching
- [ ] **RUST migration** (reduce bundle size)
- [ ] macOS & Linux builds
- [ ] scheduler
- [ ] User updated wallpapers
- [ ] Cloud sync

---

## License

This project is licensed under the           GNU GENERAL PUBLIC LICENSE       
 - see the [LICENSE](LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch | fork
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 🌟 Acknowledgments

- Wallpaper scraped from: MoeWalls, Wallpapers.com, WallpaperFlare, Safebooru, , ZeroChan, Pic.re, Wallhaven
- Built by [Laxenta](https://laxenta.tech)

---

<p align="center">
  <img src="./assets/logo.png" width="120px"/>
  <br/>
  <b>ColorWall</b> - Beautiful wallpapers, beautifully managed.
  <br/>
  <sub>Part of the <a href="https://laxenta.tech">Laxenta</a> ecosystem</sub>
</p>
