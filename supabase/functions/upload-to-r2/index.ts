import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "npm:@aws-sdk/client-s3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
    const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") || "kashvi-media";
    const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL")!;

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    // 1. DELETE ACTION (Product modal lo delete chesinappudu R2 nunchi theeyadaniki)
    if (req.method === "DELETE") {
      const { fileUrl } = await req.json();
      if (!fileUrl) throw new Error("fileUrl is required for deletion");

      // Extract key from public URL
      const key = fileUrl.replace(`${R2_PUBLIC_URL}/`, "");

      await s3.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        })
      );

      return new Response(JSON.stringify({ success: true, deleted: key }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. UPLOAD ACTION (Frontend pampina name niそのまま vadadam)
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "products";

    if (!file) throw new Error("No file uploaded");

    // Ekkada random ID kakunda direct ga Frontend nunchi vachina file.name ni vaduthunnam
    const fileName = `${folder}/${file.name}`;
    const arrayBuffer = await file.arrayBuffer();

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: new Uint8Array(arrayBuffer),
        ContentType: file.type || "image/webp",
      })
    );

    const publicUrl = `${R2_PUBLIC_URL}/${fileName}`;

    return new Response(
      JSON.stringify({
        url: publicUrl,
        key: fileName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});