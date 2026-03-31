import { Project } from "../../lib/api";

export const resolveSelectedProjectId = (
  projects: Project[],
  selectedProjectId: string | null
) => {
  if (!projects.length) {
    return null;
  }

  if (!selectedProjectId) {
    return projects[0].id;
  }

  const hasSelectedProject = projects.some((project) => project.id === selectedProjectId);
  if (hasSelectedProject) {
    return selectedProjectId;
  }

  return projects[0].id;
};
