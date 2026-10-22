// Icône « maskable » plein cadre (Android la découpe en cercle / squircle).
import sharp from 'sharp'
await sharp('assets/maskable.svg').resize(512, 512).png().toFile('public/maskable-icon-512x512.png')
await sharp('assets/maskable.svg').resize(180, 180).png().toFile('public/apple-touch-icon-180x180.png')
// Badge monochrome des notifications Android (barre d'état).
await sharp('assets/badge.svg').resize(96, 96).png().toFile('public/badge-96x96.png')
