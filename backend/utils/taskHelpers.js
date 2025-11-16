/**
 * Transform task with grouped tag data into a task with tags array
 * @param {Object} task - Task object with grouped tag data
 * @returns {Object} - Task object with tags array
 */
function transformTaskWithTags(task) {
  if (!task) return null;

  return {
    ...task,
    tags: task.tag_ids ? task.tag_ids.split(',').map((id, index) => ({
      id: parseInt(id),
      name: task.tag_names.split(',')[index],
      color: task.tag_colors.split(',')[index]
    })) : [],
    // Remove temporary grouped fields
    tag_ids: undefined,
    tag_names: undefined,
    tag_colors: undefined
  };
}

module.exports = {
  transformTaskWithTags
};