import { useMemo } from "react";
import { useProject, useProjects, type ProjectRef } from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsSection,
  SettingsSelect,
} from "@getpaseo/plugin/client/ui";
import type { ColorName } from "../../shared/preferences";
import { compareNames } from "../model";
import type { Preferences } from "../preferences";
import { useProjectDirectory } from "../runtime";
import { COLOR_OPTIONS } from "./options";

/**
 * A tag color per project; a project on several hosts is one entry. Needs a RuntimeProvider
 * above it for project view keys.
 */
export function ProjectsSection({ preferences }: { preferences: Preferences }) {
  const directory = useProjectDirectory();
  const refs = useProjects(
    useMemo(
      () => ({
        orderBy: (a: { displayName: string }, b: { displayName: string }) =>
          compareNames(a.displayName, b.displayName),
      }),
      [],
    ),
  );
  const projects = useMemo(() => {
    const seen = new Map<string, ProjectRef>();
    for (const ref of refs) {
      const viewKey = directory.viewKey(ref.hostId, ref.id);
      if (!seen.has(viewKey)) seen.set(viewKey, ref);
    }
    return [...seen];
  }, [refs, directory]);
  return (
    <SettingsSection title="Project colors">
      <SettingsCard>
        {projects.map(([viewKey, ref]) => (
          <ProjectColor key={viewKey} viewKey={viewKey} reference={ref} preferences={preferences} />
        ))}
        <SettingsAction
          label="Reset all project colors"
          hint="Every project goes back to its automatic color."
          actionLabel="Reset"
          disabled={Object.keys(preferences.values.projectColors).length === 0}
          onPress={() => preferences.update({ projectColors: {} })}
        />
      </SettingsCard>
    </SettingsSection>
  );
}

function ProjectColor({
  viewKey,
  reference,
  preferences,
}: {
  viewKey: string;
  reference: ProjectRef;
  preferences: Preferences;
}) {
  const name = useProject(reference, (project) => project.displayName) ?? viewKey;
  return (
    <SettingsSelect
      label={name}
      value={preferences.values.projectColors[viewKey] ?? "auto"}
      options={COLOR_OPTIONS}
      onValueChange={(color: ColorName | "auto") =>
        preferences.update((current) => {
          const next = { ...current.projectColors };
          if (color === "auto") delete next[viewKey];
          else next[viewKey] = color;
          return { projectColors: next };
        })
      }
    />
  );
}
