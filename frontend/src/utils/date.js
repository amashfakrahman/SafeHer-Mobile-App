export function formatDateTime(value) {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleString();
}

export function formatTime(value) {
  if (!value) {
    return '--:--';
  }

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
