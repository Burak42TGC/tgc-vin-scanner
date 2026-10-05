/* TGC Haftbarkeitsmail v17: local drafts, deliberate mail-app handoff,
   original damage photos reused, no sending API and no uploads. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => v ? new Date(v).toLocaleString('de-DE') : 'nicht angegeben';
  const labels = {front:'Vorne',rear:'Hinten',left:'Fahrerseite',right:'Beifahrerseite',inside:'Innenraum',odo:'Tacho'};
  const names = ['to','cc','from','delivery','subject','body'];
  const prefix = 'tgc-haftbar-v17:';
  const limit = 18 * 1024 * 1024;
  let entry = null, draft = null, images = [], urls = [], working = false, lastFocus = null;
  const css = document.createElement('style');
  css.textContent = `.claim-launch{margin-top:18px;border-color:var(--amber)}.claim-launch button{width:100%}.claim-launch p{font-size:13px;margin-bottom:0}#claimDialog{color-scheme:dark;background:#10141b;color:#f3f6fc;width:min(800px,calc(100% - 20px));max-height:92dvh;border:1px solid #45546e;border-radius:18px;padding:0;overflow:auto}#claimDialog::backdrop{background:#000b}#claimDialog .claim-head{position:sticky;top:0;z-index:2;background:#1a212cf5;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px;border-bottom:1px solid #37445a}#claimDialog .claim-head h2{margin:0;font-size:18px}#claimDialog .claim-content{padding:0 16px 20px}#claimDialog input:not([type=checkbox]),#claimDialog textarea{display:block;width:100%;background:#101721;color:#f3f6fc;border:1px solid #37445a;border-radius:10px;padding:12px;font-size:16px;margin-top:5px}#claimDialog #claim-body{min-height:300px;line-height:1.5}#claimDialog .claim-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}#claimDialog .claim-status{font-size:13px;border-left:3px solid #ffcf7e;padding:10px 12px;white-space:pre-line;background:#24251f;margin:14px 0}#claimDialog .claim-files{display:grid;gap:10px}#claimDialog .claim-file{display:flex;align-items:center;gap:10px;border:1px solid #37445a;border-radius:12px;padding:10px}#claimDialog .claim-file img{width:70px;height:55px;object-fit:cover;border-radius:7px}#claimDialog .claim-file .check{margin:0;flex:1;overflow-wrap:anywhere}#claimDialog .claim-file small{display:block}#claimDialog .claim-file button{padding:7px;min-width:45px;font-size:12px}#claimDialog .claim-actions{display:grid;gap:10px}#claimDialog .claim-caption{font-size:13px;color:#bac6d9}#claimDialog .claim-hint{padding:10px 0;margin:0;white-space:pre-line;font-size:13px}#claimDialog fieldset{padding:0;border:0;margin:0;min-width:0}#claimDialog a{color:#99c5ff}@media(max-width:540px){#claimDialog .claim-grid{grid-template-columns:1fr}#claimDialog .claim-content{padding-inline:12px}#claimDialog .claim-file img{width:54px;height:48px}}`;
  document.head.append(css);
  const modal = document.createElement('dialog'); modal.id = 'claimDialog';
  modal.setAttribute('aria-labelledby', 'claimTitle');
  modal.innerHTML = `<div class="claim-head"><h2 id="claimTitle">Haftbarkeitsmail vorbereiten</h2><button id="claimClose" type="button" aria-label="Mailentwurf schließen">Schließen</button></div><div class="claim-content">
<div class="claim-status" role="status" aria-live="polite" id="claimStatus">Entwurf – nicht versendet</div><p id="claimVehicle" class="vin"></p>
<fieldset id="claimFields"><div class="claim-grid"><label class="field">Spediteur / Frachtführer · An *<input id="claim-to" type="email" autocomplete="off" inputmode="email" placeholder="E-Mail des anliefernden Spediteurs"></label><label class="field">Kunde · Cc (optional)<input id="claim-cc" type="email" autocomplete="off" inputmode="email" placeholder="E-Mail des Kunden"></label></div>
<p class="claim-caption">Je Feld eine Adresse, ohne Namen. Die Adresse des Kunden ist für den Spediteur sichtbar. Bitte prüfen, ob beide dieselben Angaben und Bilder erhalten dürfen.</p>
<details><summary>Anlieferzeit / Absender ergänzen</summary><label class="field">Tatsächliche Anlieferzeit (optional, Ortszeit)<input id="claim-delivery" type="datetime-local"></label><label class="field">Eigene Absender-E-Mail (für EML-Export)<input id="claim-from" type="email" autocomplete="off" inputmode="email" placeholder="Eure geschäftliche Absenderadresse"></label><p class="claim-caption">Die Anlieferzeit wird nicht aus der Erfassungszeit geraten. Nach einer Änderung den Vorlagentext neu erstellen. Im Mailprogramm das richtige Absenderkonto selbst wählen.</p></details>
<label class="field">Betreff *<input id="claim-subject" type="text" maxlength="220"></label><label class="field">Mailtext – vor Versand prüfen und bearbeiten<textarea id="claim-body" maxlength="20000" spellcheck="true"></textarea></label>
<button id="claimRegenerate" type="button" class="compact">Vorlagentext neu erstellen</button><p class="claim-caption">Neue Entwürfe tragen im Betreff [TEST]. Diese Kennzeichnung nur für einen beabsichtigten echten Versand entfernen.</p>
<div class="panel"><h2>Vorhandene Schadenfotos</h2><p class="claim-caption">Originale aus diesem Eingang. Kein erneutes Fotografieren oder Hochladen. Nur markierte Fotos werden für Teilen / EML beigefügt.</p><div id="claimFiles" class="claim-files"></div><p id="claimSizes" class="claim-hint"></p><p class="claim-caption">Zusätzlich: Schadenübersicht als Textdatei mit Fahrzeugdaten, Erfassungszeiten und Schadenbeschreibungen. Das vollständige Eingangsprotokoll bleibt in der vorherigen Ansicht.</p></div>
<label class="check"><input id="claimChecked" type="checkbox"><span>Empfänger, Text und ausgewählte Anhänge geprüft. Ich weiß, dass der Versand erst im Mailprogramm erfolgt.</span></label>
<div class="claim-actions"><button id="claimMailto" class="primary" type="button">Mailprogramm öffnen · nur Text</button><p class="claim-caption">Öffnet einen Entwurf mit An / Cc, Betreff und Text. Fotos werden hierbei <strong>nicht</strong> automatisch angehängt.</p><button id="claimShare" type="button">Schadenfotos &amp; Übersicht teilen</button><p class="claim-caption">Am Smartphone im Teilen-Menü die Mail-App wählen. Empfänger dort einsetzen und den Mailtext ggf. über „Text kopieren“ ergänzen. Die Textübernahme hängt von der App ab.</p><button id="claimCopy" type="button">Mailtext kopieren</button></div>
<details><summary>Für den PC: E-Mail-Datei mit Anhängen</summary><p class="claim-caption">EML-Datei mit An / Cc, Text, Originalfotos und Schadenübersicht. Je nach Mailprogramm als Entwurf öffnen oder „Erneut senden“ / „Bearbeiten“ wählen. Das Herunterladen ist kein Versand.</p><button id="claimEml" type="button">Mailentwurf mit Anhängen (.eml)</button></details>
</fieldset>
<details><summary>Wichtig bei echten Transportschäden</summary><p class="claim-caption">Bei HGB-Transporten sind äußerlich erkennbare Schäden spätestens bei Ablieferung anzuzeigen; nach Ablieferung ist die Anzeige in Textform zu erstatten. Ein lokal gespeicherter Entwurf ist keine versendete Schadensanzeige. Anwendbare Regeln und Fristen, insbesondere bei internationalen Transporten, separat prüfen.</p><a href="https://www.gesetze-im-internet.de/hgb/__438.html" target="_blank" rel="noopener noreferrer">§ 438 HGB · Schadensanzeige</a></details>
</div>`;
  document.body.append(modal);
  function tell(text) { $('claimStatus').textContent = text; }
  function damages(e) { return (e?.photos || []).filter(p => p.damage); }
  function getEntry() { return window.TGCEntryMailContext?.() || null; }
  function template(e, d) {
    const meta=e.meta||{}, damage=damages(e);
    const facts=[['VIN / FIN',e.vin],['Kennzeichen',meta.plate],['Kunde',meta.customer],['Auftrag / Referenz',meta.reference],['Anliefernder Spediteur',meta.carrier],['TGC-Standort',meta.site]];
    const details=facts.filter(x=>x[1]).map(x=>x.join(': '));
    details.push('Erfassung im Fahrzeugeingang: '+fmt(e.startedAt)+' (Gerätezeit)');
    if(d.delivery) details.push('Anlieferung laut Eingabe: '+fmt(d.delivery));
    return 'Sehr geehrte Damen und Herren,\n\nbei der Eingangskontrolle des nachfolgend genannten Fahrzeugs wurden Beschädigungen dokumentiert. Hiermit zeigen wir diese Schäden an.\n\n'+details.join('\n')+'\n\nFestgestellte Schäden:\n'+damage.map((p,i)=>`${i+1}. ${p.location||labels[p.slot]||'Detailaufnahme'} – ${p.type||'Beschädigung'}\n${p.note||'Beschreibung bitte ergänzen.'}`).join('\n\n')+'\n\nGegenüber dem anliefernden Frachtführer / Spediteur machen wir vorsorglich Ersatzansprüche wegen dieser Schäden geltend, soweit die Schäden in dessen Verantwortungsbereich entstanden sind. Schadensursache und Schadenhöhe sind noch zu klären. Ein Anerkenntnis eigener Haftung ist mit dieser Meldung nicht verbunden.\n\nDer in Kopie gesetzte Kunde erhält diese Nachricht zur Information. Die vorsorgliche Haftbarhaltung richtet sich an den anliefernden Frachtführer / Spediteur.\n\nBitte bestätigen Sie den Eingang dieser Schadensanzeige und teilen Sie uns Ihre Schadennummer sowie den zuständigen Ansprechpartner mit. Bitte stellen Sie uns auch vorhandene Übernahme- und Ablieferbelege sowie Zustandsfotos zur Prüfung zur Verfügung.\n\nDie Fotodokumentation aus unserem Fahrzeugeingang liegt vor. Weitere Angaben zur Schadenhöhe und zum weiteren Vorgehen reichen wir nach, sobald diese feststehen.\n\nMit freundlichen Grüßen\n'+(meta.operator?meta.operator+'\n':'')+'TGC Autotransporte GmbH';
  }
  function captureDraft() {
    if(!draft)return;
    for(const n of names)draft[n]=$('claim-'+n).value;
    draft.selected=[...$('claimFiles').querySelectorAll('input:checked')].map(el=>el.value);
    draft.updatedAt=new Date().toISOString();
  }
  function save(quiet=false) {
    if(!draft)return false;
    captureDraft();
    try { localStorage.setItem(prefix+entry.id,JSON.stringify(draft)); if(!quiet)tell('Entwurf lokal gespeichert – nicht versendet.'); return true; }
    catch(e){tell('Entwurf nur im Arbeitsspeicher. Lokales Speichern nicht möglich; Text kopieren oder EML exportieren. Nicht versendet.');return false;}
  }
  function chosen() { return images.filter(p=>draft.selected.includes(p.id)); }
  function extension(blob) { const t=(blob?.type||'').toLowerCase(); return {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','image/gif':'gif'}[t]||'bin'; }
  function photoName(p) { const i=images.indexOf(p)+1; return 'TGC_'+entry.vin+'_Schaden_'+String(i).padStart(2,'0')+'.'+extension(p.blob); }
  function download(blob,name) {
    const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),120000);
  }
  function sizeText() {
    const selected=chosen(),bytes=selected.reduce((s,p)=>s+p.blob.size,0);
    $('claimSizes').textContent=selected.length+' von '+images.length+' Foto(s) ausgewählt · '+(bytes/1048576).toFixed(1)+' MB Originale. EML-Datei etwa '+(bytes*1.38/1048576).toFixed(1)+' MB.'+(bytes>limit?' Für den Sammel-Export zu groß. Fotos reduzieren oder einzeln sichern.':'');
  }
  function drawFiles() {
    $('claimFiles').textContent='';
    for(const p of images){const u=URL.createObjectURL(p.thumb||p.blob);urls.push(u);const row=document.createElement('div');row.className='claim-file';
      row.innerHTML='<img alt="Schadenfoto" src="'+u+'"><label class="check"><input type="checkbox" value="'+esc(p.id)+'" '+(draft.selected.includes(p.id)?'checked':'')+'><span>'+esc(p.location||labels[p.slot]||'Detailaufnahme')+'<small>'+esc(p.type)+' · '+(p.blob.size/1048576).toFixed(1)+' MB</small></span></label><button type="button">Sichern</button>';
      row.querySelector('input').onchange=()=>{captureDraft();sizeText();$('claimChecked').checked=false;save();};
      row.querySelector('button').onclick=()=>download(p.blob,photoName(p));$('claimFiles').append(row);
    }sizeText();
  }
  function open() {
    const e=getEntry();if(!e||!damages(e).length)return;
    entry=e;images=damages(e);let stored=null;
    try{stored=JSON.parse(localStorage.getItem(prefix+e.id)||'null');}catch(err){}
    draft={to:'',cc:'',from:'',delivery:'',subject:'[TEST] Schadenanzeige / vorsorgliche Haftbarhaltung – VIN '+e.vin,body:'',selected:images.map(p=>p.id),createdAt:new Date().toISOString()};draft.body=template(e,draft);
    if(stored&&stored.entryId===e.id){for(const n of names)if(typeof stored[n]==='string')draft[n]=stored[n];if(Array.isArray(stored.selected))draft.selected=stored.selected.filter(id=>images.some(p=>p.id===id));draft.createdAt=stored.createdAt||draft.createdAt;}
    draft.entryId=e.id;
    for(const n of names)$('claim-'+n).value=draft[n];
    $('claimVehicle').textContent=e.vin+' · '+images.length+' Schadenfoto(s)';$('claimChecked').checked=false;
    drawFiles();lastFocus=document.activeElement;modal.showModal();modal.scrollTop=0;
    tell(stored?'Gespeicherter lokaler Entwurf geladen. Versand wird von dieser Testseite nicht erfasst.':'Entwurf vorbereitet – nicht versendet. Empfänger bitte eintragen und Angaben prüfen.');save(true);
  }
  function close() {if(working)return;save(true);modal.close();for(const u of urls)URL.revokeObjectURL(u);urls=[];entry=null;draft=null;images=[];lastFocus?.focus();}
  // Deliberately accept only plain, individual ASCII addresses; no header injection.
  function address(s,required=false) {
    s=s.trim();
    if(!s)return !required;
    if(/[\r\n\x00-\x20<>(),;:\\"]/g.test(s))return false;
    const parts=s.split('@');if(parts.length!==2||s.length>254)return false;
    const [local,domain]=parts;
    return local.length>0&&local.length<=64&&!local.startsWith('.')&&!local.endsWith('.')&&!local.includes('..')&&/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(local)&&domain.includes('.')&&domain.split('.').every(x=>/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(x));
  }
  function validate(requireSender=false) {
    captureDraft();
    if(!address(draft.to,true)||!address(draft.cc)||!address(draft.from,requireSender)){tell(requireSender?'Für EML bitte Spediteur- und eigene Absenderadresse sowie ggf. Kundenadresse korrekt eintragen.':'Spediteuradresse und ggf. Kunden- / Absenderadresse prüfen. Je Feld nur eine E-Mail-Adresse.');return false;}
    if(!draft.subject.trim()||/[\r\n]/.test(draft.subject)||!draft.body.trim()){tell('Betreff und Mailtext ergänzen. Im Betreff sind keine Zeilenumbrüche zulässig.');return false;}
    if(!$('claimChecked').checked){tell('Bitte Empfänger, Text und Anhänge prüfen und die Kontrollbox aktivieren.');$('claimChecked').focus();return false;}
    save(true);return true;
  }
  function evidenceText() {
    const e=entry,m=e.meta||{};
    return 'TGC SCHADENUEBERSICHT\r\nLokale Dokumentation; kein Versandnachweis.\r\n\r\n'+
      [['Protokoll-ID',e.id],['VIN / FIN',e.vin],['Kennzeichen',m.plate],['Kunde',m.customer],['Auftrag',m.reference],['Spediteur',m.carrier],['Standort',m.site],['Mitarbeiter',m.operator],['Erfassungsbeginn (Geraetezeit)',fmt(e.startedAt)],['Abschluss (Geraetezeit)',fmt(e.completedAt)],['Anlieferzeit (separate Eingabe)',draft.delivery?fmt(draft.delivery):'nicht angegeben']].map(([k,v])=>k+': '+(v||'–')).join('\r\n')+'\r\n\r\n'+images.map((p,i)=>`${i+1}. ${p.location||labels[p.slot]||'Detail'} – ${p.type}\r\n${p.note}\r\nBild uebernommen: ${fmt(p.takenAt)}\r\nDatei: ${photoName(p)}${draft.selected.includes(p.id)?' (beigefuegt)':' (NICHT beigefuegt)'}`).join('\r\n\r\n')+'\r\n';
  }
  function files() {
    const selected=chosen();if(selected.some(p=>!(p.blob instanceof Blob)))throw new Error('Ein Originalfoto fehlt. Eingangsprotokoll prüfen.');
    if(selected.reduce((s,p)=>s+p.blob.size,0)>limit)throw new Error('Zu viele oder zu große Anhänge für den mobilen Sammel-Export. Auswahl reduzieren oder Fotos einzeln sichern.');
    return [new File([evidenceText()],'TGC_'+entry.vin+'_Schadenuebersicht.txt',{type:'text/plain;charset=utf-8'}),...selected.map(p=>new File([p.blob],photoName(p),{type:p.blob.type||'application/octet-stream'}))];
  }
  function crlf(s){return s.replace(/\r\n|\r|\n/g,'\r\n');}
  function mailto() {
    if(!validate())return;
    const to=encodeURIComponent(draft.to.trim()),cc=draft.cc.trim();
    const u='mailto:'+to+'?subject='+encodeURIComponent(draft.subject)+'&body='+encodeURIComponent(crlf(draft.body))+(cc?'&cc='+encodeURIComponent(cc):'');
    if(u.length>12000){tell('Der Text ist für diesen Link zu lang. EML exportieren oder den Text kopieren; nichts wurde abgeschnitten.');return;}
    const a=document.createElement('a');a.href=u;document.body.append(a);a.click();a.remove();tell('Mailprogramm angefordert – NUR TEXT. Fotos dort manuell anhängen. Kein Versand bestätigt.');
  }
  async function share() {
    if(!validate())return;
    try{const f=files();if(!navigator.canShare?.({files:f})){tell('Dateien-Teilen wird in diesem Browser nicht unterstützt. Schadenfotos einzeln sichern oder EML für den PC exportieren.');return;}
      working=true;$('claimFields').disabled=true;
      await navigator.share({files:f,title:draft.subject,text:draft.body});tell('An die Teilen-Funktion übergeben. Empfänger und Text im Mailprogramm prüfen. Kein Versand bestätigt.');
    }catch(e){tell(e.name==='AbortError'?'Teilen abgebrochen. Entwurf bleibt erhalten.':e.message||'Teilen nicht möglich. EML exportieren oder Fotos einzeln sichern.');}
    finally{working=false;$('claimFields').disabled=false;}
  }
  function bytes64(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
  function wordHeader(s){const chunks=[];let b=[],n=0;for(const ch of s){const u=new TextEncoder().encode(ch);if(n+u.length>42){chunks.push(bytes64(new Uint8Array(b)));b=[];n=0;}b.push(...u);n+=u.length;}if(b.length)chunks.push(bytes64(new Uint8Array(b)));return chunks.map(c=>'=?UTF-8?B?'+c+'?=').join('\r\n ');}
  const wrapped=b64=>(b64.match(/.{1,76}/g)||[]).join('\r\n');
  async function eml() {
    if(!validate(true)||working)return;
    let f;try{f=files();}catch(e){tell(e.message);return;}
    working=true;$('claimFields').disabled=true;tell('Mailentwurf mit Originalfotos wird auf diesem Gerät erstellt …');
    try{const boundary='TGC_'+(crypto.randomUUID?.()||Date.now()).toString().replace(/[^a-zA-Z0-9]/g,'');
      const headers=['X-Unsent: 1','MIME-Version: 1.0','Date: '+new Date().toUTCString(),'From: '+draft.from.trim(),'To: '+draft.to.trim()];
      if(draft.cc.trim())headers.push('Cc: '+draft.cc.trim());
      headers.push('Subject: '+wordHeader(draft.subject),'Content-Type: multipart/mixed; boundary="'+boundary+'"');
      let text=headers.join('\r\n')+'\r\n\r\n--'+boundary+'\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n'+wrapped(bytes64(new TextEncoder().encode(crlf(draft.body))))+'\r\n';
      for(const file of f){const type=/^[\w.+-]+\/[\w.+-]+/.exec(file.type)?.[0]||'application/octet-stream';
        text+='--'+boundary+'\r\nContent-Type: '+type+(type==='text/plain'?'; charset=UTF-8':'')+'; name="'+file.name+'"\r\nContent-Disposition: attachment; filename="'+file.name+'"\r\nContent-Transfer-Encoding: base64\r\n\r\n'+wrapped(bytes64(new Uint8Array(await file.arrayBuffer())))+'\r\n';}
      text+='--'+boundary+'--\r\n';download(new Blob([text],{type:'message/rfc822'}),'TGC_Haftbar_'+entry.vin+'.eml');tell('EML-Datei mit '+chosen().length+' Foto(s) und Schadenübersicht erstellt. Noch nicht versendet. Im Mailprogramm prüfen und selbst senden.');
    }catch(e){tell('Export fehlgeschlagen: '+e.message);}finally{working=false;$('claimFields').disabled=false;}
  }
  async function copy() {captureDraft();try{await navigator.clipboard.writeText(draft.body);tell('Mailtext kopiert. Betreff: '+draft.subject+'\nKein Versand.');}catch(e){$('claim-body').focus();$('claim-body').select();tell('Text markiert. Über das Kopiermenü kopieren.');}}
  for(const n of names)$('claim-'+n).addEventListener('input',()=>{$('claimChecked').checked=false;save();});
  $('claimClose').onclick=close;modal.addEventListener('cancel',e=>{e.preventDefault();close();});
  $('claimRegenerate').onclick=()=>{if(!confirm('Den bearbeiteten Mailtext durch die Vorlage ersetzen?'))return;captureDraft();draft.body=template(entry,draft);$('claim-body').value=draft.body;$('claimChecked').checked=false;save();};
  $('claimMailto').onclick=mailto;$('claimShare').onclick=share;$('claimCopy').onclick=copy;$('claimEml').onclick=eml;
  for(const kind of ['done','report']){const section=$(kind+'Screen');if(!section)continue;const panel=document.createElement('div');panel.className='panel claim-launch';panel.innerHTML='<button type="button" class="success">Haftbarkeitsmail vorbereiten</button><p></p>';
    if(kind==='done')section.insertBefore(panel,$('nextVehicle'));else section.insertBefore(panel,$('report'));
    const button=panel.querySelector('button'),note=panel.querySelector('p');button.onclick=open;
    const refresh=()=>{if(section.hidden)return;const e=getEntry(),n=damages(e).length;button.disabled=!n;note.textContent=n?n+' Schadenfoto(s) werden übernommen. Empfänger und Versand noch offen.':'Keine Schäden dokumentiert – eine Haftbarkeitsmeldung ist hier nicht vorgesehen.';};
    new MutationObserver(refresh).observe(section,{attributes:true,attributeFilter:['hidden']});refresh();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&modal.open)save(true);});
  window.addEventListener('beforeunload',e=>{if(working){e.preventDefault();e.returnValue='';}else if(modal.open)save(true);});
})();
