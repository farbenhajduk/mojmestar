export function dedupeNotifications(rows = []) {
  const visible = [];

  for (const row of rows) {
    const createdAt = new Date(row.created_at).getTime();
    const matchingIndex = visible.findIndex(item => {
      const itemCreatedAt = new Date(item.created_at).getTime();
      const sameEntity =
        row.entity_id &&
        item.entity_id &&
        row.entity_id === item.entity_id;
      const sameContent =
        !row.entity_id &&
        !item.entity_id &&
        row.title === item.title &&
        row.message === item.message;

      return (
        row.type === item.type &&
        (sameEntity || sameContent) &&
        Math.abs(createdAt - itemCreatedAt) <= 10000
      );
    });

    if (matchingIndex === -1) {
      visible.push({
        ...row,
        duplicateIds: [row.id]
      });
      continue;
    }

    const matching = visible[matchingIndex];
    visible[matchingIndex] = {
      ...matching,
      is_read: matching.is_read && row.is_read,
      duplicateIds: [...matching.duplicateIds, row.id]
    };
  }

  return visible;
}
