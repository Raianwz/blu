// ==========================================================
// Diálogos customizados (substituem confirm()/prompt() nativos)
// ==========================================================

let activeDialogResolve = null;
let activeDialogTimer = null;

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
  clearInterval(activeDialogTimer);
  activeDialogTimer = null;
  bg.classList.remove('open');
  if (activeDialogResolve) {
    const resolve = activeDialogResolve;
    activeDialogResolve = null;
    resolve(result);
  }
}

function openDialog({ title, message, danger = false, showInput = false, inputValue = '', confirmText = 'Confirmar', cancelText = 'Cancelar', variant = '', confirmDelay = 0, focusCancel = false }) {
  const { bg, title: titleEl, message: messageEl, inputWrap, input, confirmBtn, cancelBtn } = getDialogEls();

  clearInterval(activeDialogTimer);
  activeDialogTimer = null;
  bg.dataset.variant = variant;
  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;
  confirmBtn.classList.toggle('danger', danger);
  confirmBtn.disabled = confirmDelay > 0;
  cancelBtn.textContent = cancelText;

  if (confirmDelay > 0) {
    let remaining = Math.ceil(confirmDelay);
    confirmBtn.textContent = `${confirmText} (${remaining}s)`;
    activeDialogTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        confirmBtn.textContent = `${confirmText} (${remaining}s)`;
        return;
      }
      clearInterval(activeDialogTimer);
      activeDialogTimer = null;
      confirmBtn.disabled = false;
      confirmBtn.textContent = confirmText;
    }, 1000);
  }

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
      setTimeout(() => (focusCancel ? cancelBtn : confirmBtn).focus(), 50);
    }
  });
}

// Substitui confirm(): retorna Promise<boolean>
function confirmDialog(message, { title = 'Confirmar ação', danger = false, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = '', confirmDelay = 0, focusCancel = false } = {}) {
  return openDialog({ title, message, danger, showInput: false, confirmText, cancelText, variant, confirmDelay, focusCancel }).then(result => result === true);
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
