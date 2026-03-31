import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProjects } from "../../lib/api";

type ProjectsPageProps = {
  theme: "dark" | "light";
};

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ theme }) => {
  const isDark = theme === "dark";
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Projects</h1>
        <p className="text-sm text-zinc-500 mt-1">Membership-aware project access.</p>
      </div>

      {projectsQuery.isLoading && <div className="text-sm text-zinc-500">Loading projects...</div>}
      {projectsQuery.isError && <div className="text-sm text-rose-500">Failed to load projects.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(projectsQuery.data ?? []).map((project) => (
          <div
            key={project.id}
            className={`border rounded-xl p-4 space-y-2 ${
              isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            }`}
          >
            <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{project.name}</h2>
            <p className="text-xs text-zinc-500">{project.id}</p>
            <div className="flex items-center gap-4 text-xs">
              <Link to={`/projects/${project.id}?tab=summary`} className="text-blue-500 hover:underline">
                Open project shell
              </Link>
              <Link to={`/projects/${project.id}/api-keys`} className="text-blue-500 hover:underline">
                API keys
              </Link>
              <Link to={`/projects/${project.id}/memberships`} className="text-blue-500 hover:underline">
                Project memberships
              </Link>
              {project.org_id && (
                <Link to={`/orgs/${project.org_id}/memberships`} className="text-blue-500 hover:underline">
                  Org memberships
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
