import { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Archive,
  RotateCcw,
  Check,
  BookOpen,
  Settings,
  HelpCircle,
  FolderPlus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit2,
} from 'lucide-react';
import {
  readEducationProfile,
  saveEducationProfile,
  addCustomSubject,
  archiveSubject,
  unarchiveSubject,
  reorderEnrolledSubjects,
  updateCustomSubject,
} from '@/lib/curriculum/user-profile-storage';
import { getAvailableSubjectsForGrade } from '@/lib/curriculum/registry';
import { type CurriculumSubject } from '@/lib/curriculum/types';

interface SubjectManagementModalProps {
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export function SubjectManagementModal({ onClose, onProfileUpdated }: SubjectManagementModalProps) {
  const [profile, setProfile] = useState(() => readEducationProfile());
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customHours, setCustomHours] = useState('6');
  const [customChaptersText, setCustomChaptersText] = useState('Unit 1: Foundations\nUnit 2: Core Principles\nUnit 3: Applications');

  const allGradeSubjects = useMemo(
    () => getAvailableSubjectsForGrade(profile.grade),
    [profile.grade]
  );

  const enrolledSubjects = useMemo(
    () =>
      profile.enrolledSubjectIds
        .map((id) => allGradeSubjects.find((s) => s.id === id))
        .filter((s): s is CurriculumSubject => Boolean(s)),
    [allGradeSubjects, profile.enrolledSubjectIds]
  );

  const archivedSubjects = useMemo(
    () => allGradeSubjects.filter((s) => profile.archivedSubjectIds.includes(s.id)),
    [allGradeSubjects, profile.archivedSubjectIds]
  );

