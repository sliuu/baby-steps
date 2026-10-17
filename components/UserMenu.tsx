"use client";

import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/Menu";
import type { SessionUser } from "@/lib/user";

type Props = {
  user: SessionUser;
};

export function UserMenu(props: Props) {
  const { user } = props;

  return (
    <Menu>
      <MenuTrigger
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        aria-label={`Account menu for ${user.name}`}
      >
        <Avatar className="size-8">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-raised text-label text-ink">
            {user.initial}
          </AvatarFallback>
        </Avatar>
      </MenuTrigger>

      <MenuContent align="end">
        <MenuLabel className="truncate">{user.email ?? user.name}</MenuLabel>
        <MenuSeparator />
        {/* Placeholder until a settings page exists. */}
        <MenuItem disabled>settings</MenuItem>
        {/* POST, so an embedded GET can't sign you out. */}
        <form action={signOut}>
          <MenuItem asChild>
            <button type="submit" className="w-full">
              sign out
            </button>
          </MenuItem>
        </form>
      </MenuContent>
    </Menu>
  );
}
