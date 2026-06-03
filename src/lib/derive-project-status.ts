import { IMilestone } from "@/models/milestone";

interface StatusInfo {
  _id: string;
  label: string;
}

export function deriveProjectStatus(
  milestones: Pick<IMilestone, "statusId">[],
  statuses: StatusInfo[]
): string | null {
  if (milestones.length === 0) return null;

  const statusMap = new Map(statuses.map((s) => [s._id.toString(), s.label]));
  const labels = milestones.map((m) => statusMap.get(m.statusId.toString()) ?? "");

  if (labels.every((l) => l === "Done")) {
    return findStatusId(statuses, "Done");
  }
  if (labels.some((l) => l === "Blocked")) {
    return findStatusId(statuses, "Blocked");
  }
  if (labels.some((l) => l === "In Progress")) {
    return findStatusId(statuses, "In Progress");
  }
  if (labels.some((l) => l === "Needs Review")) {
    return findStatusId(statuses, "Needs Review");
  }
  if (labels.some((l) => l === "Ready")) {
    return findStatusId(statuses, "Ready");
  }
  return findStatusId(statuses, "Draft");
}

function findStatusId(statuses: StatusInfo[], label: string): string | null {
  const status = statuses.find((s) => s.label === label);
  return status ? status._id.toString() : null;
}

export function computeProjectedEnd(
  targetEndDate: Date,
  milestones: Pick<IMilestone, "plannedEnd">[]
): Date {
  if (milestones.length === 0) return targetEndDate;

  const latestMilestoneEnd = milestones.reduce((latest, m) => {
    const end = new Date(m.plannedEnd);
    return end > latest ? end : latest;
  }, new Date(0));

  const target = new Date(targetEndDate);
  return latestMilestoneEnd > target ? latestMilestoneEnd : target;
}
