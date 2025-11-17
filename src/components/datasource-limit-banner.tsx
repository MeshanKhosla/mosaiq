import { useQuery } from 'convex/react';
import { CheckoutDialog, useCustomer } from 'autumn-js/react';
import { api } from '../../convex/_generated/api';
import { Button } from '~/components/ui/button';
import { authClient } from '~/lib/auth-client';

export function DatasourceLimitBanner() {
  const { data: session } = authClient.useSession();
  const limitInfo = useQuery(
    api.datasources.checkDatasourceLimit,
    session ? {} : 'skip',
  );
  const { checkout } = useCustomer();

  if (!session || !limitInfo) {
    return null;
  }

  const { count, limit, allowed } = limitInfo;
  const usagePercent = (count / limit) * 100;
  const isNearLimit = usagePercent >= 80;

  if (!isNearLimit && allowed) {
    return null;
  }

  return (
    <div className="rounded-md border p-4 bg-muted/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <p className="text-sm font-medium">
            Datasources: {count} / {limit}
          </p>
          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                allowed ? 'bg-primary' : 'bg-destructive'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
      {!allowed && (
        <Button
          onClick={() => {
            checkout({
              productId: 'pro',
              dialog: CheckoutDialog,
            });
          }}
          className="w-full mt-2"
          variant="default"
        >
          Upgrade to Pro (Free!) to unlock more
        </Button>
      )}
      {isNearLimit && allowed && (
        <p className="text-xs text-muted-foreground mt-2">
          You're approaching your limit. Consider upgrading for more capacity.
        </p>
      )}
    </div>
  );
}
