# Satellite imagery and map data

## NASA Blue Marble, through NASA GIBS

- **Used for:** the turning globe in B5 (`public/sat/globe.mp4`) and the wide map of the Caucasus in B7 (`public/maps/caucasus.jpg`, `bm-wide.jpg`, `bm-caucasus.jpg`).
- **Layer:** `BlueMarble_ShadedRelief_Bathymetry`, from the GIBS WMS service, fetched in November 2026.
- **Terms:** NASA imagery is generally not subject to copyright in the United States (NASA Images and Media Usage Guidelines, https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA asks for credit and does not allow its insignia to imply endorsement. The reel shows no NASA logo.
- **Acknowledgement requested by GIBS:** "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."
- **On screen:** "IMAGERY: NASA" / "TƏSVİR: NASA".

## Copernicus Sentinel-2

- **Used for:** the real fields in B5 and B7, true colour at 10 m per pixel, cut from the Level-2A TCI image of each scene.
  - B5: scene `S2B_14SLG_20260802`, Kansas, USA, 2 August 2026 (`public/sat/kansas.jpg`).
  - B7: scene `S2A_39TTE_20260723`, Kura–Araz lowland near Saatlı, Azerbaijan, 23 July 2026 (`public/sat/kura-araz.jpg`).
- **Where from:** the Sentinel-2 L2A Cloud-Optimised GeoTIFFs on AWS (Registry of Open Data), found through the Earth Search STAC API (Element 84). The STAC records are in `research/satellite/stac-*.json`.
- **Terms:** the Legal Notice on the use of Copernicus Sentinel Data and Service Information (EU Regulation 1159/2013) gives free, full and open access, including commercial use, provided the source is credited.
- **Credit format required:** "Contains modified Copernicus Sentinel data [year]", because we cropped, scaled and graded the images.
- **On screen:** "CONTAINS MODIFIED COPERNICUS SENTINEL DATA 2026", kept in English in both languages because it is the standard wording.

## Natural Earth

- **Used for:** Azerbaijan's border in B7. The polygon from `ne_10m_admin_0_countries` includes Nakhchivan and the territory Azerbaijan restored in 2020–2023 (checked: Khankendi, Shusha and Lachin are inside it).
- **Terms:** public domain (https://www.naturalearthdata.com/about/terms-of-use/). No credit is required. We credit it anyway.
