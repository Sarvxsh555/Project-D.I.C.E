let idCounter = 0;
const subscribers = new Set();

function emit(type, message) {
  const toast = { id: ++idCounter, type, message };
  subscribers.forEach((fn) => fn(toast));
  return toast.id;
}

export const toast = {
  error: (message) => emit('error', message),
  success: (message) => emit('success', message),
  info: (message) => emit('info', message),
};

export function subscribeToasts(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function describeHttpError(status, data) {
  if (status === 404) return data?.error?.message || data?.message || 'Not found. The item you requested may have been moved or removed.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return data?.error?.message || data?.message || "You don't have permission to do that.";
  if (status >= 500) return 'Something went wrong on our end. Please try again in a moment.';
  return data?.error?.message || data?.message || 'Request failed.';
}
