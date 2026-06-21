// ==========================================================
// Diálogos customizados (substituem confirm()/prompt() nativos)
// ==========================================================

let activeDialogResolve = null;

function getDialogEls() {
  return {
    bg: document.getElementById('dialogModal'),
    title: document.getElementById('dialogTitle'),
    message: document.getElementById('dialogMessage'),
    inputWrap: document.getElementById('dialogInputWrap'),
    input: document.getElementById('dialogInput'),
    confirmBtn: document.getElementById('dialogConfirmBtn'),
    cancelBtn: document.getElementById('dialogCancelBtn')
  };
}

function closeDialog(result) {
  const { bg } = getDialogEls();
  bg.classList.remove('open');
  if (activeDialogResolve) {
    const resolve = activeDialogResolve;
    activeDialogResolve = null;
    resolve(result);
  }
}

function openDialog({ title, message, danger = false, showInput = false, inputValue = '', confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
  const { bg, title: titleEl, message: messageEl, inputWrap, input, confirmBtn, cancelBtn } = getDialogEls();

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;
  confirmBtn.classList.toggle('danger', danger);
  cancelBtn.textContent = cancelText;

  if (showInput) {
    inputWrap.style.display = 'block';
    input.value = inputValue;
  } else {
    inputWrap.style.display = 'none';
  }

  bg.classList.add('open');

  return new Promise(resolve => {
    activeDialogResolve = resolve;
    if (showInput) {
      setTimeout(() => { input.focus(); input.select(); }, 50);
    } else {
      setTimeout(() => confirmBtn.focus(), 50);
    }
  });
}

// Substitui confirm(): retorna Promise<boolean>
function confirmDialog(message, { title = 'Confirmar ação', danger = false, confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
  return openDialog({ title, message, danger, showInput: false, confirmText, cancelText }).then(result => result === true);
}

// Substitui prompt(): retorna Promise<string|null>
function promptDialog(message, defaultValue = '', { title = 'Editar' } = {}) {
  return openDialog({ title, message, showInput: true, inputValue: defaultValue, confirmText: 'Salvar', cancelText: 'Cancelar' })
    .then(result => {
      if (result !== true) return null;
      const { input } = getDialogEls();
      return input.value;
    });
}

function setupDialogEvents() {
  const { bg, confirmBtn, cancelBtn, input } = getDialogEls();

  confirmBtn.addEventListener('click', () => closeDialog(true));
  cancelBtn.addEventListener('click', () => closeDialog(false));

  bg.addEventListener('click', event => {
    if (event.target === bg) closeDialog(false);
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      closeDialog(true);
    }
  });
}
