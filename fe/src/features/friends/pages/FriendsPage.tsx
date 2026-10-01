import { useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FriendsList } from '../components/FriendsList'
import { ReceivedRequests, SentRequests } from '../components/FriendRequests'
import { UserSearch } from '../components/UserSearch'
import { useReceivedRequests } from '../hooks/useFriends'

const TABS = ['amici', 'ricevute', 'inviate', 'cerca'] as const
type FriendsTab = (typeof TABS)[number]

/** Scheda dall'URL (?tab=); un valore sconosciuto vale come la prima. */
function readTab(raw: string | null): FriendsTab {
  for (const tab of TABS) {
    if (tab === raw) {
      return tab
    }
  }
  return 'amici'
}

function pendingLabel(count: number): string {
  if (count === 1) {
    return '1 richiesta in attesa'
  }
  return `${count} richieste in attesa`
}

/**
 * Amici, richieste e ricerca utenti (/friends). La scheda attiva e la ricerca stanno nell'URL:
 * la notifica "nuova richiesta" puo' portare dritta a ?tab=ricevute, e Indietro funziona.
 */
export function FriendsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = readTab(searchParams.get('tab'))
  const q = searchParams.get('q') ?? ''
  // Stessa query (e stessa cache) della scheda "Ricevute": qui serve solo il numero per il badge.
  const received = useReceivedRequests(0)
  const pending = received.data?.page.totalElements ?? 0

  function selectTab(next: string) {
    const params = new URLSearchParams()
    if (next !== 'amici') {
      params.set('tab', next)
    }
    // La ricerca resta nell'URL solo nella sua scheda.
    if (next === 'cerca' && q !== '') {
      params.set('q', q)
    }
    setSearchParams(params)
  }

  function search(value: string) {
    setSearchParams(new URLSearchParams({ tab: 'cerca', q: value }))
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 pb-16">
      <title>Amici · Eventi</title>
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Amici</h1>
        <p className="text-sm text-muted-foreground">Le persone conosciute agli eventi, con cui puoi chattare.</p>
      </header>
      <Tabs value={tab} onValueChange={selectTab} className="gap-6">
        {/* Su schermi stretti le schede scorrono in orizzontale invece di andare a capo. */}
        <div className="overflow-x-auto">
          <TabsList className="group-data-horizontal/tabs:h-10">
            <TabsTrigger value="amici" className="px-3">
              Amici
            </TabsTrigger>
            <TabsTrigger value="ricevute" className="px-3">
              Ricevute
              {pending > 0 && (
                <Badge className="tabular-nums" aria-label={pendingLabel(pending)}>
                  {pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inviate" className="px-3">
              Inviate
            </TabsTrigger>
            <TabsTrigger value="cerca" className="px-3">
              Cerca
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="amici">
          <FriendsList />
        </TabsContent>
        <TabsContent value="ricevute">
          <ReceivedRequests />
        </TabsContent>
        <TabsContent value="inviate">
          <SentRequests />
        </TabsContent>
        <TabsContent value="cerca">
          <UserSearch q={q} onSearch={search} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
