import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-04-10", // Using a recent stable version string (Stripe typings may require specific versions depending on the installed package)
});

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = session.client_reference_id;
    // Assuming we pass the number of credits purchased in the metadata
    const creditsPurchased = parseInt(session.metadata?.credits || "0", 10);

    if (userId && creditsPurchased > 0) {
      try {
        await prisma.user.update({
          where: { auth_id: userId },
          data: {
            available_credits: {
              increment: creditsPurchased,
            },
          },
        });
        console.log(`Successfully added ${creditsPurchased} credits to user ${userId}`);
      } catch (dbError) {
        console.error("Database error updating user credits:", dbError);
        return new NextResponse("Database error", { status: 500 });
      }
    }
  }

  return new NextResponse("OK", { status: 200 });
}
