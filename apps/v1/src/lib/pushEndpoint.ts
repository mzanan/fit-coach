const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];

const PUSH_SERVICE_HOST_SUFFIXES = [".notify.windows.com", ".push.apple.com"];

export function isPushServiceEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "") return false;
  const host = url.hostname;
  return (
    PUSH_SERVICE_HOSTS.includes(host) ||
    PUSH_SERVICE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}
