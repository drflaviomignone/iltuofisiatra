/* Ricerca interna di iltuofisiatra.it — nessun servizio esterno, tutto sul dispositivo.
   Richiede un <div id="ricerca"></div> nella pagina e il file ricerca-indice.json. */
(function () {
  "use strict";
  var host = document.getElementById("ricerca");
  if (!host) return;

  var CSS = '' +
    '#ricerca{position:relative;max-width:560px;margin:0 auto 22px}' +
    '#ricerca .rc-campo{position:relative;display:flex;align-items:center}' +
    '#ricerca svg{position:absolute;left:13px;width:17px;height:17px;fill:none;stroke:#5b6b78;stroke-width:2;pointer-events:none}' +
    '#ricerca input{width:100%;padding:12px 14px 12px 40px;border:1px solid #c3d2dc;border-radius:11px;background:#fff;' +
    'font:inherit;font-size:1rem;color:#14212b;box-shadow:0 1px 4px rgba(15,61,94,.05)}' +
    '#ricerca input:focus{outline:none;border-color:#0f3d5e;box-shadow:0 0 0 3px rgba(15,61,94,.12)}' +
    '#ricerca input::-webkit-search-cancel-button{cursor:pointer}' +
    '#ricerca ul{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 6px);margin:0;padding:6px;list-style:none;' +
    'background:#fff;border:1px solid #dbe3e9;border-radius:12px;box-shadow:0 10px 28px rgba(15,61,94,.16);max-height:62vh;overflow:auto}' +
    '#ricerca ul[hidden]{display:none}' +
    '#ricerca li{margin:0}' +
    '#ricerca a{display:block;padding:9px 11px;border-radius:8px;text-decoration:none;color:#14212b}' +
    '#ricerca a:hover,#ricerca a.su{background:#eef4f9}' +
    '#ricerca b{display:block;font-size:.97rem;font-weight:600;color:#0f3d5e;line-height:1.3}' +
    '#ricerca span{display:block;font-size:.82rem;color:#5b6b78;margin-top:2px}' +
    '#ricerca mark{background:#d8f2e7;color:inherit;padding:0 1px;border-radius:2px}' +
    '#ricerca .rc-eti{display:inline-block;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.4px;' +
    'color:#1b8a6b;background:#e3f5ee;padding:2px 7px;border-radius:9px;margin-right:6px;vertical-align:1px}' +
    '#ricerca .rc-nulla{padding:11px;font-size:.9rem;color:#5b6b78}';
  var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  host.innerHTML =
    '<div class="rc-campo">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2" stroke-linecap="round"/></svg>' +
    '<input type="search" id="rc-q" role="combobox" aria-expanded="false" aria-controls="rc-ris" aria-autocomplete="list" ' +
    'autocomplete="off" placeholder="Cerca un disturbo o un trattamento…" aria-label="Cerca nel sito">' +
    '</div><ul id="rc-ris" role="listbox" aria-label="Risultati" hidden></ul>';

  var base = host.getAttribute("data-base") || "";
  var q = document.getElementById("rc-q"), box = document.getElementById("rc-ris");
  var dati = null, voci = [], att = -1;

  var pulisci = function (s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  };

  function carica() {
    if (dati) return Promise.resolve(dati);
    return fetch(base + "ricerca-indice.json").then(function (r) { return r.json(); }).then(function (j) {
      dati = j.map(function (v) { v._t = pulisci(v.t); v._k = pulisci(v.k); v._d = pulisci(v.d); return v; });
      return dati;
    }).catch(function () { dati = []; return dati; });
  }

  function punteggio(v, p) {
    var t = v._t, k = v._k, d = v._d;
    if (t.indexOf(p) === 0) return 100;
    if ((" " + t).indexOf(" " + p) >= 0) return 80;
    if (t.indexOf(p) >= 0) return 60;
    if ((" " + k).indexOf(" " + p) >= 0) return 50;
    if (k.indexOf(p) >= 0) return 38;
    if (d.indexOf(p) >= 0) return 20;
    return 0;
  }

  function cerca(testo) {
    var p = pulisci(testo);
    if (p.length < 2) return [];
    var parole = p.split(" ");
    return dati.map(function (v) {
      var tot = 0;
      for (var i = 0; i < parole.length; i++) {
        var s = punteggio(v, parole[i]);
        if (!s) return null;
        tot += s;
      }
      return { v: v, s: tot + (v.w || 0) };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s || a.v.t.localeCompare(b.v.t); }).slice(0, 8);
  }

  function evidenzia(testo, p) {
    var i = pulisci(testo).indexOf(p);
    if (i < 0 || p.length < 2) return testo;
    return testo.slice(0, i) + "<mark>" + testo.slice(i, i + p.length) + "</mark>" + testo.slice(i + p.length);
  }

  function mostra(ris, p) {
    att = -1;
    if (!ris.length) {
      box.innerHTML = '<li class="rc-nulla">Nessun risultato. Prova con una parola diversa, per esempio «spalla», «formicolio» o «infiltrazione».</li>';
    } else {
      box.innerHTML = ris.map(function (r, i) {
        var v = r.v;
        var eti = v.c === "procedura" ? "Procedura" : (v.r || "Patologia");
        return '<li role="presentation"><a role="option" id="rc-o' + i + '" aria-selected="false" href="' + base + v.s + '.html">' +
          "<b>" + evidenzia(v.t, p) + "</b>" +
          '<span><i class="rc-eti">' + eti + "</i>" + v.d + "</span></a></li>";
      }).join("");
    }
    box.hidden = false; q.setAttribute("aria-expanded", "true");
  }

  function chiudi() { box.hidden = true; q.setAttribute("aria-expanded", "false"); q.removeAttribute("aria-activedescendant"); att = -1; }

  function muovi(d) {
    var voci2 = box.querySelectorAll("a");
    if (!voci2.length) return;
    if (att >= 0) { voci2[att].classList.remove("su"); voci2[att].setAttribute("aria-selected", "false"); }
    var n = voci2.length;
    att = ((att + 1 + d) + (n + 1)) % (n + 1) - 1;
    if (att < 0) { q.removeAttribute("aria-activedescendant"); return; }
    voci2[att].classList.add("su"); voci2[att].setAttribute("aria-selected", "true");
    q.setAttribute("aria-activedescendant", voci2[att].id);
    voci2[att].scrollIntoView({ block: "nearest" });
  }

  q.addEventListener("input", function () {
    var testo = q.value;
    if (pulisci(testo).length < 2) { chiudi(); return; }
    carica().then(function () { mostra(cerca(testo), pulisci(testo).split(" ")[0]); });
  });
  q.addEventListener("focus", carica);
  q.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); muovi(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); muovi(-1); }
    else if (e.key === "Enter") { var a = box.querySelector("a.su"); if (a) { e.preventDefault(); location.href = a.href; } }
    else if (e.key === "Escape") { chiudi(); }
  });
  document.addEventListener("click", function (e) { if (!host.contains(e.target)) chiudi(); });
})();
