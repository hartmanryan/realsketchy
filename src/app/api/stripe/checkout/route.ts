import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2026-04-22.dahlia" as any,
  });

  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // We get the URL the user is currently on so we can redirect them back
    const { origin } = new URL(req.url);
    
    // Hardcoded simple "Credit Pack" definition (in production this could be pulled from the database or Stripe Product catalog)
    // 100 Credits for $49
    const PRICE_IN_CENTS = 4900;
    const CREDITS = 100;

    const stripeSession = await stripe.checkout.sessions.create({
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/dashboard?canceled=true`,
      payment_method_types: ["card"],
      mode: "payment",
      billing_address_collection: "auto",
      client_reference_id: userId, // extremely important for the webhook to know who paid
      metadata: {
        credits: CREDITS.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "100 AI Home Sketch Credits",
              description: "Generate 100 unique AI architectural watercolor sketches.",
            },
            unit_amount: PRICE_IN_CENTS,
          },
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
