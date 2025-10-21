import { Card } from '@/components/ui/card';
import { FEATURE_PHASES } from '@/config/features';

interface ComingSoonProps {
  feature: keyof typeof FEATURE_PHASES;
  description?: string;
  features?: string[];
}

export function ComingSoon({ feature, description, features }: ComingSoonProps) {
  const info = FEATURE_PHASES[feature];

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md p-8 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold mb-2">{info.title}</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Coming in Phase {info.phase} (Months {info.months})
        </p>
        {description && (
          <p className="text-sm text-foreground mb-4">{description}</p>
        )}
        {features && features.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium mb-2">Planned Features:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {features.map((feat, idx) => (
                <li key={idx}>✓ {feat}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
