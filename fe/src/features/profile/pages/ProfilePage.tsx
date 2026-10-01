import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { ROLE_LABEL } from '@/lib/roles'
import type { ProfileResponse } from '@/lib/types'
import { AvatarSection } from '../components/AvatarSection'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { DeleteAccountDialog } from '../components/DeleteAccountDialog'
import { PersonalDataForm } from '../components/PersonalDataForm'
import { ProfileSection } from '../components/ProfileSection'
import { useProfile } from '../hooks/useProfile'

function ProfileSkeleton() {
  return (
    <div className="grid gap-6" aria-label="Caricamento profilo…">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

function ProfileContent({ profile }: { profile: ProfileResponse }) {
  // Il backend rifiuta l'eliminazione di un SUPERADMIN (non si puo' restare senza): lo si dice prima.
  let danger = <DeleteAccountDialog />
  if (profile.role === 'SUPERADMIN') {
    danger = (
      <p className="text-sm text-muted-foreground">
        Un super amministratore non può eliminare il proprio account: prima un altro super amministratore deve cambiarti il ruolo.
      </p>
    )
  }

  return (
    <div className="grid gap-6">
      <ProfileSection id="avatar" title="Foto del profilo" description="La vedono gli altri partecipanti, i tuoi amici e chi apre i tuoi eventi.">
        <AvatarSection profile={profile} />
      </ProfileSection>
      <ProfileSection id="personal" title="Dati personali" description="Nome e cognome sono visibili agli altri utenti; il resto lo vedi solo tu.">
        <PersonalDataForm profile={profile} />
      </ProfileSection>
      <ProfileSection
        id="password"
        title="Password"
        description="Dopo il cambio resti collegato qui, mentre gli altri dispositivi dovranno accedere di nuovo."
      >
        <ChangePasswordForm email={profile.email} />
      </ProfileSection>
      <ProfileSection
        id="danger"
        title="Elimina account"
        description="I tuoi dati personali vengono cancellati in modo definitivo e non potrai più accedere."
      >
        {danger}
      </ProfileSection>
    </div>
  )
}

/** Area personale (/profile): foto, dati anagrafici, password ed eliminazione dell'account. */
export function ProfilePage() {
  const profile = useProfile()

  let meta = null
  if (profile.data !== undefined) {
    meta = (
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{ROLE_LABEL[profile.data.role]}</Badge>
        <span>
          Iscritto dal <time dateTime={profile.data.createdAt}>{formatDate(profile.data.createdAt)}</time>
        </span>
      </p>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 pb-16">
      <title>Profilo · Tourevents</title>
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Profilo</h1>
        {meta}
      </header>
      <QueryState query={profile} loading={<ProfileSkeleton />}>
        {(data) => <ProfileContent profile={data} />}
      </QueryState>
    </div>
  )
}
