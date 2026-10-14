import { TOOLKITS } from "@/lib/toolkits";

const aliases: Record<string, string[]> = {
  "30-day-tax-office": ["30-day-tax-office-launch", "30-day-launch", "30daylaunch"],
  "due-diligence-course": ["due-diligence", "staff-audit-ready", "staff-audit-ready-due-diligence"],
  "irs-fine-defense": ["irsfinedefense", "irs-fine-defense-masterclass"],
  "schedule-c-reconstruction": ["schedule-c", "schedulecrecon"],
  "audit-playbook": ["irs-audit-playbook", "auditplaybook", "audit-ready-playbook"],
  "credits-filing-status": ["credits", "credits-filing-status-explained"],
};

interface MemberProducts {
  toolkitPurchases?: { toolkitId: string }[];
  enrollments?: { courseId: string }[];
}

/** Count recognized products, never membership/coupon bookkeeping records. */
export function getUserProductSummary(user: MemberProducts) {
  const ids = new Set((user.toolkitPurchases ?? []).map(item => item.toolkitId.toLowerCase()));
  const hasBundlePlus = ids.has("bundle:ultimate-bundle-plus") || ids.has("ultimate-bundle-plus");
  const hasBundle = ids.has("bundle:ultimate-bundle") || ids.has("ultimate-bundle");
  const toolkitsCount = hasBundlePlus || hasBundle ? TOOLKITS.length : TOOLKITS.filter(toolkit =>
    [toolkit.id, ...(aliases[toolkit.id] ?? [])].some(id =>
      ids.has(id) || ids.has(`toolkit:${id}`) || ids.has(`bundle:${id}`)
    )
  ).length;
  const coursesCount = hasBundlePlus ? 6 : new Set((user.enrollments ?? []).map(item => item.courseId)).size;
  return { hasBundlePlus, hasBundle, toolkitsCount, coursesCount, totalCount: toolkitsCount + coursesCount };
}
