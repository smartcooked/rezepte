let msg = $state(''); let timer: ReturnType<typeof setTimeout>;
export const toastState = { get msg() { return msg; } };
export function toast(text: string) { msg = text; clearTimeout(timer); timer = setTimeout(() => (msg = ''), 1800); }
