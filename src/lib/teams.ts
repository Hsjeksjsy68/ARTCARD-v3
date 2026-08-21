import { FootballCard } from '../types';

export interface NationalTeamInfo {
  name: string;
  code: string;
  flag: string;
}

export const POPULAR_NATIONAL_TEAMS: NationalTeamInfo[] = [
  { name: 'Argentina', code: 'ARG', flag: '🇦🇷' },
  { name: 'Brazil', code: 'BRA', flag: '🇧🇷' },
  { name: 'France', code: 'FRA', flag: '🇫🇷' },
  { name: 'Portugal', code: 'POR', flag: '🇵🇹' },
  { name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Spain', code: 'ESP', flag: '🇪🇸' },
  { name: 'Germany', code: 'GER', flag: '🇩🇪' },
  { name: 'Italy', code: 'ITA', flag: '🇮🇹' },
  { name: 'Netherlands', code: 'NED', flag: '🇳🇱' },
  { name: 'Croatia', code: 'CRO', flag: '🇭🇷' },
  { name: 'Belgium', code: 'BEL', flag: '🇧🇪' },
  { name: 'Uruguay', code: 'URU', flag: '🇺🇾' },
  { name: 'Norway', code: 'NOR', flag: '🇳🇴' },
  { name: 'Colombia', code: 'COL', flag: '🇨🇴' },
  { name: 'Japan', code: 'JPN', flag: '🇯🇵' },
  { name: 'Morocco', code: 'MAR', flag: '🇲🇦' },
  { name: 'USA', code: 'USA', flag: '🇺🇸' },
  { name: 'Mexico', code: 'MEX', flag: '🇲🇽' },
  { name: 'Poland', code: 'POL', flag: '🇵🇱' },
  { name: 'Denmark', code: 'DEN', flag: '🇩🇰' },
  { name: 'Sweden', code: 'SWE', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'SUI', flag: '🇨🇭' },
  { name: 'Austria', code: 'AUT', flag: '🇦🇹' },
  { name: 'Nigeria', code: 'NGA', flag: '🇳🇬' },
  { name: 'Senegal', code: 'SEN', flag: '🇸🇳' },
  { name: 'Ghana', code: 'GHA', flag: '🇬🇭' },
  { name: 'Egypt', code: 'EGY', flag: '🇪🇬' },
  { name: 'South Korea', code: 'KOR', flag: '🇰🇷' },
  { name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦' },
  { name: 'Australia', code: 'AUS', flag: '🇦🇺' },
  { name: 'Canada', code: 'CAN', flag: '🇨🇦' },
  { name: 'Chile', code: 'CHI', flag: '🇨🇱' },
  { name: 'Turkey', code: 'TUR', flag: '🇹🇷' },
  { name: 'Ukraine', code: 'UKR', flag: '🇺🇦' },
  { name: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { name: 'Wales', code: 'WAL', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { name: 'Ivory Coast', code: 'CIV', flag: '🇨🇮' },
  { name: 'Algeria', code: 'ALG', flag: '🇩🇿' },
  { name: 'Ecuador', code: 'ECU', flag: '🇪🇨' },
  { name: 'Serbia', code: 'SRB', flag: '🇷🇸' },
  { name: 'Czech Republic', code: 'CZE', flag: '🇨🇿' },
  { name: 'Georgia', code: 'GEO', flag: '🇬🇪' },
  { name: 'Hungary', code: 'HUN', flag: '🇭🇺' },
  { name: 'Cameroon', code: 'CMR', flag: '🇨🇲' }
];

export const POPULAR_CLUBS = [
  'Real Madrid',
  'FC Barcelona',
  'Manchester City',
  'Arsenal',
  'Liverpool',
  'Manchester United',
  'Chelsea',
  'Tottenham Hotspur',
  'Paris Saint-Germain',
  'Bayern Munich',
  'Borussia Dortmund',
  'Bayer Leverkusen',
  'Inter Milan',
  'AC Milan',
  'Juventus',
  'Atletico Madrid',
  'Inter Miami',
  'Al Nassr',
  'Al Hilal',
  'Sporting CP',
  'SL Benfica',
  'FC Porto',
  'Ajax',
  'Aston Villa',
  'Newcastle United',
  'Napoli',
  'AS Roma',
  'Lazio',
  'Sevilla'
];

const NATIONAL_TEAM_MAP = new Map<string, string>();
POPULAR_NATIONAL_TEAMS.forEach(nt => {
  NATIONAL_TEAM_MAP.set(nt.name.toLowerCase(), nt.name);
  NATIONAL_TEAM_MAP.set(nt.code.toLowerCase(), nt.name);
});

// Common player nationality mappings to auto-enrich legacy cards
const PLAYER_NATIONALITY_MAP: Record<string, string> = {
  'lionel messi': 'Argentina',
  'messi': 'Argentina',
  'cristiano ronaldo': 'Portugal',
  'ronaldo': 'Portugal',
  'kylian mbappe': 'France',
  'mbappe': 'France',
  'mbappé': 'France',
  'erling haaland': 'Norway',
  'haaland': 'Norway',
  'jude bellingham': 'England',
  'bellingham': 'England',
  'vinicius jr': 'Brazil',
  'vinícius jr': 'Brazil',
  'vinicius junior': 'Brazil',
  'neymar': 'Brazil',
  'neymar jr': 'Brazil',
  'kevin de bruyne': 'Belgium',
  'de bruyne': 'Belgium',
  'luka modric': 'Croatia',
  'modric': 'Croatia',
  'modrić': 'Croatia',
  'robert lewandowski': 'Poland',
  'lewandowski': 'Poland',
  'pedri': 'Spain',
  'gavi': 'Spain',
  'lamine yamal': 'Spain',
  'yamal': 'Spain',
  'rodri': 'Spain',
  'harry kane': 'England',
  'kane': 'England',
  'bukayo saka': 'England',
  'saka': 'England',
  'phil foden': 'England',
  'foden': 'England',
  'cole palmer': 'England',
  'palmer': 'England',
  'jamal musiala': 'Germany',
  'musiala': 'Germany',
  'florian wirtz': 'Germany',
  'wirtz': 'Germany',
  'toni kroos': 'Germany',
  'kroos': 'Germany',
  'manuel neuer': 'Germany',
  'joshua kimmich': 'Germany',
  'virgil van dijk': 'Netherlands',
  'van dijk': 'Netherlands',
  'frenkie de jong': 'Netherlands',
  'de jong': 'Netherlands',
  'cody gakpo': 'Netherlands',
  'lautaro martinez': 'Argentina',
  'julian alvarez': 'Argentina',
  'ángel di maría': 'Argentina',
  'di maria': 'Argentina',
  'federico valverde': 'Uruguay',
  'valverde': 'Uruguay',
  'luis suarez': 'Uruguay',
  'suarez': 'Uruguay',
  'mohamed salah': 'Egypt',
  'salah': 'Egypt',
  'heung-min son': 'South Korea',
  'son': 'South Korea',
  'victor osimhen': 'Nigeria',
  'osimhen': 'Nigeria',
  'achraf hakimi': 'Morocco',
  'hakimi': 'Morocco',
  'alphonso davies': 'Canada',
  'davies': 'Canada',
  'christian pulisic': 'USA',
  'pulisic': 'USA',
  'luis diaz': 'Colombia',
  'khvicha kvaratskhelia': 'Georgia',
  'kvaratskhelia': 'Georgia',
  'antonio rudiger': 'Germany',
  'william saliba': 'France',
  'theo hernandez': 'France',
  'antoine griezmann': 'France',
  'bruno fernandes': 'Portugal',
  'bernardo silva': 'Portugal',
  'rafael leao': 'Portugal',
  'rodrygo': 'Brazil',
  'alisson': 'Brazil',
  'ederson': 'Brazil',
  'marquinhos': 'Brazil',
  'gabriel magalhaes': 'Brazil',
  'martin odegaard': 'Norway',
  'ødegaard': 'Norway',
  'odegaard': 'Norway',
  'declan rice': 'England',
  'marcus rashford': 'England',
  'kobbie mainoo': 'England',
  'alexander isak': 'Sweden',
  'isak': 'Sweden',
  'rasmus hojlund': 'Denmark',
  'højlund': 'Denmark',
  'ruud gullit': 'Netherlands',
  'gullit': 'Netherlands',
  'diego maradona': 'Argentina',
  'maradona': 'Argentina',
  'pele': 'Brazil',
  'pelé': 'Brazil',
  'zinedine zidane': 'France',
  'zidane': 'France',
  'ronaldinho': 'Brazil',
  'ronaldo nazario': 'Brazil',
  'r9': 'Brazil',
  'david beckham': 'England',
  'beckham': 'England',
  'thierry henry': 'France',
  'henry': 'France',
  'paolo maldini': 'Italy',
  'maldini': 'Italy',
  'andrea pirlo': 'Italy',
  'pirlo': 'Italy',
  'johan cruyff': 'Netherlands',
  'cruyff': 'Netherlands',
  'marco van basten': 'Netherlands',
  'van basten': 'Netherlands',
  'dennis bergkamp': 'Netherlands',
  'bergkamp': 'Netherlands',
  'robin van persie': 'Netherlands',
  'van persie': 'Netherlands',
  'arjen robben': 'Netherlands',
  'robben': 'Netherlands',
  'wesley sneijder': 'Netherlands',
  'sneijder': 'Netherlands',
  'wayne rooney': 'England',
  'rooney': 'England',
  'steven gerrard': 'England',
  'gerrard': 'England',
  'frank lampard': 'England',
  'lampard': 'England',
  'paul scholes': 'England',
  'scholes': 'England',
  'sergio ramos': 'Spain',
  'ramos': 'Spain',
  'andres iniesta': 'Spain',
  'iniesta': 'Spain',
  'xavi': 'Spain',
  'xavi hernandez': 'Spain',
  'iker casillas': 'Spain',
  'casillas': 'Spain',
  'carles puyol': 'Spain',
  'puyol': 'Spain',
  'david villa': 'Spain',
  'villa': 'Spain',
  'fernando torres': 'Spain',
  'torres': 'Spain',
  'sergio busquets': 'Spain',
  'busquets': 'Spain',
  'gianluigi buffon': 'Italy',
  'buffon': 'Italy',
  'francesco totti': 'Italy',
  'totti': 'Italy',
  'alessandro del piero': 'Italy',
  'del piero': 'Italy',
  'fabio cannavaro': 'Italy',
  'cannavaro': 'Italy',
  'bastian schweinsteiger': 'Germany',
  'schweinsteiger': 'Germany',
  'philipp lahm': 'Germany',
  'lahm': 'Germany',
  'thomas muller': 'Germany',
  'müller': 'Germany',
  'muller': 'Germany',
  'miroslav klose': 'Germany',
  'klose': 'Germany',
  'mesut ozil': 'Germany',
  'özil': 'Germany',
  'ozil': 'Germany',
  'karim benzema': 'France',
  'benzema': 'France',
  'franck ribery': 'France',
  'ribery': 'France',
  'patrick vieira': 'France',
  'vieira': 'France',
  'eric cantona': 'France',
  'cantona': 'France',
  'didier drogba': 'Ivory Coast',
  'drogba': 'Ivory Coast',
  'samuel etoo': 'Cameroon',
  "eto'o": 'Cameroon',
  'sadio mane': 'Senegal',
  'mané': 'Senegal',
  'mane': 'Senegal',
  'yaya toure': 'Ivory Coast',
  'touré': 'Ivory Coast',
  'toure': 'Ivory Coast',
  'george weah': 'Liberia',
  'weah': 'Liberia',
  'son heung min': 'South Korea'
};

/**
 * Automatically extracts and cleans a player's name from an uploaded image filename.
 * Examples:
 * - "Ruud_Gullit_custom_card.png" -> "RUUD GULLIT"
 * - "Lionel_Messi.jpg" -> "LIONEL MESSI"
 * - "cristiano-ronaldo-2024.png" -> "CRISTIANO RONALDO"
 * - "custom_card_Neymar_Jr.png" -> "NEYMAR JR"
 * - "Erling_Haaland_card (1).png" -> "ERLING HAALAND"
 * - "Kylian_Mbappe_gold_autograph.png" -> "KYLIAN MBAPPE"
 */
export function extractPlayerNameFromFileName(fileName: string): string {
  if (!fileName) return '';

  // 1. Remove file extension
  let name = fileName.replace(/\.[^/.]+$/, '');

  // 2. Decode URL encoded strings if any
  try {
    name = decodeURIComponent(name);
  } catch {
    // ignore
  }

  // 3. Remove copy indices like (1), [2], _copy, -copy
  name = name.replace(/\(\d+\)/g, '');
  name = name.replace(/\[\d+\]/g, '');
  name = name.replace(/_copy\d*/gi, '');
  name = name.replace(/-copy\d*/gi, '');

  // 4. Remove common prefixes
  name = name.replace(/^(custom[_-]?card[_-]?|card[_-]?|img[_-]?|photo[_-]?|player[_-]?)/i, '');

  // 5. Remove common suffixes iteratively
  const suffixPatterns = [
    /_custom_card$/i,
    /-custom-card$/i,
    /_custom$/i,
    /-custom$/i,
    /_card_maker$/i,
    /-card-maker$/i,
    /_card$/i,
    /-card$/i,
    /_overlay$/i,
    /_official$/i,
    /_template$/i,
    /_base$/i,
    /_gold_autograph$/i,
    /-gold-autograph$/i,
    /_silver_refractor$/i,
    /-silver-refractor$/i,
    /_1-of-1_shield$/i,
    /_1_of_1_shield$/i,
    /_1-of-1$/i,
    /_1_of_1$/i,
    /_ucl$/i,
    /_wc$/i,
    /_world_cup$/i,
    /_euro$/i,
    /_1st_edition$/i,
    /-1st-edition$/i,
    /_edition$/i,
    /-edition$/i
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of suffixPatterns) {
      if (pattern.test(name)) {
        name = name.replace(pattern, '');
        changed = true;
      }
    }
  }

  // 6. Replace delimiters (underscores, hyphens, pluses, dots) with space
  name = name.replace(/[_\-+.]+/g, ' ');

  // 7. Strip trailing year if after name (e.g. "Ruud Gullit 2024")
  name = name.replace(/\s+(19|20)\d{2}$/, '');

  // 8. Clean up non-alphanumeric trailing/leading characters
  name = name.replace(/^[^a-zA-Z0-9À-ÿ]+|[^a-zA-Z0-9À-ÿ]+$/g, '');

  // 9. Normalize multiple spaces and uppercase
  name = name.replace(/\s+/g, ' ').trim().toUpperCase();

  return name;
}

export function isKnownNationalTeam(teamName?: string): boolean {
  if (!teamName) return false;
  const clean = teamName.trim().toLowerCase();
  return NATIONAL_TEAM_MAP.has(clean) || POPULAR_NATIONAL_TEAMS.some(nt => nt.name.toLowerCase() === clean);
}

export function getNationalTeamFlag(nationName?: string): string {
  if (!nationName) return '🌍';
  const found = POPULAR_NATIONAL_TEAMS.find(
    nt => nt.name.toLowerCase() === nationName.trim().toLowerCase() || nt.code.toLowerCase() === nationName.trim().toLowerCase()
  );
  return found ? found.flag : '🌍';
}

export function getCardNationalTeam(card?: Partial<FootballCard>): string {
  if (!card) return '';
  if (card.nationalTeam && card.nationalTeam.trim()) {
    return card.nationalTeam.trim();
  }
  
  // Check if team is itself a national team
  if (card.team && isKnownNationalTeam(card.team)) {
    return card.team.trim();
  }

  // Fallback by player name
  if (card.player) {
    const playerLower = card.player.trim().toLowerCase();
    if (PLAYER_NATIONALITY_MAP[playerLower]) {
      return PLAYER_NATIONALITY_MAP[playerLower];
    }
    // Check if player name contains key words
    for (const [key, nat] of Object.entries(PLAYER_NATIONALITY_MAP)) {
      if (playerLower.includes(key)) {
        return nat;
      }
    }
  }

  return '';
}

export function getCardClubTeam(card?: Partial<FootballCard>): string {
  if (!card) return '';
  if (card.club && card.club.trim()) {
    return card.club.trim();
  }
  if (card.team && !isKnownNationalTeam(card.team)) {
    return card.team.trim();
  }
  return '';
}
