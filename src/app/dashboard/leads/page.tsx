import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import styles from "../dashboard.module.css";
import Image from "next/image";

const prisma = new PrismaClient();

export default async function LeadsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { auth_id: userId },
    include: {
      leads: {
        orderBy: { created_at: 'desc' },
      },
    },
  });

  const leads = user?.leads || [];

  return (
    <div className="animate-fade-in">
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Lead History</h1>
        <p className={styles.pageDescription}>View leads captured from your widget and their generated watercolor sketches.</p>
      </header>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Captured Leads ({leads.length})</h2>
        
        {leads.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No leads captured yet. Embed your widget to get started!</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Address</th>
                  <th>Email</th>
                  <th>Seller Intent</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      {lead.s3_image_url ? (
                        <img 
                          src={lead.s3_image_url} 
                          alt="Home Sketch" 
                          className={styles.thumbnail}
                        />
                      ) : (
                        <div className={styles.thumbnail} style={{ backgroundColor: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Image</span>
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{lead.address}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{lead.lead_email}</td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.875rem',
                        backgroundColor: lead.seller_intent ? 'rgba(236, 72, 153, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                        color: lead.seller_intent ? 'var(--secondary)' : 'var(--text-muted)'
                      }}>
                        {lead.seller_intent || "N/A"}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
