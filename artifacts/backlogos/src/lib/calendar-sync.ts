import { type DailyPlanSlot } from '@/lib/smart-planner';

/**
 * Generates a direct web Google Calendar Event creation link
 */
export function generateGoogleCalendarUrl(slot: {
  title: string;
  subject: string;
  durationMinutes: number;
  startTime?: Date;
  description?: string;
}): string {
  const start = slot.startTime || new Date();
  const end = new Date(start.getTime() + slot.durationMinutes * 60 * 1000);

  const formatGoogleDate = (d: Date) =>
    d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const text = encodeURIComponent(`[BacklogOS] ${slot.subject}: ${slot.title}`);
  const details = encodeURIComponent(
    slot.description ||
      `Dedicated ${slot.durationMinutes}-minute BacklogOS focus sprint for ${slot.title}.\n- Focus on NCERT in-text examples\n- Clear core backlog bottlenecks.`
  );
  const dates = `${formatGoogleDate(start)}/${formatGoogleDate(end)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${dates}`;
}

/**
 * Downloads a standard .ics calendar file containing today's study slots
 */
export function downloadDailyPlanIcs(slots: DailyPlanSlot[], dayLabel: string = 'Today') {
  const now = new Date();
  let currentStart = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins from now

  const events = slots
    .filter((s) => s.status !== 'completed')
    .map((slot, idx) => {
      const start = new Date(currentStart.getTime());
      const end = new Date(start.getTime() + slot.durationMinutes * 60 * 1000);
      currentStart = new Date(end.getTime() + 10 * 60 * 1000); // 10 min break

      const formatIcsDate = (d: Date) =>
        d.toISOString().replace(/-|:|\.\d\d\d/g, '');

      return `BEGIN:VEVENT
UID:backlogos-${Date.now()}-${idx}@backlogos.app
DTSTAMP:${formatIcsDate(now)}
DTSTART:${formatIcsDate(start)}
DTEND:${formatIcsDate(end)}
SUMMARY:[BacklogOS] ${slot.subject}: ${slot.chapterTitle}
DESCRIPTION:BacklogOS ${slot.durationMinutes}-minute study sprint for ${slot.chapterTitle} (${slot.focusArea}).
STATUS:CONFIRMED
END:VEVENT`;
    })
    .join('\n');

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BacklogOS//Study Schedule Sync//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:BacklogOS ${dayLabel} Study Plan
${events}
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `BacklogOS-Study-Plan-${new Date().toISOString().slice(0, 10)}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
