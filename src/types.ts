export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface Example {
  sv: string;
  en: string;
  /** t = Tatoeba, f = Folkets lexikon */
  src: 't' | 'f';
  /** Tatoeba sentence id + author of the Swedish sentence (attribution) */
  id?: string;
  by?: string;
}

export interface Word {
  /** Kelly list ID – stable key for progress */
  id: number;
  w: string;
  pos: string;
  g?: string;
  lv: Level;
  /** 1-based order inside the level (high frequency first) */
  rank: number;
  def: string;
  tr: string[];
  ph?: string;
  forms?: string[];
  note?: string;
  ex: Example[];
  /** pre-computed distractor glosses */
  dx: string[];
}

export interface Meta {
  built: string;
  counts: Record<Level, number>;
}
