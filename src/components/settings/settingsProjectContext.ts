import { Project } from "../../lib/api";

export type SelectedProjectOrgContext = {
  projectId: string;
  orgId: string;
};

export const resolveSelectedProjectOrgContext = (
  projects: Project[] | undefined,
  selectedProjectId: string | null
): SelectedProjectOrgContext | null => {
  if (!selectedProjectId || !projects?.length) {
    return null;
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  if (!selectedProject?.org_id) {
    return null;
  }

  return {
    projectId: selectedProject.id,
    orgId: selectedProject.org_id,
  };
};