  const availableToAdd = useMemo(
    () =>
      allGradeSubjects.filter(
        (s) =>
          !profile.enrolledSubjectIds.includes(s.id) &&
          !profile.archivedSubjectIds.includes(s.id)
      ),
    [allGradeSubjects, profile.enrolledSubjectIds, profile.archivedSubjectIds]
  );

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const ids = [...profile.enrolledSubjectIds];
    const temp = ids[index];
    ids[index] = ids[index - 1];
    ids[index - 1] = temp;
    reorderEnrolledSubjects(ids);
    setProfile(readEducationProfile());
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleMoveDown = (index: number) => {
    if (index >= profile.enrolledSubjectIds.length - 1) return;
    const ids = [...profile.enrolledSubjectIds];
    const temp = ids[index];
    ids[index] = ids[index + 1];
    ids[index + 1] = temp;
    reorderEnrolledSubjects(ids);
    setProfile(readEducationProfile());
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleStartEditCustom = (sub: CurriculumSubject) => {
    setEditingCustomId(sub.id);
    setCustomName(sub.name);
    setCustomCode(sub.code);
    setIsAddingCustom(false);
  };

  const handleSaveEditCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomId || !customName.trim()) return;
    updateCustomSubject(editingCustomId, {
      name: customName.trim(),
      code: customCode.trim() || 'CUSTOM',
    });
    setEditingCustomId(null);
    setCustomName('');
    setCustomCode('');
    setProfile(readEducationProfile());
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleEnrollSubject = (subjectId: string) => {
    const updated = {
      ...profile,
      enrolledSubjectIds: [...profile.enrolledSubjectIds, subjectId],
    };
    saveEducationProfile(updated);
    setProfile(updated);
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleArchiveSubject = (subjectId: string) => {
    archiveSubject(subjectId);
    setProfile(readEducationProfile());
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleUnarchiveSubject = (subjectId: string) => {
    unarchiveSubject(subjectId);
    setProfile(readEducationProfile());
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const initialChapters = customChaptersText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title) => ({
        title,
        estimatedHours: parseFloat(customHours) || 6,
      }));

    addCustomSubject({
      name: customName.trim(),
      code: customCode.trim() || 'CUSTOM',
      class: profile.grade,
      initialChapters: initialChapters.length > 0 ? initialChapters : [{ title: `${customName} Module 1`, estimatedHours: 6 }],
    });

    setProfile(readEducationProfile());
    setIsAddingCustom(false);
    setCustomName('');
    setCustomCode('');
    if (onProfileUpdated) onProfileUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
              Curriculum & Enrolled Subjects
            </span>
            <h2 className="font-display text-xl font-bold text-foreground mt-0.5">
              Subject Management (Class {profile.grade} CBSE)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Enrolled Subjects List */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Currently Enrolled Subjects ({enrolledSubjects.length})
            </span>
            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="text-xs font-mono text-foreground font-bold hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add Custom Subject
            </button>
          </div>

          <div className="divide-y divide-border border border-border bg-background text-xs font-mono">
            {enrolledSubjects.map((sub, idx) => (
              <div key={sub.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground font-sans text-sm">
                      {sub.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Code: {sub.code}
                    </span>
                    {sub.isCustom && (
                      <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.2 text-[9px] text-primary">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
                    {sub.chapterIds.length} syllabus chapter(s)
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Reorder Buttons */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveUp(idx)}
                    title="Move up in order"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === enrolledSubjects.length - 1}
                    onClick={() => handleMoveDown(idx)}
                    title="Move down in order"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={14} />
                  </button>

                  {/* Edit Custom Subject */}
                  {sub.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleStartEditCustom(sub)}
                      title="Edit custom subject"
                      className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1"
                    >
                      <Edit2 size={11} />
                      <span>Edit</span>
                    </button>
                  )}

                  {/* Archive Subject */}
                  <button
                    type="button"
                    onClick={() => handleArchiveSubject(sub.id)}
                    title="Archive subject (preserves backlog history)"
                    className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5"
                  >
                    <Archive size={12} />
                    <span>Archive</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add from CBSE Catalogue */}
        {availableToAdd.length > 0 && (
          <div className="mt-6 space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
              Available CBSE Subjects for Class {profile.grade}
            </span>
            <div className="divide-y divide-border border border-border bg-background text-xs font-mono">
              {availableToAdd.map((sub) => (
                <div key={sub.id} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground font-sans">{sub.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">Code: {sub.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEnrollSubject(sub.id)}
                    className="rounded bg-foreground text-background px-3 py-1 font-bold hover:bg-foreground/90 transition text-xs flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Enroll</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Archived Subjects */}
        {archivedSubjects.length > 0 && (
          <div className="mt-6 space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
              Archived Subjects (Preserved in History)
            </span>
            <div className="divide-y divide-border border border-border bg-muted/10 text-xs font-mono">
              {archivedSubjects.map((sub) => (
                <div key={sub.id} className="p-2.5 flex items-center justify-between text-muted-foreground">
                  <span>{sub.name} (Code: {sub.code})</span>
                  <button
                    type="button"
                    onClick={() => handleUnarchiveSubject(sub.id)}
                    className="rounded border border-border px-2.5 py-1 text-xs text-foreground hover:bg-muted flex items-center gap-1"
                  >
                    <RotateCcw size={12} />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Subject Drawer / Form */}
        {isAddingCustom && (
          <div className="mt-6 border border-border bg-muted/20 p-4 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold text-foreground font-sans">
                + Add Custom Subject (State Board / Elective / International)
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Biotechnology, Legal Studies"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full rounded border border-border bg-background p-2 text-xs font-sans text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1">
                    Code / Board (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 045 or STATE"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="w-full rounded border border-border bg-background p-2 text-xs font-sans text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1">
                  Initial Chapters / Syllabus Topics (One per line)
                </label>
                <textarea
                  rows={3}
                  value={customChaptersText}
                  onChange={(e) => setCustomChaptersText(e.target.value)}
                  className="w-full rounded border border-border bg-background p-2 text-xs font-sans text-foreground focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-foreground text-background px-4 py-1.5 font-bold hover:bg-foreground/90 transition text-xs"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Custom Subject Form */}
        {editingCustomId && (
          <div className="mt-6 border border-border bg-muted/20 p-4 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold text-foreground font-sans">
                Edit Custom Subject
              </span>
              <button
                type="button"
                onClick={() => setEditingCustomId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustom} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full rounded border border-border bg-background p-2 text-xs font-sans text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1">
                    Code / Board (Optional)
                  </label>
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="w-full rounded border border-border bg-background p-2 text-xs font-sans text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomId(null)}
                  className="rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-foreground text-background px-4 py-1.5 font-bold hover:bg-foreground/90 transition text-xs"
                >
                  Update Subject
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
