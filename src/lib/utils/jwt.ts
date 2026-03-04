export function getJwtExpiration(token: string): number | null {
  try {
    const payload = decodePayload(token);
    return payload?.exp || null;
  } catch (e) {
    return null;
  }
}

export function getUserIdFromToken(token: string): string | null {
  try {
    const payload = decodePayload(token);
    return payload?.sub || payload?.user_id || null;
  } catch (e) {
    return null;
  }
}

function decodePayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
