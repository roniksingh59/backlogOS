import { Link } from 'wouter';
import { ArrowLeft, Shield, Lock, Database, Mail, BookOpen } from 'lucide-react';

export function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans py-8 px-4 sm:px-6 lg:px-8 selection:bg-foreground selection:text-background">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Back */}
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to BacklogOS</span>
          </Link>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Effective Date: November 2026
          </span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium">
            <Shield size={13} className="text-primary" />
            <span>Privacy Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This Privacy Policy explains how BacklogOS (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the platform&rdquo;) collects, stores, protects, and handles your information when you use our web application.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <BookOpen size={16} className="text-primary" />
              1. What BacklogOS Does
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              BacklogOS is an educational productivity and study planning platform built for Indian secondary students (CBSE Classes 9–12). The application assists students in organizing their curriculum, tracking completed syllabus chapters, calculating recovery timelines, logging study intervals, and managing revision notes.
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <Lock size={16} className="text-primary" />
              2. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              We collect information that you provide directly when creating an account or using the application:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-muted-foreground pl-1">
              <li><strong className="text-foreground">Account Credentials:</strong> Email address and encrypted password credentials managed through our authentication provider.</li>
              <li><strong className="text-foreground">Profile Information:</strong> Display name, profile avatar, CBSE class/grade (e.g., Class 9, 10, 11, or 12), and optional phone number if submitted during profile configuration.</li>
              <li><strong className="text-foreground">Academic &amp; Study Records:</strong> Selected CBSE subjects, syllabus chapters, study plans, logged focus timer sessions, chapter completion marks, personal revision notes, formula bookmarks, and practice checklist statuses.</li>
            </ul>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <Shield size={16} className="text-primary" />
              3. Google Sign-In &amp; OAuth Usage
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              When you choose to authenticate via Google Sign-In, we receive basic identity information permitted by your Google account consent screen (specifically your email address, display name, and avatar picture). We use this information solely to identify your account and personalize your study dashboard. We do not access your Google Drive files, emails, contacts, or external Google services.
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <Database size={16} className="text-primary" />
              4. Data Processing, Storage &amp; Infrastructure
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              BacklogOS utilizes Supabase (PostgreSQL) and cloud infrastructure to securely authenticate users and persist study records:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-muted-foreground pl-1">
              <li>Authentication tokens and user passwords are encrypted cryptographically; plaintext passwords are never stored or accessible by BacklogOS administrators.</li>
              <li>Private database records are scoped using user identifiers and database Row Level Security (RLS) policies so that students can only access their own academic records.</li>
              <li>Non-sensitive offline state and interface preferences may be temporarily cached in browser local storage for offline responsiveness.</li>
            </ul>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              5. Data Sharing &amp; Third-Party Services
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              We do not sell, rent, or trade your personal or academic study information to advertisers or marketing networks. Information is only processed through service infrastructure required to host and deliver the platform (such as Supabase for database hosting, Netlify and Cloud Run for web hosting, and Google Cloud for infrastructure).
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              6. Data Retention, Security &amp; Deletion
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Your study records are retained as long as your account remains active. If you wish to delete your account, study plans, or associated data, you may submit a deletion request to our support contact. Upon receipt and verification, your personal records will be removed from active databases.
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <Mail size={16} className="text-primary" />
              7. Contact &amp; Support
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              For any questions, concerns, or requests regarding this Privacy Policy or your student data, please contact our team at:
            </p>
            <div className="font-mono text-xs bg-muted/50 p-3 rounded-lg border border-border/50 text-foreground">
              Official Support Email: <span className="text-primary font-semibold">[support@backlogos.app]</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-border/70 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
          <span>&copy; {new Date().getFullYear()} BacklogOS. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors underline underline-offset-4">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Privacy;
