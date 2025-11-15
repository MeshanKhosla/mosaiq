import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

interface ShareDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: Id<'analyses'>;
  defaultDashboardName: string;
}

export function ShareDashboardModal({
  open,
  onOpenChange,
  analysisId,
  defaultDashboardName,
}: ShareDashboardModalProps) {
  const navigate = useNavigate();
  const createDashboardWithSharing = useMutation(
    api.dashboards.createWithSharing,
  );
  const getUserByEmail = useMutation(api.users.getByEmail);

  const [dashboardName, setDashboardName] = useState(defaultDashboardName);
  const [permissionType, setPermissionType] = useState<'private' | 'public'>(
    'private',
  );
  const [emailInput, setEmailInput] = useState('');
  const [sharedEmails, setSharedEmails] = useState<Array<string>>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddEmail = async () => {
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail) {
      return;
    }

    if (sharedEmails.includes(trimmedEmail)) {
      toast.error('Email already added');
      setEmailInput('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Invalid email address');
      return;
    }

    try {
      const user = await getUserByEmail({ email: trimmedEmail });
      if (!user) {
        toast.error('User not found');
        return;
      }

      setSharedEmails([...sharedEmails, trimmedEmail]);
      setEmailInput('');
    } catch (error) {
      toast.error('Failed to verify email');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setSharedEmails(sharedEmails.filter((e) => e !== email));
  };

  const handleCreate = async () => {
    if (!dashboardName.trim()) {
      toast.error('Dashboard name is required');
      return;
    }

    setIsCreating(true);
    try {
      const { dashboardId, sheetId } = await createDashboardWithSharing({
        analysisId,
        name: dashboardName.trim(),
        isPublic: permissionType === 'public',
        sharedWithEmails: sharedEmails.length > 0 ? sharedEmails : undefined,
      });

      toast.success('Dashboard created successfully', {
        description: `"${dashboardName}" has been published.`,
      });

      await navigate({
        to: '/dashboard/$id/sheet/$sheetId',
        params: { id: dashboardId, sheetId },
      });

      // Close modal after navigation completes
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      toast.error('Failed to create dashboard', {
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing the modal while creating/redirecting
    if (!newOpen && isCreating) {
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Dashboard</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="dashboard-name">Dashboard Name</Label>
            <Input
              id="dashboard-name"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              placeholder="Enter dashboard name"
            />
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="permission"
                  value="private"
                  checked={permissionType === 'private'}
                  onChange={() => setPermissionType('private')}
                  className="h-4 w-4"
                />
                <span className="text-sm">Private (only you)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="permission"
                  value="public"
                  checked={permissionType === 'public'}
                  onChange={() => setPermissionType('public')}
                  className="h-4 w-4"
                />
                <span className="text-sm">Public (visible to all users)</span>
              </label>
            </div>
          </div>

          {permissionType === 'private' && (
            <div className="space-y-3">
              <Label htmlFor="email-input">Share with specific users</Label>
              <div className="flex gap-2">
                <Input
                  id="email-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter email address"
                />
                <Button
                  type="button"
                  onClick={handleAddEmail}
                  disabled={!emailInput.trim()}
                >
                  Add
                </Button>
              </div>

              {sharedEmails.length > 0 && (
                <div className="space-y-2">
                  <Label>Shared with:</Label>
                  <div className="space-y-1">
                    {sharedEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span>{email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEmail(email)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || !dashboardName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create & Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
