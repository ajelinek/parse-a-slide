document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.querySelector('.nav-menu');
  const contextMenu = document.getElementById('context-menu');
  const slideDataScript = document.getElementById('slide-data');

  if (!menuButton || !contextMenu || !slideDataScript) {
    return;
  }

  // 1. Toggle context menu visibility
  menuButton.addEventListener('click', () => {
    contextMenu.classList.toggle('hidden');
  });

  // 2. Generate the context menu from slide data
  try {
    const slideHierarchy = JSON.parse(slideDataScript.textContent || '[]');
    const menuList = createMenuList(slideHierarchy);
    contextMenu.appendChild(menuList);
  } catch (error) {
    console.error('Failed to parse slide data:', error);
  }
});

/**
 * Recursively creates a nested list (UL) from the slide hierarchy.
 * @param {Array} hierarchy - The slide hierarchy.
 * @returns {HTMLUListElement} The generated list element.
 */
function createMenuList(hierarchy) {
  const list = document.createElement('ul');

  hierarchy.forEach(item => {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.url;
    link.textContent = item.title;
    listItem.appendChild(link);

    if (item.children && item.children.length > 0) {
      const subList = createMenuList(item.children);
      listItem.appendChild(subList);
    }

    list.appendChild(listItem);
  });

  return list;
}
