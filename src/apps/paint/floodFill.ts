/** « #rrggbb » → [r, g, b] */
export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.replace(/./g, (char) => char + char) : value
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Pot de peinture : zone de pixels de couleur proche de celle du point de départ, contiguë.
 * Renvoie un masque (1 = à remplir), élargi d'un pixel pour couvrir les bords adoucis des traits.
 * `pixels` : RGBA de l'image composée (fond + encre), comme ImageData.data.
 */
export function floodFillMask(pixels: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, tolerance = 40): Uint8Array {
  const mask = new Uint8Array(width * height)
  const x0 = Math.floor(startX)
  const y0 = Math.floor(startY)
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return mask
  const start = (y0 * width + x0) * 4
  const [r0, g0, b0, a0] = [pixels[start], pixels[start + 1], pixels[start + 2], pixels[start + 3]]
  const similar = (index: number) => {
    const i = index * 4
    return (
      Math.abs(pixels[i] - r0) <= tolerance &&
      Math.abs(pixels[i + 1] - g0) <= tolerance &&
      Math.abs(pixels[i + 2] - b0) <= tolerance &&
      Math.abs(pixels[i + 3] - a0) <= tolerance
    )
  }

  // Remplissage par lignes (scanline) avec une pile : rapide et sans récursion.
  const stack = [y0 * width + x0]
  while (stack.length) {
    const index = stack.pop()!
    if (mask[index]) continue
    const y = Math.floor(index / width)
    let left = index
    while (left % width > 0 && !mask[left - 1] && similar(left - 1)) left--
    let right = index
    while (right % width < width - 1 && !mask[right + 1] && similar(right + 1)) right++
    for (let i = left; i <= right; i++) {
      if (!similar(i) && i !== index) continue
      mask[i] = 1
      if (y > 0 && !mask[i - width] && similar(i - width)) stack.push(i - width)
      if (y < height - 1 && !mask[i + width] && similar(i + width)) stack.push(i + width)
    }
  }

  // Élargissement d'un pixel.
  const grown = mask.slice()
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    const x = i % width
    if (x > 0) grown[i - 1] = 1
    if (x < width - 1) grown[i + 1] = 1
    if (i >= width) grown[i - width] = 1
    if (i < mask.length - width) grown[i + width] = 1
  }
  return grown
}
