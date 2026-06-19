import { describe, expect, test } from "bun:test";
import { groupForTeam, normalizeTeamName } from "../../src/lib/forecast/teams";

describe("normalizeTeamName", () => {
  test("maps provider names to canonical World Cup names", () => {
    expect(normalizeTeamName("United States")).toBe("USA");
    expect(normalizeTeamName("Korea Republic")).toBe("South Korea");
    expect(normalizeTeamName("IR Iran")).toBe("Iran");
    expect(normalizeTeamName("DR Congo")).toBe("Congo DR");
    expect(normalizeTeamName("Czech Republic")).toBe("Czechia");
    expect(normalizeTeamName("Bosnia-Herzegovina")).toBe("Bosnia and Herzegovina");
    expect(normalizeTeamName("Cote d'Ivoire")).toBe("Ivory Coast");
  });

  test("trims unknown names without inventing mappings", () => {
    expect(normalizeTeamName(" Brazil ")).toBe("Brazil");
  });
});

describe("groupForTeam", () => {
  test("finds groups after normalization", () => {
    expect(groupForTeam("United States")).toBe("D");
    expect(groupForTeam("DR Congo")).toBe("K");
  });

  test("returns null for unknown teams", () => {
    expect(groupForTeam("Atlantis")).toBeNull();
  });
});
