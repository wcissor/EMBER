# Posting kit: RUTA agritech reel

Six reels: English and Azerbaijani, each with three hooks.

| Variant | Hook | EN length | AZ length |
|---|---|---|---|
| A | Indoor farms raised billions, many went bust | 44.8 s | 44.9 s |
| B | A robot that burns weeds with lasers | 37.4 s | 37.8 s |
| C | Cows that don't need fences | 41.5 s | 42.9 s |

## Which file to upload

- **`ruta-agritech-{en|az}-{A|B|C}-nomusic.mp4`:** voice and sound effects only. Upload this one, then add a trending track in the Instagram app at a low level.
- **`ruta-agritech-{en|az}-{A|B|C}.mp4`:** the same, plus a placeholder music bed made in code. It is safe to post, but it is a placeholder, not a finished score.
- **Cover:** `cover-en.png` or `cover-az.png`. In the app: Edit cover → Add from camera roll. All text sits inside the middle 1080×1440, which is what the profile grid shows.
- **Captions:** Instagram makes its own captions and doesn't take SRT files. The video already shows burned-in captions. `captions-{en|az}-{A|B|C}.srt` are for YouTube Shorts, Facebook, LinkedIn or TikTok, where you can upload them.

## Captions

The first sentence changed from the brief, matching the voice-over: "Most went bust" became "Many of the biggest went bust". The sources show several of the biggest indoor farms failing, not most of them (see `sources.md`, H1).

**English**

> Billions went into indoor farms. Many of the biggest went bust. Meanwhile the open field went high-tech: lasers, drones, collars, satellites. Which one would you bring to your village first? Sources in the comments.
>
> #agritech #farming #futureoffarming #Azerbaijan

**Azerbaijani**

> Qapalı fermalara milyardlar xərcləndi, ən böyüklərinin bir çoxu iflas etdi. Əsl dəyişiklik isə açıq tarlada gedir: lazer, dron, ağıllı boyunluq, peyk. Sən kəndinə ilk hansını gətirərdin? Mənbələr şərhlərdə.
>
> #kəndtəsərrüfatı #agritech #Azərbaycan #futureoffarming

## First comment (pin it)

**English**

> Sources
> • Indoor farms: TechCrunch, 24 Mar 2025. Plenty raised nearly $1B and filed for bankruptcy. Bowery was reported shutting down in Nov 2024; AeroFarms and AppHarvest filed for bankruptcy protection in 2023.
> • Laser weeder: Carbon Robotics' own figure for the LaserWeeder G2, up to 10,000 weeds a minute (Tom's Hardware, 28 Aug 2025).
> • Farm drones: CleanTechnica, 20 Sep 2026. China entered 2026 with about 309,000 plant-protection drones.
> • Collars: Halter, "How it works"; TechCrunch, 4 Apr 2026.
> • Satellites: ESA, Sentinel-2 facts and figures (every 5 days with two satellites). Copernicus data is free and open.
> • Water: FAO AQUASTAT 2025. Agriculture takes about 70% of freshwater withdrawals.
> • Azerbaijan: World Bank Country Climate and Development Report (APA, 29 Nov 2023). Agriculture is 36% of employment.
> Imagery: NASA. Contains modified Copernicus Sentinel data 2026. Border: Natural Earth. Footage: Adobe Stock. The laser crosshairs, the collar and the fence are illustrations.

**Azerbaijani**

> Mənbələr
> • Qapalı fermalar: TechCrunch, 24 mart 2025. Plenty təxminən 1 milyard dollar cəlb etdi və iflas üçün müraciət etdi. Bowery-nin 2024-cü ilin noyabrında bağlandığı bildirildi; AeroFarms və AppHarvest 2023-cü ildə iflasdan qorunma üçün müraciət etdi.
> • Lazerli robot: Carbon Robotics-in öz rəqəmi, LaserWeeder G2 dəqiqədə 10 000-ə qədər alaq otu (Tom's Hardware, 28 avqust 2025).
> • Dronlar: CleanTechnica, 20 sentyabr 2026. Çin 2026-cı ilə təxminən 309 000 bitki mühafizəsi dronu ilə girdi.
> • Boyunluqlar: Halter, "How it works"; TechCrunch, 4 aprel 2026.
> • Peyklər: ESA, Sentinel-2 (iki peyklə hər 5 gündən bir). Copernicus məlumatları pulsuz və açıqdır.
> • Su: FAO AQUASTAT 2025. Götürülən şirin suyun təxminən 70%-i kənd təsərrüfatına gedir.
> • Azərbaycan: Dünya Bankının Ölkə üzrə İqlim və İnkişaf Hesabatı (APA, 29 noyabr 2023). Məşğulluğun 36%-i kənd təsərrüfatındadır.
> Təsvirlər: NASA. Contains modified Copernicus Sentinel data 2026. Sərhəd: Natural Earth. Görüntülər: Adobe Stock. Lazer nişangahları, boyunluq və hasar illüstrasiyadır.

Please have a native speaker read the Azerbaijani captions and comment before posting.

## Test plan

1. Post variants A, B and C as **Trial Reels**, which show to non-followers first. Do it per language, on the same day and at the same hour.
2. After 24–48 hours, compare for each variant:
   - views
   - average watch time, and the share who watched to the end
   - shares
   - saves
   - comments answering the question
3. Share the winner to followers. Keep its hook for the next reel in the series.

The hooks test three different openings:
- A: money and failure.
- B: a machine.
- C: animals.

If one wins clearly in both languages, that kind of opening is the one to reuse.

## Files in `out/`

- `ruta-agritech-{en|az}-{A|B|C}.mp4` and `…-nomusic.mp4`: 12 videos, 1080×1920, 30 fps, H.264 High, AAC 48 kHz, −14 LUFS.
- `cover-en.png`, `cover-az.png`
- `captions-{en|az}-{A|B|C}.srt`
- `sources.md`: every number with its source and the exact quote.
- `licenses/`: stock licence records, imagery and data credits, the font licence, ElevenLabs.
- `qa/report.md`: the 12 checks, with stills and contact sheets.
