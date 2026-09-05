const FRACTIONS: [number, string][] = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.66, '⅔'], [0.75, '¾']];
export function formatAmount(a: number | null | undefined): string {
	if (a === null || a === undefined || isNaN(a)) return '';
	const whole = Math.floor(a + 1e-9), rest = Math.round((a - whole) * 100) / 100;
	for (const [f, sym] of FRACTIONS) if (Math.abs(rest - f) < 0.03) return (whole ? whole + ' ' : '') + sym;
	if (Math.abs(rest) < 0.03) return String(whole);
	return (Math.round(a * 10) / 10).toString().replace('.', ',');
}
export function minutesLabel(min: number): string {
	min = Math.max(0, Math.round(min || 0));
	if (min >= 60 && min % 60 === 0) return `${min / 60} Std.`;
	if (min >= 60) return `${Math.floor(min / 60)} Std. ${min % 60} Min.`;
	return `${min} Min.`;
}
export function isoDuration(min: number): string | undefined {
	if (!min) return undefined;
	const h = Math.floor(min / 60), m = min % 60;
	return 'PT' + (h ? `${h}H` : '') + (m ? `${m}M` : '');
}
export function slugify(text: string): string {
	let t = text.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
	t = t.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	return t.slice(0, 60).replace(/-+$/, '');
}
export function ingredientLine(i: { amount: number | null; unit: string | null; name: string; note?: string | null }): string {
	const parts: string[] = [];
	if (i.amount !== null && i.amount !== undefined) parts.push(formatAmount(i.amount));
	if (i.unit) parts.push(i.unit);
	parts.push(i.name);
	let line = parts.join(' ');
	if (i.note) line += ` (${i.note})`;
	return line;
}
export function imageUrl(base: string, path: string | null | undefined, variant: 'bild' | 'thumb' = 'bild'): string | null {
	if (!path) return null;
	const p = variant === 'thumb' ? path.replace(/bild\.jpg$/, 'thumb.jpg') : path;
	return `${base}/storage/v1/object/public/recipe-images/${p}`;
}
