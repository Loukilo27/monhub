import { AppPlaceholder } from '../../components/AppPlaceholder'

export default function ClockPage() {
  return (
    <AppPlaceholder
      phase={5}
      features={[
        'Horloge analogique et numérique',
        'Fuseaux horaires',
        'Alarmes avec notification push',
        'Chronomètre avec tours',
        'Minuteurs multiples',
      ]}
    />
  )
}
