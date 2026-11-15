"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  BookOpen,
  Calendar,
  Megaphone,
  Briefcase,
  CheckCircle2,
  Sun,
  Moon,
  Clock as ClockIcon,
  ChevronRight,
  Shield,
  Layers,
  GraduationCap
} from "lucide-react";
import Clock from "@/components/Clock";

interface HodCommandLayoutProps {
  children: React.ReactNode;
}

export default function HodCommandLayout({ children }: HodCommandLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hodInfo, setHodInfo] = useState<any>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  // Sync theme
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  useEffect(() => {
    fetch("/api/hod/dashboard")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setHodInfo(res.data.hod || res.data.teacher);
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    {
      id: "dashboard",
      href: "/hod",
      label: "Department Command",
      subLabel: "Overview & Day Order",
      Icon: Briefcase,
    },
    {
      id: "department",
      href: "/hod/department",
      label: "Department Metrics",
      subLabel: "Workload & Stats",
      Icon: Layers,
    },
    {
      id: "courses",
      href: "/hod/courses",
      label: "Course Allocations",
      subLabel: "Curriculum & Credits",
      Icon: BookOpen,
    },
    {
      id: "faculty",
      href: "/hod/faculty",
      label: "Faculty Directory",
      subLabel: "Staff & Workloads",
      Icon: Users,
    },
    {
      id: "attendance",
      href: "/teacher/attendance",
      label: "Take Attendance",
      subLabel: "Direct Period Roll Call",
      Icon: CheckCircle2,
    },
    {
      id: "notices",
      href: "/hod/notices",
      label: "Announcements",
      subLabel: "Broadcast to Dept",
      Icon: Megaphone,
    },
  ];

  // Derive active header title
  const activeNav = navItems.find((n) => pathname === n.href || (n.href !== "/hod" && pathname.startsWith(n.href))) || navItems[0];

  return (
    <div className="admin-layout" data-theme={theme}>
      {/* Mobile Backdrop */}
      <div
        className={`admin-sidebar-overlay ${isMobileSidebarOpen ? "open" : ""}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* LEFT SIDEBAR - Identical to Admin Mode */}
      <aside className={`admin-sidebar ${isMobileSidebarOpen ? "open" : ""}`}>
        <div>
          {/* Brand Heading */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid var(--border-subtle)",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                backgroundColor: "var(--royal-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "1.05rem",
                color: "white",
                boxShadow: "0 2px 6px rgba(10, 102, 194, 0.3)",
              }}
            >
              in
            </div>
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0, letterSpacing: "-0.01em" }}>VM-HUB</h2>
              <span style={{ fontSize: "0.725rem", color: "#f59e0b", fontWeight: "700" }}>HOD Leadership Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {navItems.map((nav) => {
              const isSelected = pathname === nav.href || (nav.href !== "/hod" && pathname.startsWith(nav.href));

              return (
                <button
                  key={nav.id}
                  onClick={() => {
                    router.push(nav.href);
                    setIsMobileSidebarOpen(false);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    padding: "0.65rem 0.9rem",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: isSelected ? "700" : "600",
                    fontSize: "0.85rem",
                    backgroundColor: isSelected ? "rgba(10, 102, 194, 0.1)" : "transparent",
                    color: isSelected ? "var(--royal-blue)" : "var(--text-muted)",
                    borderLeft: isSelected ? "3px solid var(--royal-blue)" : "3px solid transparent",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <nav.Icon size={17} style={{ color: isSelected ? "var(--royal-blue)" : "inherit" }} />
                    <span>{nav.label}</span>
                  </span>
                  <span style={{ fontSize: "0.75rem", color: isSelected ? "var(--royal-blue)" : "var(--text-muted)", opacity: 0.7 }}>
                    ›
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Profile Card, Dark/Light, Sign Out */}
        <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* User Profile Card */}
          <div
            onClick={() => setShowProfileDrawer(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "10px",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--sky-blue)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                backgroundColor: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                color: "white",
                fontSize: "0.95rem",
                border: "2px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {hodInfo?.name ? hodInfo.name.charAt(0).toUpperCase() : "H"}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "var(--text-main)" }}>
                {hodInfo?.name || "Head of Department"}
              </div>
              <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {hodInfo?.department ? `Dept of ${hodInfo.department}` : "Department Lead"}
              </div>
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>›</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: "100%",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-main)",
              border: "1px solid var(--border-subtle)",
              padding: "0.6rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? (
              <>
                <Sun size={16} /> Light Mode
              </>
            ) : (
              <>
                <Moon size={16} /> Dark Mode
              </>
            )}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              color: "#ef4444",
              fontSize: "0.85rem",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              padding: "0.6rem",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA - Matches Admin Style */}
      <main className="admin-main">
        {/* Top Header with Live Clock (Same as Admin) */}
        <header className="admin-header-container">
          <div className="admin-header-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button className="hamburger-btn" onClick={() => setIsMobileSidebarOpen(true)}>
                ☰
              </button>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, fontFamily: "var(--font-serif, serif)" }}>
                    {activeNav?.label || "Department Command"}
                  </h1>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "12px",
                      backgroundColor: "rgba(245, 158, 11, 0.15)",
                      color: "#f59e0b",
                      fontWeight: "700",
                      letterSpacing: "0.04em",
                    }}
                  >
                    HOD LEADERSHIP
                  </span>
                </div>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {activeNav?.subLabel} • Vel Tech Multi Tech Autonomous ERP
                </p>
              </div>
            </div>

            {/* Campus Clock - Exact same as Admin Header */}
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
              <Clock size={90} subtext="CAMPUS" />
            </div>
          </div>
        </header>

        {/* View Content Slot */}
        <div style={{ padding: "0.5rem 0" }}>
          {children}
        </div>
      </main>

      {/* HOD PROFILE DRAWER */}
      {showProfileDrawer && (
        <div className="admin-drawer-container" onClick={() => setShowProfileDrawer(false)}>
          <aside onClick={(e) => e.stopPropagation()} className="admin-drawer">
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  marginBottom: "1.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "800",
                    color: "#f59e0b",
                    letterSpacing: "0.05em",
                  }}
                >
                  HOD PROFILE DOSSIER
                </span>
                <button
                  onClick={() => setShowProfileDrawer(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Profile Avatar & Identity */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                  }}
                >
                  {hodInfo?.name ? hodInfo.name.charAt(0) : "H"}
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: 0 }}>
                    {hodInfo?.name || "Head of Department"}
                  </h3>
                  <span
                    style={{
                      padding: "0.15rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      backgroundColor: "rgba(245, 158, 11, 0.15)",
                      color: "#f59e0b",
                    }}
                  >
                    DEPARTMENT LEAD
                  </span>
                </div>
              </div>

              {/* Details Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.875rem" }}>
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    backgroundColor: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
                    DEPARTMENT LEADERSHIP
                  </span>
                  <strong style={{ color: "var(--text-main)" }}>
                    Department of {hodInfo?.department || "Computer Science and Engineering"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    backgroundColor: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
                    DESIGNATION
                  </span>
                  <strong style={{ color: "var(--sky-blue)" }}>
                    Professor & Head of Department
                  </strong>
                </div>

                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    backgroundColor: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
                    OFFICIAL EMAIL
                  </span>
                  <strong style={{ color: "var(--text-main)" }}>
                    {hodInfo?.email || "hod@vtmt.org"}
                  </strong>
                </div>

                <Link
                  href="/hod/profile"
                  onClick={() => setShowProfileDrawer(false)}
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.65rem",
                    borderRadius: "8px",
                    backgroundColor: "var(--royal-blue)",
                    color: "white",
                    fontWeight: "600",
                    textAlign: "center",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                  }}
                >
                  Manage Leadership Settings
                </Link>
              </div>
            </div>

            <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
              <button
                onClick={() => setShowProfileDrawer(false)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Close Drawer
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
