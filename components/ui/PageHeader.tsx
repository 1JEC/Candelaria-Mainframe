export const PageHeader = ({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) => (
  <header>
    <p className="label">{title}</p>
    <h1 className="display mt-2 text-h1 text-foreground">{subtitle}</h1>
  </header>
)
