import { getGatheringProfession, getGatheringProfessionLabel } from "../map/resourceStyles";
import type { GatheringNode, GatheringNodeFilters, GatheringProfession } from "../types/gatheringNode";

type GatheringNodeFilterPanelProps = {
  filters: GatheringNodeFilters;
  resources: string[];
  territories: string[];
  visibleCount: number;
  totalCount: number;
  onChange: (filters: GatheringNodeFilters) => void;
};

const GATHERING_PROFESSIONS: Exclude<GatheringProfession, "UNKNOWN">[] = [
  "FARMING",
  "FISHING",
  "MINING",
  "WOODCUTTING",
];

export const DEFAULT_FILTERS: GatheringNodeFilters = {
  resourceQuery: "",
  minLevel: "",
  maxLevel: "",
  territory: "",
  onlyInTerritory: false,
  professions: {
    FARMING: true,
    FISHING: true,
    MINING: true,
    WOODCUTTING: true,
  },
};

export function filterGatheringNodes(
  nodes: GatheringNode[],
  filters: GatheringNodeFilters,
): GatheringNode[] {
  const resourceQuery = filters.resourceQuery.trim().toUpperCase();
  return nodes.filter((node) => {
    if (resourceQuery && !node.resource.includes(resourceQuery)) return false;
    if (filters.minLevel !== "" && node.level < filters.minLevel) return false;
    if (filters.maxLevel !== "" && node.level > filters.maxLevel) return false;
    if (filters.territory && node.territory !== filters.territory) return false;
    if (filters.onlyInTerritory && node.territory === null) return false;
    const profession = getGatheringProfession(node.resource);
    return profession !== "UNKNOWN" && filters.professions[profession];
  });
}

export function GatheringNodeFilterPanel({
  filters,
  resources,
  territories,
  visibleCount,
  totalCount,
  onChange,
}: GatheringNodeFilterPanelProps) {
  return (
    <aside className="filter-panel">
      <div className="panel-header">
        <div>
          <h2>Gathering Nodes</h2>
          <p>
            {visibleCount.toLocaleString()} / {totalCount.toLocaleString()} visible
          </p>
        </div>
        <button type="button" onClick={() => onChange(DEFAULT_FILTERS)}>
          Reset
        </button>
      </div>

      <label>
        Resource
        <input
          list="resource-options"
          value={filters.resourceQuery}
          placeholder="Search resource"
          onChange={(event) => onChange({ ...filters, resourceQuery: event.target.value })}
        />
      </label>
      <datalist id="resource-options">
        {resources.map((resource) => (
          <option key={resource} value={resource} />
        ))}
      </datalist>

      <div className="level-row">
        <label>
          Min level
          <input
            min="0"
            type="number"
            value={filters.minLevel}
            onChange={(event) =>
              onChange({
                ...filters,
                minLevel: event.target.value === "" ? "" : Number(event.target.value),
              })
            }
          />
        </label>
        <label>
          Max level
          <input
            min="0"
            type="number"
            value={filters.maxLevel}
            onChange={(event) =>
              onChange({
                ...filters,
                maxLevel: event.target.value === "" ? "" : Number(event.target.value),
              })
            }
          />
        </label>
      </div>

      <label>
        Territory
        <select
          value={filters.territory}
          onChange={(event) => onChange({ ...filters, territory: event.target.value })}
        >
          <option value="">All territories</option>
          {territories.map((territory) => (
            <option key={territory} value={territory}>
              {territory}
            </option>
          ))}
        </select>
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={filters.onlyInTerritory}
          onChange={(event) =>
            onChange({ ...filters, onlyInTerritory: event.target.checked })
          }
        />
        Only nodes in territories
      </label>

      <fieldset>
        <legend>Gathering type</legend>
        {GATHERING_PROFESSIONS.map((profession) => (
          <label className="checkbox-label" key={profession}>
            <input
              type="checkbox"
              checked={filters.professions[profession]}
              onChange={(event) =>
                onChange({
                  ...filters,
                  professions: {
                    ...filters.professions,
                    [profession]: event.target.checked,
                  },
                })
              }
            />
            {getGatheringProfessionLabel(profession)}
          </label>
        ))}
      </fieldset>
    </aside>
  );
}
