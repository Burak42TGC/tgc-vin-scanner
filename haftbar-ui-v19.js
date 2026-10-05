/* TGC mail UI v19. Reuses the existing share/EML handlers and draft storage.
   No automatic sending. The main action requires a selected damage photograph. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('claimDialog');
  const share = $('claimShare');
  const textOnly = $('claimMailto');
  const copy = $('claimCopy');
  const eml = $('claimEml');
  const files = $('claimFiles');
  const docs = $('claimDocuments');
  const fields = $('claimFields');
  if (!dialog || !share || !textOnly || !copy || !eml || !files || !fields) return;
  const actions = share.closest('.claim-actions');
  const oldTextHint = textOnly.nextElementSibling;
  const oldShareHint = share.nextElementSibling;
  const emlDetails = eml.closest('details');
  const more = document.createElement('details');
  more.id = 'claimMoreOptions';
  const title = document.createElement('summary');
  title.textContent = 'Weitere Optionen · Text kopieren / EML / ohne Bilder';
  more.append(title);
  more.append(copy, emlDetails);
  const textBox = document.createElement('div');
  textBox.className = 'panel';
  textOnly.classList.remove('primary');
  textOnly.textContent = 'Nur Text öffnen · OHNE Bilder';
  textBox.append(textOnly, oldTextHint);
  more.append(textBox);
  if (oldShareHint) oldShareHint.remove();
  share.classList.add('primary');
  const how = document.createElement('p');
  how.className = 'claim-caption';
  how.id = 'claimPhotoInstructions';
  how.textContent = 'Öffnet das Teilen-Menü mit den ausgewählten Schadenfotos, optional angehakten Lieferscheinen und dem Mailtext. Keine zusätzliche Excel-/Textdatei. Dort Mail / deine Mail-App auswählen. Empfänger ergänzen und Text sowie Anhänge kontrollieren. Betreff und Text können je nach App fehlen; die Kopierfunktion steht unter „Weitere Optionen“. Erst in der Mail-App senden.';
  share.setAttribute('aria-describedby', 'claimSelectedCount claimPhotoInstructions');
  const count = document.createElement('p');
  count.id = 'claimSelectedCount';
  count.className = 'claim-hint';
  const actionStatus = document.createElement('p');
  actionStatus.id = 'claimActionStatus';
  actionStatus.className = 'claim-status';
  actionStatus.setAttribute('aria-live', 'off');
  actions.replaceChildren(count, share, how, actionStatus);
  actions.after(more);
  const badge = document.createElement('p');
  badge.className = 'claim-caption';
  badge.textContent = 'Bilderversand · v19 · nichts wird automatisch verschickt';
  dialog.querySelector('.claim-content').prepend(badge);
  function selectedCount() { return files.querySelectorAll('input[type=checkbox]:checked').length; }
  function updateCount() {
    const n = selectedCount(), d = docs?.querySelectorAll('input:checked').length || 0;
    count.textContent = n ? n + ' Schadenfoto(s)' + (d ? ' + ' + d + ' Lieferschein-Datei(en)' : '') + ' ausgewählt. Keine Tabellen-/Textanhänge.' : 'Keine Bilder ausgewählt. Mindestens ein Schadenfoto anhaken.';
    share.textContent = 'Mail mit Bildern vorbereiten' + (n ? ' · ' + n + ' Foto' + (n === 1 ? '' : 's') : '');
  }
  function status(text) { $('claimStatus').textContent = text; actionStatus.textContent = text; }
  share.addEventListener('click', event => {
    if (selectedCount() > 0) return;
    event.preventDefault();event.stopImmediatePropagation();
    status('Keine Bilder ausgewählt. Bitte ein Schadenfoto anhaken. Es wurde kein Teilen-Menü geöffnet und nichts versendet.');
    files.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, true);
  docs?.addEventListener('change', updateCount);
  if (docs) new MutationObserver(updateCount).observe(docs, { childList: true, subtree: true });
  files.addEventListener('change', updateCount);
  new MutationObserver(updateCount).observe(files, { childList: true, subtree: true });
  new MutationObserver(() => {
    const text = $('claimStatus').textContent;
    actionStatus.textContent = text;
    if (/nicht unterstützt|nicht möglich/i.test(text)) more.open = true;
  }).observe($('claimStatus'), { childList: true, characterData: true, subtree: true });
  new MutationObserver(() => { if (dialog.open) { more.open = false; updateCount(); } }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  updateCount();
})();