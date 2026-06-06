import type { Annotation, GarmentZone } from './types';

export function detectZone(rect: Annotation['rect']): GarmentZone {
  const centerY = rect.y + rect.height / 2;
  const centerX = rect.x + rect.width / 2;
  const isEdge = centerX < 20 || centerX > 80;

  if (centerY < 18) return 'neckline';
  if (centerY < 28 && isEdge) return 'shoulders';
  if (centerY < 28) return 'neckline';
  if (centerY < 50 && isEdge) return 'sleeves';
  if (centerY < 50) return 'bodice';
  if (centerY < 58) return 'waist';
  if (centerY < 88) return 'skirt';
  return 'hem';
}

export function buildRevisionPrompt(
  zone: GarmentZone,
  feedback: string,
  basePrompt: string
): string {
  const zoneContext: Record<GarmentZone, string> = {
    neckline: 'Focus edit on the neckline area. Options include V-neck, scoop, square, sweetheart, bateau, cowl, halter, off-shoulder.',
    shoulders: 'Focus on shoulder construction — structured, dropped, off-shoulder, cold-shoulder, yoke detail.',
    bodice: 'Focus on the bodice — the fitted section from neckline to waist. Consider princess seams, boning, dart placement.',
    sleeves: 'Focus on sleeve design — cap, puff, bishop, bell, lantern, long fitted, or sleeveless.',
    waist: 'Focus on the waistline — natural waist, empire waist, dropped waist, belted, or peplum detail.',
    skirt: 'Focus on the skirt silhouette — A-line, full/ballgown, straight/column, mermaid, asymmetric, tiered, pleated, frilled.',
    hem: 'Focus on the hemline — length (mini/midi/maxi/floor), hem finish (raw, bias-bound, scalloped, handkerchief, bubble).',
    back: 'Focus on the back design — open back, keyhole, button placket, lace-up, bow detail.',
    custom: 'Apply the edit to the specified area.',
  };

  return `${basePrompt}. ${zoneContext[zone]} Customer feedback: "${feedback}". Maintain fashion designer sketch style, pencil and ink on cream paper, technical illustration, show construction details, editorial, white background. Do not change other parts of the garment.`;
}
