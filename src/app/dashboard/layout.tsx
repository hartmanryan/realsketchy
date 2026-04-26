"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import styles from "./dashboard.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className="text-gradient">AI Home Sketch</span>
        </div>
        
        <nav className={styles.nav}>
          <Link 
            href="/dashboard" 
            className={`${styles.navLink} ${pathname === "/dashboard" ? styles.navLinkActive : ""}`}
          >
            Overview & Setup
          </Link>
          <Link 
            href="/dashboard/leads" 
            className={`${styles.navLink} ${pathname === "/dashboard/leads" ? styles.navLinkActive : ""}`}
          >
            Lead History
          </Link>
          <Link 
            href="/dashboard/billing" 
            className={`${styles.navLink} ${pathname === "/dashboard/billing" ? styles.navLinkActive : ""}`}
          >
            Billing
          </Link>
        </nav>

        <div className={styles.userContainer}>
          <UserButton showName />
        </div>
      </aside>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
