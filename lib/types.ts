export type AppState =
  | 'brief'
  | 'generating'
  | 'feedback'
  | 'revising'
  | 'approved';

export type GarmentZone =
  | 'neckline'
  | 'shoulders'
  | 'bodice'
  | 'sleeves'
  | 'waist'
  | 'skirt'
  | 'hem'
  | 'back'
  | 'custom';

export type Annotation = {
  id: number;
  rect: { x: number; y: number; width: number; height: number };
  zone: GarmentZone;
  text: string;
  revisedImageUrl?: string;
  status: 'pending' | 'revised' | 'accepted';
};

export type Brief = {
  description: string;
  fabricPhoto?: string;
  fabric: string;
  occasion: string;
  budget: string;
};
