import { supabase } from '../../lib/supabase';
import { optimizeAndUploadToR2 } from './imageOptimizer';

export interface MigrationProgress {
  totalProducts: number;
  currentProductIndex: number;
  currentProductCode: string;
  totalImagesMigrated: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  logs: string[];
}

/**
 * Image URL నుంచి Blob తీసుకునే హెల్పర్ (CORS fallback తో)
 */
async function fetchImageBlobSafe(url: string): Promise<Blob> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) return await res.blob();
  } catch {
    // direct fetch cors fail aithe canvas fallback
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas blob conversion failed'));
      }, 'image/webp', 0.9);
    };
    img.onerror = () => reject(new Error('Image load failed across origins'));
    img.src = url;
  });
}

export const migrateExistingProductImagesToR2 = async (
  onProgress?: (progress: MigrationProgress) => void
) => {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  try {
    log('Supabase products table nunchi data fetch chesthunnam...');
    const { data: products, error } = await supabase
      .from('products')
      .select('id, images')
      .order('id', { ascending: true });

    if (error) throw error;
    if (!products || products.length === 0) {
      log('No products found in database.');
      return;
    }

    const totalProducts = products.length;
    let totalImagesMigrated = 0;

    for (let pIdx = 0; pIdx < totalProducts; pIdx++) {
      const prod = products[pIdx];
      const productCode = (prod.id || '').trim();

      // JSONB format normalization
      let rawImages = prod.images;
      if (typeof rawImages === 'string') {
        try {
          rawImages = JSON.parse(rawImages);
        } catch {
          rawImages = [];
        }
      }

      const existingImages: any[] = Array.isArray(rawImages) ? rawImages : [];

      if (existingImages.length === 0) {
        log(`[${pIdx + 1}/${totalProducts}] ${productCode}: No images attached. Skipping.`);
        if (onProgress) {
          onProgress({
            totalProducts,
            currentProductIndex: pIdx + 1,
            currentProductCode: productCode,
            totalImagesMigrated,
            status: pIdx + 1 === totalProducts ? 'completed' : 'running',
            logs: [...logs],
          });
        }
        continue;
      }

      log(`[${pIdx + 1}/${totalProducts}] Processing ${productCode} (${existingImages.length} images)...`);

      let hasChanges = false;
      const updatedImages = [];

      for (let imgIdx = 0; imgIdx < existingImages.length; imgIdx++) {
        const item = existingImages[imgIdx];
        const oldUrl = typeof item === 'string' ? item : item?.url;
        const colorTag = typeof item === 'object' && item?.color_tag ? item.color_tag : 'Universal';

        if (!oldUrl) {
          continue;
        }

        // Already Cloudflare R2 లో ఉంటే మళ్లీ మార్చకుండా అలాగే ఉంచడం
        if (oldUrl.includes('kashvi-media') || oldUrl.includes('.r2.dev')) {
          log(`  -> Image ${imgIdx + 1} already in R2: ${oldUrl}`);
          updatedImages.push(typeof item === 'object' ? item : { url: oldUrl, color_tag: colorTag });
          continue;
        }

        try {
          const imageBlob = await fetchImageBlobSafe(oldUrl);
          const file = new File([imageBlob], `${productCode}_temp.webp`, {
            type: 'image/webp',
          });

          const nextIndex = imgIdx + 1;
          const uploadRes = await optimizeAndUploadToR2(
            file,
            'products',
            productCode,
            nextIndex
          );

          updatedImages.push({
            id: `${Date.now()}_${imgIdx}`,
            url: uploadRes.url,
            color_tag: colorTag,
            size_bytes: uploadRes.compressedSize,
          });

          hasChanges = true;
          totalImagesMigrated++;
          log(`  -> Synced Image ${nextIndex} to R2: ${uploadRes.url} (${uploadRes.compressedSize})`);
        } catch (imgErr: any) {
          log(`  -> Warning on image ${imgIdx + 1} of ${productCode}: ${imgErr.message}`);
          updatedImages.push(typeof item === 'object' ? item : { url: oldUrl, color_tag: colorTag });
        }
      }

      // Supabase products table లో images jsonb కాలమ్‌ని అప్‌డేట్ చేయడం
      if (hasChanges) {
        const { error: updateErr } = await supabase
          .from('products')
          .update({ images: updatedImages })
          .eq('id', productCode);

        if (updateErr) {
          log(`  -> DB update failed for ${productCode}: ${updateErr.message}`);
        } else {
          log(`  -> DB updated successfully for ${productCode}`);
        }
      }

      if (onProgress) {
        onProgress({
          totalProducts,
          currentProductIndex: pIdx + 1,
          currentProductCode: productCode,
          totalImagesMigrated,
          status: pIdx + 1 === totalProducts ? 'completed' : 'running',
          logs: [...logs],
        });
      }
    }

    log('All product images synced and database updated successfully!');
  } catch (err: any) {
    log(`Migration halted: ${err.message}`);
    if (onProgress) {
      onProgress({
        totalProducts: 0,
        currentProductIndex: 0,
        currentProductCode: '',
        totalImagesMigrated: 0,
        status: 'error',
        logs: [...logs],
      });
    }
  }
};