import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Replicate from "replicate";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const maxDuration = 60;

export async function POST(req: Request) {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const s3Client = new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });

  try {
    const body = await req.json();
    const { widget_uuid, address, fullName, email, sellerIntent, valuation, addressComponents } = body;

    if (!widget_uuid || !address || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Validation & Authorization
    const widgetSettings = await prisma.widgetSettings.findUnique({
      where: { widget_uuid },
      include: { user: true },
    });

    if (!widgetSettings || !widgetSettings.user) {
      return NextResponse.json({ error: "Invalid widget UUID" }, { status: 401 });
    }

    const user = widgetSettings.user;

    if (user.available_credits <= 0) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    // 2. Capture Base Image (Google Street View)
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${encodeURIComponent(address)}&fov=50&pitch=10&key=${process.env.GOOGLE_STREETVIEW_API_KEY}`;
    
    const streetViewRes = await fetch(streetViewUrl);
    if (!streetViewRes.ok) {
      throw new Error("Failed to fetch Street View image");
    }
    
    const imageBuffer = await streetViewRes.arrayBuffer();
    // (Optional: verify if it's the default grey placeholder here)
    
    const base64Image = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString('base64')}`;

    // 3. AI Transformation (SDXL ControlNet Canny)
    let outputImageUrl = "";
    try {
      const output = await replicate.run(
        "lucataco/sdxl-controlnet:06d6fae3b75ab68a28cd2900afa6033166910dd09fd9751047043a5bbb4c184b",
        {
          input: {
            image: base64Image,
            prompt: "A sharp, high-contrast black and white architectural ink drawing of this exact house. Thick black ink pen lines, crisp edges, pure white paper background, stark black and white, highly detailed graphic illustration, masterpiece, no text.",
            condition_scale: 0.6, // How strictly it follows the structural lines of the house
            negative_prompt: "photorealistic, ugly, distorted geometry, cars, text, watermarks, dark, trees blocking house, low quality.",
            num_outputs: 1,
          }
        }
      );
      // output is usually an array of URLs or a single URL depending on the model.
      outputImageUrl = Array.isArray(output) ? output[0] : output;
    } catch (aiError) {
      console.error("AI Generation Error", aiError);
      throw new Error("AI Transformation failed");
    }

    // 4. Storage (AWS S3)
    const imageFetchRes = await fetch(outputImageUrl);
    const aiImageBuffer = await imageFetchRes.arrayBuffer();
    const fileName = `sketches/${Date.now()}-${widget_uuid}.jpg`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: Buffer.from(aiImageBuffer),
        ContentType: "image/jpeg",
        // ACL: "public-read", // Omit if bucket policies handle public access
      })
    );

    const s3ImageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // 5. Database Update & Billing
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { available_credits: { decrement: 1 } },
      }),
      prisma.leadHistory.create({
        data: {
          user_id: user.id,
          address,
          lead_email: email,
          seller_intent: sellerIntent,
          s3_image_url: s3ImageUrl,
        },
      }),
    ]);

    // 6. Webhook Handoffs
    const leadPayload = {
      address,
      fullName,
      email,
      sellerIntent,
      valuationRequested: valuation,
      imageUrl: s3ImageUrl,
      generatedAt: new Date().toISOString()
    };

    // CRM Webhook
    if (widgetSettings.destination_webhook_url) {
      fetch(widgetSettings.destination_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadPayload),
      }).catch(err => console.error("CRM Webhook Error:", err));
    }

    // Thanks.io Fulfillment
    if (process.env.THANKS_IO_API_TOKEN) {
      try {
        const thanksPayload: any = {
          front_image_url: s3ImageUrl,
          message: `Hi ${fullName}, hope you love this architectural sketch of ${address}! Let me know if you want a free valuation.`
        };

        if (addressComponents) {
          thanksPayload.recipients = [{
            name: fullName,
            address: addressComponents.street,
            city: addressComponents.city,
            province: addressComponents.state,
            postal_code: addressComponents.zip,
            country: "US"
          }];
        } else {
          thanksPayload.recipients = [{
            name: fullName,
            address: address
          }];
        }

        await fetch("https://api.thanks.io/api/v2/send/postcard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.THANKS_IO_API_TOKEN}`
          },
          body: JSON.stringify(thanksPayload)
        });
      } catch (err) {
        console.error("Thanks.io Error:", err);
      }
    }

    return NextResponse.json({ success: true, imageUrl: s3ImageUrl });

  } catch (error: any) {
    console.error("[GENERATE_LEAD_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
