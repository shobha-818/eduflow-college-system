'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { getAllUsers } from '@/lib/userHelpers';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MultiUserSelectProps {
  selectedUsers: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
}

export function MultiUserSelect({
  selectedUsers = [],
  onChange,
  placeholder = 'Select users...',
}: MultiUserSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadUsers() {
      try {
        const data = await getAllUsers();
        setUsers(data as User[]);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const handleUnselect = (id: string) => {
    onChange(selectedUsers.filter((s) => s !== id));
  };

  const handleSelect = (id: string) => {
    if (selectedUsers.includes(id)) {
      handleUnselect(id);
    } else {
      onChange([...selectedUsers, id]);
    }
  };

  const selectedUserObjects = users.filter((u) => selectedUsers.includes(u.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 min-h-[40px] p-1 border rounded-lg bg-input border-border focus-within:border-primary transition-colors">
        {selectedUserObjects.length > 0 ? (
          selectedUserObjects.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="flex items-center gap-1 py-1 px-2"
            >
              {user.name}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUnselect(user.id);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleUnselect(user.id)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground px-3 py-2">
            No users selected
          </span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={loading}
          >
            {loading ? 'Loading users...' : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command className="w-full">
            <CommandInput placeholder="Search users by name or email..." />
            <CommandList>
              <CommandEmpty>No user found.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.email}`}
                    onSelect={() => handleSelect(user.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedUsers.includes(user.id)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.role} • {user.email}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
