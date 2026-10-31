# iltuofisiatra.it — pubblicazione

1. Registra il dominio iltuofisiatra.it (Aruba, Register.it, Namecheap...).
2. Crea un repository GitHub (es. `iltuofisiatra`) e carica tutto il contenuto di questa cartella.
3. Settings → Pages → Source: branch `main`, cartella `/ (root)`. Custom domain: `iltuofisiatra.it`, poi attiva "Enforce HTTPS".
4. DNS presso il registrar:
   - 4 record A per `@` → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - CNAME per `www` → `<tuo-utente>.github.io`
5. Attendi propagazione DNS (da minuti a 24 h).

## Aggiungere un nuovo strumento
1. Crea `strumenti/<nome-strumento>/index.html` (singolo file HTML).
2. In `index.html` copia un blocco `<article class="card">` e modifica titolo, descrizione e link.
3. Commit e push: il sito si aggiorna da solo.
