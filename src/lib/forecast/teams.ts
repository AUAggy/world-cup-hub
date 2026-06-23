export interface ForecastGroup {
  id: string;
  teams: string[];
}

export const FORECAST_GROUPS: ForecastGroup[] = [
  { id: "A", teams: ["Mexico", "South Africa", "South Korea", "Czechia"] },
  { id: "B", teams: ["Canada", "Bosnia and Herzegovina", "Switzerland", "Qatar"] },
  { id: "C", teams: ["Brazil", "Morocco", "Haiti", "Scotland"] },
  { id: "D", teams: ["USA", "Paraguay", "Turkey", "Australia"] },
  { id: "E", teams: ["Germany", "Curacao", "Ivory Coast", "Ecuador"] },
  { id: "F", teams: ["Netherlands", "Japan", "Sweden", "Tunisia"] },
  { id: "G", teams: ["Belgium", "Egypt", "Iran", "New Zealand"] },
  { id: "H", teams: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"] },
  { id: "I", teams: ["France", "Senegal", "Iraq", "Norway"] },
  { id: "J", teams: ["Argentina", "Algeria", "Austria", "Jordan"] },
  { id: "K", teams: ["Portugal", "Congo DR", "Uzbekistan", "Colombia"] },
  { id: "L", teams: ["England", "Croatia", "Ghana", "Panama"] },
];

const NAME_MAP: Record<string, string> = {
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  Bosnia: "Bosnia and Herzegovina",
  "Bosnia and Herzegovina": "Bosnia and Herzegovina",
  "Cabo Verde": "Cape Verde",
  "Cape Verde": "Cape Verde",
  "Congo DR": "Congo DR",
  "Cote d'Ivoire": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  Curacao: "Curacao",
  Curaçao: "Curacao",
  "Czech Republic": "Czechia",
  Czechia: "Czechia",
  "DR Congo": "Congo DR",
  "IR Iran": "Iran",
  Iran: "Iran",
  "Ivory Coast": "Ivory Coast",
  "Korea Republic": "South Korea",
  "South Korea": "South Korea",
  Turkiye: "Turkey",
  Türkiye: "Turkey",
  Turkey: "Turkey",
  "United States": "USA",
  USA: "USA",
};

export function normalizeTeamName(name: string): string {
  const trimmed = name.trim();
  return NAME_MAP[trimmed] ?? trimmed;
}

export function groupForTeam(team: string): string | null {
  const normalized = normalizeTeamName(team);
  for (const group of FORECAST_GROUPS) {
    if (group.teams.includes(normalized)) return group.id;
  }
  return null;
}
