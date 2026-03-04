import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, 'public/icons/icon.svg');

for (const size of [192, 512]) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(join(__dirname, `public/icons/icon-${size}.png`));
  console.log(`Created icon-${size}.png`);
}
