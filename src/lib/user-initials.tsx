export function UserInitials({
  nameOrEmail,
  className = 'font-semibold tracking-wider',
}: {
  nameOrEmail: string;
  className?: string;
}) {
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (
      <span className={className}>
        {parts[0]!.charAt(0).toUpperCase()}
        {parts[parts.length - 1]!.charAt(0).toUpperCase()}
      </span>
    );
  }
  const name = parts[0] ?? '';
  return (
    <span className={className}>
      {name.charAt(0).toUpperCase()}
      {name.length > 1 ? name.charAt(1).toUpperCase() : ''}
    </span>
  );
}
