#!/usr/bin/env bash
set -euo pipefail

# Generate favicon + PWA icons from a 1024x1024 PNG source.
# Usage: tools/generate-icons.sh [source_png]

SRC=${1:-public/app-icon.png}
OUT_DIR=public/icons

if [ ! -f "$SRC" ]; then
  echo "Source image not found: $SRC" >&2
  echo "Place your 1024x1024 PNG at $SRC or pass a path." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

gen_with_sips() {
  local size=$1; shift
  local out=$1; shift
  sips -s format png -Z "$size" "$SRC" --out "$out" >/dev/null
}

if command -v sips >/dev/null 2>&1; then
  echo "Generating icons with sips..."
  gen_with_sips 16  "$OUT_DIR/favicon-16.png"
  gen_with_sips 32  "$OUT_DIR/favicon-32.png"
  gen_with_sips 180 "$OUT_DIR/apple-touch-icon-180.png"
  gen_with_sips 192 "$OUT_DIR/app-192.png"
  gen_with_sips 512 "$OUT_DIR/app-512.png"
  gen_with_sips 1024 "$OUT_DIR/app-1024.png"
  echo "Done. Icons in $OUT_DIR"
  exit 0
fi

if command -v magick >/dev/null 2>&1; then
  echo "Generating icons with ImageMagick (magick)..."
  magick "$SRC" -resize 16x16    "$OUT_DIR/favicon-16.png"
  magick "$SRC" -resize 32x32    "$OUT_DIR/favicon-32.png"
  magick "$SRC" -resize 180x180  "$OUT_DIR/apple-touch-icon-180.png"
  magick "$SRC" -resize 192x192  "$OUT_DIR/app-192.png"
  magick "$SRC" -resize 512x512  "$OUT_DIR/app-512.png"
  magick "$SRC" -resize 1024x1024 "$OUT_DIR/app-1024.png"
  echo "Done. Icons in $OUT_DIR"
  exit 0
fi

echo "Neither 'sips' nor 'magick' found. Please install one to generate icons." >&2
exit 1

