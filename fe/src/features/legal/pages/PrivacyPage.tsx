import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface TopicProps {
  id: string
  title: string
  children: ReactNode
}

function Topic({ id, title, children }: TopicProps) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="grid gap-3 text-muted-foreground text-pretty">{children}</div>
    </section>
  )
}

const LIST = 'grid list-disc gap-2 pl-5'
const LINK = 'rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/**
 * Informativa sulla privacy (/privacy), collegata dalla registrazione e dal footer.
 * Testo sintetico che descrive cosa fa davvero l'app: se cambia il trattamento dei dati va aggiornato qui.
 */
export function PrivacyPage() {
  return (
    <article className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 pb-16">
      <title>Privacy · Eventi</title>
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Informativa sulla privacy</h1>
        <p className="max-w-prose text-muted-foreground text-pretty">
          Questa piattaforma è un progetto didattico gestito dal team del progetto. Qui spieghiamo in breve quali dati raccogliamo, perché
          e cosa puoi fare per controllarli.
        </p>
      </header>

      <Topic id="privacy-data" title="Quali dati raccogliamo">
        <ul className={LIST}>
          <li>
            <span className="font-medium text-foreground">Dati dell'account:</span> nome, cognome, email, data di nascita e password. La
            password è salvata solo in forma cifrata: nessuno, nemmeno il team, può leggerla.
          </li>
          <li>
            <span className="font-medium text-foreground">Dati facoltativi del profilo:</span> telefono, indirizzo e foto del profilo, se
            decidi di aggiungerli.
          </li>
          <li>
            <span className="font-medium text-foreground">Contenuti che crei:</span> gli eventi che organizzi (testi, foto, luogo), le
            iscrizioni agli eventi, le amicizie e i messaggi che scambi in chat.
          </li>
          <li>
            <span className="font-medium text-foreground">Dati tecnici:</span> le informazioni indispensabili a tenerti collegato e a
            proteggere l'accesso, come il numero di tentativi di login falliti.
          </li>
        </ul>
      </Topic>

      <Topic id="privacy-purpose" title="Perché li usiamo">
        <ul className={LIST}>
          <li>Per creare il tuo account e farti accedere in sicurezza.</li>
          <li>Per iscriverti agli eventi e inviarti per email il codice di verifica e i ticket.</li>
          <li>Per avvisarti quando un evento a cui partecipi viene modificato o annullato.</li>
          <li>Per farti trovare gli altri partecipanti, stringere amicizie e chattare con i tuoi amici.</li>
        </ul>
        <p>Non usiamo i tuoi dati per pubblicità e non li vendiamo a nessuno.</p>
      </Topic>

      <Topic id="privacy-visibility" title="Chi vede cosa">
        <ul className={LIST}>
          <li>Nome, cognome e foto del profilo sono visibili agli altri utenti registrati, per esempio tra i partecipanti di un evento.</li>
          <li>Email, data di nascita, telefono e indirizzo li vedi solo tu. I moderatori vedono l'email per poter gestire gli account.</li>
          <li>I messaggi di una chat li leggete solo tu e l'amico con cui stai parlando.</li>
          <li>Gli eventi che pubblichi sono visibili a chiunque, anche senza account, insieme al tuo nome come organizzatore.</li>
        </ul>
      </Topic>

      <Topic id="privacy-services" title="Servizi esterni">
        <p>Per funzionare la piattaforma si appoggia ad alcuni servizi esterni, a cui arrivano solo i dati necessari:</p>
        <ul className={LIST}>
          <li>un servizio di archiviazione delle immagini, per le foto degli eventi e del profilo;</li>
          <li>un servizio di posta, per le email di verifica e dei ticket;</li>
          <li>un servizio di intelligenza artificiale, a cui viene inviato il testo di un evento solo quando l'organizzatore chiede una proposta di descrizione;</li>
          <li>le mappe di OpenStreetMap, che ricevono dal tuo browser le richieste delle porzioni di mappa da mostrare.</li>
        </ul>
      </Topic>

      <Topic id="privacy-cookies" title="Cookie">
        <p>
          Usiamo solo cookie tecnici: un cookie di sessione che ti tiene collegato dopo l'accesso e un cookie di sicurezza che protegge le
          operazioni che fai. Non servono a tracciarti e non usiamo cookie di profilazione o di terze parti per la pubblicità, per questo
          non trovi un banner di consenso. La preferenza tra tema chiaro e scuro resta salvata solo nel tuo browser.
        </p>
      </Topic>

      <Topic id="privacy-rights" title="I tuoi diritti">
        <ul className={LIST}>
          <li>
            <span className="font-medium text-foreground">Vedere e correggere i dati:</span> dalla pagina{' '}
            <Link to="/profile" className={LINK}>
              Profilo
            </Link>{' '}
            puoi modificare i dati personali, cambiare la password e togliere la foto.
          </li>
          <li>
            <span className="font-medium text-foreground">Eliminare l'account:</span> sempre dal profilo, confermando con la password.
            L'account viene anonimizzato: nome, email, data di nascita, telefono, indirizzo e foto vengono cancellati in modo definitivo e
            non potrai più accedere. Gli eventi che hai creato, le iscrizioni e i messaggi inviati restano, ma compaiono a nome «Utente
            eliminato», così le pagine degli altri utenti continuano a funzionare.
          </li>
          <li>
            <span className="font-medium text-foreground">Altre richieste:</span> per qualsiasi domanda sui tuoi dati puoi rivolgerti al team
            del progetto.
          </li>
        </ul>
      </Topic>
    </article>
  )
}
