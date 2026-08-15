// ==========================================================
// Menus de contexto de botões e seções
// ==========================================================

let viewedButtonText = '';
let viewedButtonId = '';
let contextIdSequence = 0;

function createContextMenuItem(label, icon, action, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'context-menu-item' + (options.danger ? ' danger' : '');
  button.setAttribute('role', 'menuitem');
  button.disabled = !!options.disabled;
  button.innerHTML = `${iconSvg(icon)}<span>${escapeHtml(label)}</span>`;
  button.addEventListener('click', () => {
    if (button.disabled) return;
    closeContextMenu();
    action();
  });
  return button;
}

function createContextMenuSeparator() {
  const separator = document.createElement('div');
  separator.className = 'context-menu-separator';
  separator.setAttribute('role', 'separator');
  return separator;
}

function openContextMenu(items, x, y, anchor) {
  const menu = document.getElementById('contextMenu');
  if (!menu) return;

  menu.replaceChildren(...items);
  menu.hidden = false;
  menu.style.visibility = 'hidden';

  const anchorRect = anchor?.getBoundingClientRect();
  const requestedX = x || (anchorRect ? anchorRect.left + 12 : 12);
  const requestedY = y || (anchorRect ? anchorRect.bottom : 12);
  const menuRect = menu.getBoundingClientRect();
  const padding = 8;
  const left = Math.min(Math.max(requestedX, padding), Math.max(padding, window.innerWidth - menuRect.width - padding));
  const top = Math.min(Math.max(requestedY, padding), Math.max(padding, window.innerHeight - menuRect.height - padding));

  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
  menu.style.visibility = 'visible';
  menu.querySelector('.context-menu-item:not(:disabled)')?.focus({ preventScroll: true });
}

function closeContextMenu() {
  const menu = document.getElementById('contextMenu');
  if (!menu) return;
  menu.hidden = true;
  menu.replaceChildren();
}

