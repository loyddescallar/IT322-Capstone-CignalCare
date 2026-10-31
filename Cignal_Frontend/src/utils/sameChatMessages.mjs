// Exact visible-message comparison avoids redundant React state updates and
// repeatedly auto-scrolling to the bottom when no new chat arrives.
const VISIBLE_FIELDS = [
  'id', 'ticket_id', 'sender_id', 'sender_role', 'sender_name',
  'message', 'attachment', 'attachment_type', 'created_at', 'is_mine',
];

export function sameChatMessages(previous, incoming) {
  if (previous === incoming) return true;
  if (!Array.isArray(previous) || !Array.isArray(incoming)) return false;
  if (previous.length !== incoming.length) return false;
  return previous.every((item, index) => {
    const next = incoming[index];
    return Boolean(item && next) && VISIBLE_FIELDS.every(
      (field) => Object.is(item[field], next[field])
    );
  });
}
