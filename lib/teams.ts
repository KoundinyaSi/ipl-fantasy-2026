export interface TeamInfo {
  abbr: string
  primaryColor: string
  secondaryColor: string
  textColor: string
}

export const IPL_TEAMS: Record<string, TeamInfo> = {
  'Mumbai Indians': {
    abbr: 'MI',
    primaryColor: '#004BA0',
    secondaryColor: '#D1A435',
    textColor: '#FFFFFF',
  },
  'Chennai Super Kings': {
    abbr: 'CSK',
    primaryColor: '#F9CD05',
    secondaryColor: '#0081E9',
    textColor: '#1A1A1A',
  },
  'Royal Challengers Bengaluru': {
    abbr: 'RCB',
    primaryColor: '#EC1C24',
    secondaryColor: '#2B2A29',
    textColor: '#FFFFFF',
  },
  'Royal Challengers Bangalore': {
    abbr: 'RCB',
    primaryColor: '#EC1C24',
    secondaryColor: '#2B2A29',
    textColor: '#FFFFFF',
  },
  'Kolkata Knight Riders': {
    abbr: 'KKR',
    primaryColor: '#3A225D',
    secondaryColor: '#B3A123',
    textColor: '#FFFFFF',
  },
  'Delhi Capitals': {
    abbr: 'DC',
    primaryColor: '#0078BC',
    secondaryColor: '#EF1C25',
    textColor: '#FFFFFF',
  },
  'Punjab Kings': {
    abbr: 'PBKS',
    primaryColor: '#ED1B24',
    secondaryColor: '#A7A9AC',
    textColor: '#FFFFFF',
  },
  'Rajasthan Royals': {
    abbr: 'RR',
    primaryColor: '#EA1A85',
    secondaryColor: '#254AA5',
    textColor: '#FFFFFF',
  },
  'Sunrisers Hyderabad': {
    abbr: 'SRH',
    primaryColor: '#F26522',
    secondaryColor: '#2E1A47',
    textColor: '#FFFFFF',
  },
  'Lucknow Super Giants': {
    abbr: 'LSG',
    primaryColor: '#A72056',
    secondaryColor: '#6BACCC',
    textColor: '#FFFFFF',
  },
  'Gujarat Titans': {
    abbr: 'GT',
    primaryColor: '#1C2951',
    secondaryColor: '#0B4EA2',
    textColor: '#FFFFFF',
  },
}

export function getTeamInfo(teamName: string): TeamInfo {
  // Exact match first
  if (IPL_TEAMS[teamName]) return IPL_TEAMS[teamName]

  // Fuzzy match — handle minor name variations from CricAPI
  const key = Object.keys(IPL_TEAMS).find(
    (k) =>
      k.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(k.toLowerCase().split(' ').pop()!)
  )

  return (
    key
      ? IPL_TEAMS[key]
      : { abbr: teamName.slice(0, 3).toUpperCase(), primaryColor: '#4B5563', secondaryColor: '#9CA3AF', textColor: '#FFFFFF' }
  )
}

export function getTeamAbbr(teamName: string): string {
  return getTeamInfo(teamName).abbr
}
