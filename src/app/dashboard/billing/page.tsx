import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import styles from "../dashboard.module.css";
import CheckoutButton from "./CheckoutButton";

const prisma = new PrismaClient();

export default async function BillingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { auth_id: userId },
  });

  const credits = user?.available_credits || 0;

  return (
    <div className="animate-fade-in">
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Billing & Credits</h1>
        <p className={styles.pageDescription}>Manage your available generations and purchase more credits.</p>
      </header>

      <div className={styles.card} style={{ maxWidth: '500px' }}>
        <h2 className={styles.cardTitle}>Current Balance</h2>
        
        <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '1rem 0', color: 'var(--primary)' }}>
          {credits} <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Credits</span>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Each lead generation (including AI watercolor processing, S3 storage, and Thanks.io postcard) costs 1 credit.
        </p>

        <CheckoutButton />
      </div>
    </div>
  );
}

