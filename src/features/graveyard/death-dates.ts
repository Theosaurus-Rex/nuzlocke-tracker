const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function shortDate(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]?.toUpperCase()}`;
}

export function loggedAt(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
