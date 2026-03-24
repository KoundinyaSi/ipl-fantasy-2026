export interface TeamInfo {
  abbr: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  logoUrl: string;
}

const LOGO_BASE = "https://scores.iplt20.com/ipl/teamlogos";

export const IPL_TEAMS: Record<string, TeamInfo> = {
  "Mumbai Indians": {
    abbr: "MI",
    primaryColor: "#004BA0",
    secondaryColor: "#D1A435",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/MI.png`,
  },
  "Chennai Super Kings": {
    abbr: "CSK",
    primaryColor: "#F9CD05",
    secondaryColor: "#0081E9",
    textColor: "#1A1A1A",
    logoUrl: `${LOGO_BASE}/CSK.png`,
  },
  "Royal Challengers Bengaluru": {
    abbr: "RCB",
    primaryColor: "#EC1C24",
    secondaryColor: "#2B2A29",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/RCB.png`,
  },
  "Royal Challengers Bangalore": {
    abbr: "RCB",
    primaryColor: "#EC1C24",
    secondaryColor: "#2B2A29",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/RCB.png`,
  },
  "Kolkata Knight Riders": {
    abbr: "KKR",
    primaryColor: "#3A225D",
    secondaryColor: "#B3A123",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/KKR.png`,
  },
  "Delhi Capitals": {
    abbr: "DC",
    primaryColor: "#0078BC",
    secondaryColor: "#EF1C25",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/DC.png`,
  },
  "Punjab Kings": {
    abbr: "PBKS",
    primaryColor: "#ED1B24",
    secondaryColor: "#A7A9AC",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/PBKS.png`,
  },
  "Rajasthan Royals": {
    abbr: "RR",
    primaryColor: "#EA1A85",
    secondaryColor: "#254AA5",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/RR.png`,
  },
  "Sunrisers Hyderabad": {
    abbr: "SRH",
    primaryColor: "#F26522",
    secondaryColor: "#2E1A47",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/SRH.png`,
  },
  "Lucknow Super Giants": {
    abbr: "LSG",
    primaryColor: "#A72056",
    secondaryColor: "#6BACCC",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/LSG.png`,
  },
  "Gujarat Titans": {
    abbr: "GT",
    primaryColor: "#1C2951",
    secondaryColor: "#0B4EA2",
    textColor: "#FFFFFF",
    logoUrl: `${LOGO_BASE}/GT.png`,
  },
};

export function getTeamInfo(teamName: string): TeamInfo {
  if (IPL_TEAMS[teamName]) return IPL_TEAMS[teamName];

  const key = Object.keys(IPL_TEAMS).find(
    (k) =>
      k.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(k.toLowerCase().split(" ").pop()!),
  );

  return key
    ? IPL_TEAMS[key]
    : {
        abbr: teamName.slice(0, 3).toUpperCase(),
        primaryColor: "#4B5563",
        secondaryColor: "#9CA3AF",
        textColor: "#FFFFFF",
        logoUrl: "",
      };
}

export function getTeamAbbr(teamName: string): string {
  return getTeamInfo(teamName).abbr;
}
