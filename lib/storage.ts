import { createAdminSupabase } from "./supabase";

const QR_BUCKET = "qr-codes";
const POSTER_BUCKET = "posters";

export async function uploadQRToSupabase(
  ticketId: string,
  buffer: Buffer,
): Promise<string> {
  const supabase = createAdminSupabase();
  const path = `${ticketId}.png`;

  const { error } = await supabase.storage
    .from(QR_BUCKET)
    .upload(path, buffer, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "31536000",
    });

  if (error) {
    throw new Error(`QR upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(QR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPoster(
  eventId: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const supabase = createAdminSupabase();
  // Cache-bust by using a random suffix so a "replace" doesn't get stuck on CDN
  const ext = contentType === "image/png" ? "png"
    : contentType === "image/webp" ? "webp"
    : "jpg";
  const path = `${eventId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(POSTER_BUCKET)
    .upload(path, data, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });

  if (error) throw new Error(`Poster upload failed: ${error.message}`);

  const { data: pub } = supabase.storage.from(POSTER_BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

export async function deletePoster(posterUrl: string): Promise<void> {
  // Extract the path from a public URL of the form
  // https://<project>.supabase.co/storage/v1/object/public/posters/<path>
  const match = posterUrl.match(/\/posters\/(.+)$/);
  if (!match || !match[1]) return;

  const supabase = createAdminSupabase();
  await supabase.storage.from(POSTER_BUCKET).remove([match[1]]);
}
