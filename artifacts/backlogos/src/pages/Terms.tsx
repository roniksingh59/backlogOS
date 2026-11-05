import { Link } from 'wouter';
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, Shield, Mail } from 'lucide-react';

export function Terms() {
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
            <FileText size={13} className="text-primary" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please read these Terms of Service carefully before creating an account or utilizing BacklogOS. By accessing or using our services, you agree to be bound by these Terms.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <CheckCircle size={16} className="text-primary" />
              1. Acceptable Use of BacklogOS
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              BacklogOS is provided strictly for academic, personal learning, and study organizational purposes for secondary school students. You agree not to misuse the platform, attempt unauthorized access to other students&apos; accounts, reverse engineer backend systems, inject malicious scripts, or disrupt the reliability of the application.
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <Shield size={16} className="text-primary" />
              2. Student Account Responsibilities
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              When creating an account, you agree to provide truthful and accurate information regarding your academic stream and credentials. You are responsible for safeguarding your login credentials and for all activities conducted under your account. Notify us immediately if you suspect unauthorized access.
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <AlertTriangle size={16} className="text-primary" />
              3. Educational Content &amp; Curriculum Limitations
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              BacklogOS provides curriculum blueprints, syllabus chapter taxonomies, study planners, and estimation tools based on publicly available CBSE educational guidelines. While we strive for complete syllabus fidelity, BacklogOS is an independent study aid and is not affiliated with, endorsed by, or administered by the Central Board of Secondary Education (CBSE) or any official examination board. Study estimations (such as estimated hours or pacing metrics) are heuristic guidelines and do not guarantee specific academic examination scores.
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              4. Intellectual Property &amp; User-Generated Notes
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              The BacklogOS software, branding, user interface design, and algorithms are proprietary property. You retain ownership of all personal study notes, annotations, and study reflections that you author on the platform. By entering notes, you grant BacklogOS the technical license required to store, format, and display those notes back to your authenticated account across devices.
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              5. Provisions for Minor Students
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              BacklogOS is intended for secondary school students, including students who may be minors (typically ages 13 to 18). If you are under the age of majority in your jurisdiction, you represent that you have received permission from a parent or legal guardian to access and use the platform.
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              6. Service Availability &amp; Account Termination
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              We continually enhance and update the platform. We reserve the right to suspend or terminate accounts that violate acceptable use policies, attempt to breach security controls, or spam system endpoints. We do not guarantee uninterrupted or error-free operation at all times.
            </p>
          </section>

          <section className="space-y-2 border border-border/60 rounded-xl p-5 bg-card/40">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-foreground">
              <Mail size={16} className="text-primary" />
              7. Contact Information
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              For questions concerning these Terms of Service or official inquiries, please contact our support desk:
            </p>
            <div className="font-mono text-xs bg-muted/50 p-3 rounded-lg border border-border/50 text-foreground">
              Official Support Contact: <span className="text-primary font-semibold">[support@backlogos.app]</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-border/70 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
          <span>&copy; {new Date().getFullYear()} BacklogOS. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors underline underline-offset-4">
              Privacy Policy
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
export default Terms;
