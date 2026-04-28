import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import styles from "./dashboard.module.css";
import { revalidatePath } from "next/cache";

export default async function DashboardOverview() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Ensure user and widget settings exist
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { auth_id: userId },
      include: { widget_settings: true },
    });
  } catch (error) {
    console.error("DATABASE_FETCH_ERROR", error);
    return (
      <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
        <h2>Database Connection Error</h2>
        <p>Please check your DATABASE_URL environment variable in Vercel.</p>
        <code style={{ display: 'block', marginTop: '1rem', background: '#333', padding: '1rem' }}>
          {JSON.stringify(error)}
        </code>
      </div>
    );
  }

  if (!user) {
    // We can fetch email from clerk in a real app, but for now we'll put a placeholder or fetch later
    user = await prisma.user.create({
      data: {
        auth_id: userId,
        email: `${userId}@placeholder.com`, // Usually fetched via Clerk webhooks
        widget_settings: {
          create: {}, // creates default widget settings with new UUID
        },
      },
      include: { widget_settings: true },
    });
  } else if (!user.widget_settings) {
    user = await prisma.user.update({
      where: { auth_id: userId },
      data: {
        widget_settings: {
          create: {},
        },
      },
      include: { widget_settings: true },
    });
  }

  const widgetUuid = user.widget_settings?.widget_uuid || "error-loading-uuid";
  const webhookUrl = user.widget_settings?.destination_webhook_url || "";
  const homeValuationUrl = user.widget_settings?.home_valuation_url || "";
  const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shareLink = `${domain}/p/${widgetUuid}`;

  // Server action to update webhook
  async function updateWebhook(formData: FormData) {
    "use server";
    const newWebhookUrl = formData.get("webhookUrl") as string;
    const { userId: actionUserId } = await auth();
    
    if (actionUserId) {
      const u = await prisma.user.findUnique({ where: { auth_id: actionUserId } });
      if (u) {
        await prisma.widgetSettings.update({
          where: { user_id: u.id },
          data: { destination_webhook_url: newWebhookUrl },
        });
        revalidatePath("/dashboard");
      }
    }
  }

  // Server action to update Home Valuation URL
  async function updateValuationUrl(formData: FormData) {
    "use server";
    const newUrl = formData.get("valuationUrl") as string;
    const { userId: actionUserId } = await auth();
    
    if (actionUserId) {
      const u = await prisma.user.findUnique({ where: { auth_id: actionUserId } });
      if (u) {
        await prisma.widgetSettings.update({
          where: { user_id: u.id },
          data: { home_valuation_url: newUrl },
        });
        revalidatePath("/dashboard");
      }
    }
  }

  return (
    <div className="animate-fade-in">
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Overview & Setup</h1>
        <p className={styles.pageDescription}>Access your shareable landing page and connect your CRM.</p>
      </header>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>1. Your Shareable Link</h2>
        <p>Share this link on your social media, email campaigns, or linktree to capture leads.</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            readOnly 
            value={shareLink} 
            className="input-field" 
            style={{ backgroundColor: 'var(--bg-base)', color: 'var(--primary)', fontWeight: 600 }}
          />
          <a href={shareLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}>
            Open Page
          </a>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>2. Connect Your CRM</h2>
        <p>Enter a webhook URL (from Zapier, Make, or your CRM) to receive lead data instantly when a homeowner submits the form.</p>
        
        <form action={updateWebhook} style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <input 
            type="url" 
            name="webhookUrl" 
            placeholder="https://hooks.zapier.com/..." 
            defaultValue={webhookUrl}
            className="input-field" 
            required
          />
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Save Webhook
          </button>
        </form>
      </div>

      <div className={styles.card} style={{ marginTop: '2rem' }}>
        <h2 className={styles.cardTitle}>3. Home Valuation URL (QR Code)</h2>
        <p>Enter a URL to direct homeowners to when they scan the QR code on the physical postcard. We will send an email notification to you when it is scanned.</p>
        
        <form action={updateValuationUrl} style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <input 
            type="url" 
            name="valuationUrl" 
            placeholder="https://your-website.com/home-valuation" 
            defaultValue={homeValuationUrl}
            className="input-field" 
            required
          />
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Save URL
          </button>
        </form>
      </div>
    </div>
  );
}