function getUniqueContextId(prefix) {
  const base = `${prefix}${Date.now().toString(36)}-${++contextIdSequence}`;
  let candidate = base;
  let suffix = 2;
  while (document.querySelector(`[data-id="${cssEscape(candidate)}"]`)) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

function getUniqueCopyName(name, existingNames) {
  const base = `${name} — Cópia`;
  if (!existingNames.has(base)) return base;
  let number = 2;
  while (existingNames.has(`${base} ${number}`)) number++;
  return `${base} ${number}`;
}

function getContextButtonData(buttonWrap) {
  return {
    id: buttonWrap.dataset.id,
    name: buttonWrap.querySelector('.btn-label')?.textContent || '',
    text: buttonWrap.dataset.text || '',
    tag: buttonWrap.dataset.tag || '',
    vis: buttonWrap.dataset.vis || 'other'
  };
}

async function copyContextButtonText(buttonWrap) {
  try {
    await copyToClipboard(buttonWrap.dataset.text || '');
    recordButtonCopy(buttonWrap.dataset.id);
    notify('Texto copiado!');
  } catch (error) {
    console.error('Erro ao copiar pelo menu de contexto:', error);
    notify('Não foi possível copiar o texto', 'err');
  }
}

function viewContextButton(buttonWrap) {
  const data = getContextButtonData(buttonWrap);
  recordUserActivity('viewed', data.id);
  const title = document.getElementById('buttonViewTitle');
  const meta = document.getElementById('buttonViewMeta');
  const text = document.getElementById('buttonViewText');
  const visibilityLabels = { public: '🌎 Público', private: '🔒 Privado', other: 'Outro' };

  viewedButtonText = data.text;
  viewedButtonId = data.id;
  title.textContent = `👁️ ${data.name}`;
  meta.textContent = [data.tag ? `Tag: ${data.tag}` : 'Sem tag', visibilityLabels[data.vis] || 'Outro'].join(' • ');
  text.textContent = data.text;
  openModal('buttonViewModal');
}

async function copyViewedButtonText() {
  try {
    await copyToClipboard(viewedButtonText);
    recordButtonCopy(viewedButtonId);
    notify('Texto copiado!');
  } catch (error) {
    console.error('Erro ao copiar visualização:', error);
    notify('Não foi possível copiar o texto', 'err');
  }
}

function duplicateContextButton(buttonWrap) {
  const section = buttonWrap.closest('.section-wrap');
  if (!section) return;

  const source = getContextButtonData(buttonWrap);
  const existingNames = new Set([...section.querySelectorAll('.btn-label')].map(label => label.textContent));
  const duplicate = {
    ...source,
    id: getUniqueContextId('b'),
    name: getUniqueCopyName(source.name, existingNames)
  };

  pushHistory();
  buttonWrap.after(createBtnEl(duplicate, section.dataset.id));
  recordUserActivity('created', duplicate.id);
  updateSectionCount(section.dataset.id);
  applyButtonReorderControls();
  doSearch();
  updateUnsavedChangesUI();
  notifyUndo('Botão duplicado!');
}

function duplicateContextSection(section) {
  const existingNames = new Set([...document.querySelectorAll('.section-title')].map(title => title.textContent));
  const sourceName = section.querySelector('.section-title')?.textContent || 'Seção';
  const duplicate = {
    id: getUniqueContextId('s'),
    name: getUniqueCopyName(sourceName, existingNames),
    collapsed: section.classList.contains('collapsed'),
    buttons: [...section.querySelectorAll('.btn-wrap')].map(button => ({
      ...getContextButtonData(button),
      id: getUniqueContextId('b')
    }))
  };

  pushHistory();
  const duplicatedSection = renderSection(duplicate, document.getElementById('sections'));
  section.after(duplicatedSection);
  duplicate.buttons.forEach(button => recordUserActivity('created', button.id));
  applyButtonReorderControls();
  doSearch();
  updateToggleSectionsBtnLabel();
  updateUnsavedChangesUI();
  notifyUndo('Seção duplicada!');
}

function getButtonContextMenuItems(buttonWrap) {
  const section = buttonWrap.closest('.section-wrap');
  const sectionId = section?.dataset.id;
  const buttonId = buttonWrap.dataset.id;

  return [
    createContextMenuItem('Copiar texto', 'copy', () => copyContextButtonText(buttonWrap)),
    createContextMenuItem('Visualizar botão', 'eye', () => viewContextButton(buttonWrap)),
    createContextMenuItem(isFavoriteButton(buttonId) ? 'Remover dos favoritos' : 'Adicionar aos favoritos', 'star', () => toggleFavoriteButton(buttonId)),
    createContextMenuSeparator(),
    createContextMenuItem('Editar botão', 'pencil', () => openEditBtn(sectionId, buttonId)),
    createContextMenuItem('Duplicar botão', 'copy_plus', () => duplicateContextButton(buttonWrap)),
    createContextMenuSeparator(),
    createContextMenuItem('Excluir botão', 'trash_2', () => deleteBtn(sectionId, buttonId), { danger: true })
  ];
}

function getSectionContextMenuItems(section) {
  const sectionId = section.dataset.id;
  const collapsed = section.classList.contains('collapsed');
  const header = section.querySelector('.section-head');

  return [
    createContextMenuItem('Adicionar botão', 'folder_plus', () => openAddBtn(sectionId)),
    createContextMenuItem(collapsed ? 'Expandir seção' : 'Recolher seção', collapsed ? 'unfold_vertical' : 'fold_vertical', () => toggleCollapse(section.querySelector('.section-collapse-btn'))),
    createContextMenuSeparator(),
    createContextMenuItem('Renomear seção', 'pencil', () => renameSection(sectionId)),
    createContextMenuItem('Duplicar seção', 'copy_plus', () => duplicateContextSection(section)),
    createContextMenuSeparator(),
    createContextMenuItem('Mover para cima', 'arrow_up', () => moveSectionUp(header), { disabled: !section.previousElementSibling }),
    createContextMenuItem('Mover para baixo', 'arrow_down', () => moveSectionDown(header), { disabled: !section.nextElementSibling }),
    createContextMenuSeparator(),
    createContextMenuItem('Excluir seção', 'trash_2', () => deleteSection(sectionId), { danger: true })
  ];
}

document.addEventListener('contextmenu', event => {
  const buttonWrap = event.target.closest('.btn-wrap');
  const isTouchReorderGesture = ['touch', 'pen'].includes(event.pointerType)
    && editMode
    && (buttonWrap || (shiftLocked && event.target.closest('.section-wrap')));
  if (isTouchReorderGesture) {
    event.preventDefault();
    closeContextMenu();
    return;
  }

  if (buttonWrap) {
    event.preventDefault();
    hideButtonPreview();
    openContextMenu(getButtonContextMenuItems(buttonWrap), event.clientX, event.clientY, buttonWrap);
    return;
  }

  const section = event.target.closest('.section-wrap');
  if (section) {
    event.preventDefault();
    openContextMenu(getSectionContextMenuItems(section), event.clientX, event.clientY, section.querySelector('.section-head'));
  }
});

document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#contextMenu')) closeContextMenu();
});

document.addEventListener('keydown', event => {
  const menu = document.getElementById('contextMenu');
  if (!menu || menu.hidden) return;

  if (event.key === 'Escape') {
    closeContextMenu();
    return;
  }

  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const items = [...menu.querySelectorAll('.context-menu-item:not(:disabled)')];
  if (!items.length) return;
  event.preventDefault();

  const currentIndex = items.indexOf(document.activeElement);
  let nextIndex = 0;
  if (event.key === 'End') nextIndex = items.length - 1;
  if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
  if (event.key === 'ArrowUp') nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
  items[nextIndex].focus();
});

window.addEventListener('scroll', closeContextMenu, true);
window.addEventListener('resize', closeContextMenu);
window.addEventListener('blur', closeContextMenu);
