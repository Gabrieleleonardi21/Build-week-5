import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  firstName: string
  lastName: string
  avatarUrl: string | null
  className?: string
}

export function UserAvatar({ firstName, lastName, avatarUrl, className }: UserAvatarProps) {
  const name = `${firstName} ${lastName}`
  return (
    <Avatar className={cn('size-8', className)}>
      {avatarUrl !== null && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback role="img" aria-label={name} className="text-xs font-medium">
        {initials(firstName, lastName)}
      </AvatarFallback>
    </Avatar>
  )
}
